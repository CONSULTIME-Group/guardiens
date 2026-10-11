/**
 * geocode-profile
 *
 * Appelée par un trigger Postgres (pg_net) à chaque modification de
 * `profiles.city` / `profiles.postal_code` / `profiles.country` afin de
 * renseigner `latitude` / `longitude`.
 *
 * Stratégie :
 *   - Si pays = FR (ou non renseigné) → api-adresse.data.gouv.fr (BAN, précis FR)
 *   - Sinon → Nominatim (OpenStreetMap) avec `country=<pays>` pour
 *     géocoder les profils internationaux (ex : Marrakech / Maroc).
 *   - Photon en secours, uniquement avec ville et pays concordants.
 *
 * Sécurité :
 *   - Pas de JWT (verify_jwt = false) car appelée depuis pg_net.
 *   - Vérifie un secret partagé GEOCODE_PROFILE_SECRET dans l'en-tête
 *     `x-geocode-secret` pour empêcher tout appel externe non autorisé.
 *   - Une relance manuelle accepte aussi un JWT vérifié avec rôle admin.
 *   - Utilise la service_role pour lire/écrire le profil (bypass RLS).
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-geocode-secret",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

async function geocodeFR(city: string, postal: string): Promise<{ lat: number; lng: number } | null> {
  const params = new URLSearchParams({ q: city, limit: "1" });
  if (postal) params.set("postcode", postal);
  const r = await fetch(`https://api-adresse.data.gouv.fr/search/?${params}`, {
    headers: { "User-Agent": "Guardiens/1.0 (geocode-profile)" },
  });
  if (!r.ok) return null;
  const data = await r.json();
  const feat = data?.features?.[0];
  if (!feat) return null;
  const [lng, lat] = feat.geometry.coordinates;
  return { lat, lng };
}

// Mapping ISO 3166-1 alpha-2 → nom de pays accepté par Nominatim (anglais
// privilégié pour robustesse internationale). Étendre si besoin.
const COUNTRY_NAME_BY_CODE: Record<string, string> = {
  FR: "France", BE: "Belgium", CH: "Switzerland", LU: "Luxembourg", MC: "Monaco",
  AD: "Andorra", DE: "Germany", ES: "Spain", IT: "Italy", PT: "Portugal",
  NL: "Netherlands", GB: "United Kingdom", IE: "Ireland", AT: "Austria",
  DK: "Denmark", SE: "Sweden", NO: "Norway", FI: "Finland", PL: "Poland",
  CZ: "Czechia", GR: "Greece", CA: "Canada", US: "United States", MX: "Mexico",
  BR: "Brazil", AR: "Argentina", MA: "Morocco", TN: "Tunisia", DZ: "Algeria",
  SN: "Senegal", CI: "Côte d'Ivoire", AU: "Australia", NZ: "New Zealand",
  JP: "Japan", TH: "Thailand", VN: "Vietnam", AE: "United Arab Emirates",
};

async function geocodeNominatim(city: string, country: string): Promise<{ lat: number; lng: number } | null> {
  // Si on reçoit un code ISO 2 lettres, on le résout vers son nom anglais.
  const countryQuery = country.length === 2 ? (COUNTRY_NAME_BY_CODE[country.toUpperCase()] ?? country) : country;
  const params = new URLSearchParams({
    city,
    country: countryQuery,
    format: "json",
    limit: "1",
  });
  try {
    const r = await fetch(`https://nominatim.openstreetmap.org/search?${params}`, {
      headers: { "User-Agent": "Guardiens/1.0 (geocode-profile contact@guardiens.fr)" },
      signal: AbortSignal.timeout(6000),
    });
    if (!r.ok) {
      console.warn("geocode-profile: Nominatim HTTP", r.status);
      return null;
    }
    const arr = await r.json();
    const first = Array.isArray(arr) ? arr[0] : null;
    if (!first) return null;
    const coords = { lat: parseFloat(first.lat), lng: parseFloat(first.lon) };
    return validCoords(coords) ? coords : null;
  } catch {
    console.warn("geocode-profile: Nominatim indisponible");
    return null;
  }
}

function validCoords(coords: { lat: number; lng: number }): boolean {
  return Number.isFinite(coords.lat) && Number.isFinite(coords.lng)
    && Math.abs(coords.lat) <= 90 && Math.abs(coords.lng) <= 180;
}

const normalizePlace = (value: string) => value.normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();

async function geocodePhoton(city: string, country: string, postal: string): Promise<{ lat: number; lng: number } | null> {
  const code = country.length === 2 ? country.toUpperCase()
    : Object.entries(COUNTRY_NAME_BY_CODE).find(([, name]) => normalizePlace(name) === normalizePlace(country))?.[0];
  if (!code) return null;
  const params = new URLSearchParams({ q: city, limit: "10", lang: "en" });
  params.append("layer", "city");
  params.append("layer", "locality");
  try {
    const r = await fetch(`https://photon.komoot.io/api/?${params}`, { signal: AbortSignal.timeout(6000) });
    if (!r.ok) {
      console.warn("geocode-profile: Photon HTTP", r.status);
      return null;
    }
    const data = await r.json();
    const matches = (Array.isArray(data?.features) ? data.features : []).filter((f: any) => {
      const p = f.properties;
      const c = f.geometry?.coordinates;
      return p?.countrycode?.toUpperCase() === code && typeof p?.name === "string"
        && normalizePlace(p.name) === normalizePlace(city)
        && Array.isArray(c) && typeof c[0] === "number" && typeof c[1] === "number"
        && validCoords({ lat: c[1], lng: c[0] });
    });
    const postalKey = postal.replace(/\s/g, "").toUpperCase();
    const byPostal = postalKey ? matches.filter((f: any) => typeof f.properties.postcode === "string"
      && f.properties.postcode.replace(/\s/g, "").toUpperCase() === postalKey) : [];
    // Un homonyme sans code postal concordant reste introuvable.
    const candidates = byPostal.length ? byPostal : matches;
    if (candidates.length !== 1) return null;
    const foundPostal = candidates[0].properties.postcode;
    if (postalKey && typeof foundPostal === "string" && foundPostal.trim()
      && foundPostal.replace(/\s/g, "").toUpperCase() !== postalKey) return null;
    const [lng, lat] = candidates[0].geometry.coordinates;
    return { lat, lng };
  } catch {
    console.warn("geocode-profile: Photon indisponible");
    return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const secret = Deno.env.get("GEOCODE_PROFILE_SECRET");
    const trustedTrigger = !!secret && req.headers.get("x-geocode-secret") === secret;
    if (!trustedTrigger) {
      const authHeader = req.headers.get("Authorization");
      if (!authHeader) return json({ error: "Non autorisé" }, 401);
      const callerClient = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_ANON_KEY")!,
        { global: { headers: { Authorization: authHeader } } },
      );
      const { data: { user }, error: authError } = await callerClient.auth.getUser();
      if (authError || !user) return json({ error: "Non autorisé" }, 401);
      const { data: isAdmin, error: roleError } = await callerClient.rpc("has_role", {
        _user_id: user.id, _role: "admin",
      });
      if (roleError || isAdmin !== true) return json({ error: "Accès refusé" }, 403);
    }

    const { user_id } = await req.json();
    if (!user_id || typeof user_id !== "string") return json({ error: "missing user_id" }, 400);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: profile, error: pErr } = await supabase
      .from("profiles")
      .select("city, postal_code, country")
      .eq("id", user_id)
      .maybeSingle();

    if (pErr || !profile) return json({ error: "profile not found" }, 404);

    const city = (profile.city ?? "").trim();
    const postal = (profile.postal_code ?? "").trim();
    const country = (profile.country ?? "FR").trim() || "FR";
    if (!city) return json({ skipped: "no city" });

    const isFR = country === "FR" || country.toLowerCase() === "france";

    let coords: { lat: number; lng: number } | null = null;
    let source = "nominatim";
    if (isFR) {
      coords = await geocodeFR(city, postal);
      source = "ban";
      // Fallback Nominatim si BAN ne trouve rien
      if (!coords) {
        coords = await geocodeNominatim(city, "France");
        source = "nominatim";
      }
    } else {
      coords = await geocodeNominatim(city, country);
    }
    if (!coords) {
      coords = await geocodePhoton(city, country, postal);
      source = "photon";
    }

    if (!coords) return json({ skipped: "no result", city, country, postal });

    const { error: uErr } = await supabase
      .from("profiles")
      .update({ latitude: coords.lat, longitude: coords.lng })
      .eq("id", user_id);

    if (uErr) return json({ error: uErr.message }, 500);

    return json({ ok: true, lat: coords.lat, lng: coords.lng, source });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
