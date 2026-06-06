/**
 * geocode-profile
 *
 * Appelée par un trigger Postgres (pg_net) à chaque modification de
 * `profiles.city` / `profiles.postal_code` / `profiles.country` afin de
 * renseigner `latitude` / `longitude`.
 *
 * Stratégie :
 *   - Si pays = FR (ou non renseigné) → api-adresse.data.gouv.fr (BAN, précis FR)
 *   - Sinon → fallback Nominatim (OpenStreetMap) avec `country=<pays>` pour
 *     géocoder les profils internationaux (ex : Marrakech / Maroc).
 *
 * Sécurité :
 *   - Pas de JWT (verify_jwt = false) car appelée depuis pg_net.
 *   - Vérifie un secret partagé GEOCODE_PROFILE_SECRET dans l'en-tête
 *     `x-geocode-secret` pour empêcher tout appel externe non autorisé.
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
  const r = await fetch(`https://nominatim.openstreetmap.org/search?${params}`, {
    headers: { "User-Agent": "Guardiens/1.0 (geocode-profile contact@guardiens.fr)" },
  });
  if (!r.ok) return null;
  const arr = await r.json();
  const first = Array.isArray(arr) ? arr[0] : null;
  if (!first) return null;
  return { lat: parseFloat(first.lat), lng: parseFloat(first.lon) };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const secret = Deno.env.get("GEOCODE_PROFILE_SECRET");
    if (secret && req.headers.get("x-geocode-secret") !== secret) {
      return json({ error: "forbidden" }, 403);
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
    if (isFR) {
      coords = await geocodeFR(city, postal);
      // Fallback Nominatim si BAN ne trouve rien
      if (!coords) coords = await geocodeNominatim(city, "France");
    } else {
      coords = await geocodeNominatim(city, country);
    }

    if (!coords) return json({ skipped: "no result", city, country, postal });

    const { error: uErr } = await supabase
      .from("profiles")
      .update({ latitude: coords.lat, longitude: coords.lng })
      .eq("id", user_id);

    if (uErr) return json({ error: uErr.message }, 500);

    return json({ ok: true, lat: coords.lat, lng: coords.lng, source: isFR ? "ban" : "nominatim" });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
