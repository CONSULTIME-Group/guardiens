/**
 * geocode-profile
 *
 * Appelée par un trigger Postgres (pg_net) à chaque modification de
 * `profiles.city` / `profiles.postal_code` / `profiles.country` afin de
 * renseigner `latitude` / `longitude`.
 *
 * Stratégie :
 *   - Lot G1 : ville vide et code postal français valide → centre de la
 *     commune la plus peuplée du code postal (geo.api.gouv.fr) ; corps
 *     { mode: "backfill" } → rattrapage quotidien (tâche planifiée).
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
import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { communeNamesForPostal, frenchCommuneNameExists, geocodeOfficialFr, pointIsInFrance } from "../_shared/geocode-official-fr.ts";
import {
  BACKFILL_LIMIT,
  backfillWindow,
  cityMatchesCommunes,
  foreignPointDecision,
  isBackfillCandidate,
  isFrenchScopeCountry,
  isNearMetropolitanFrance,
  planProfileGeocode,
  type PlaceStatus,
  type ProfilePlace,
} from "../_shared/profile-geocode-rules.ts";
import { startCronRun } from "../_shared/cron-run-log.ts";

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

/**
 * Lot G2 : pays du premier lieu habité (ville ou localité) de ce nom chez
 * Photon, quand son nom est exactement celui saisi. null si rien de sûr.
 */
async function photonTopPlaceCountry(city: string): Promise<string | null> {
  const params = new URLSearchParams({ q: city, limit: "1", lang: "fr" });
  params.append("layer", "city");
  params.append("layer", "locality");
  try {
    const r = await fetch(`https://photon.komoot.io/api/?${params}`, { signal: AbortSignal.timeout(6000) });
    if (!r.ok) return null;
    const data = await r.json();
    const f = Array.isArray(data?.features) ? data.features[0] : null;
    const name = f?.properties?.name;
    const code = f?.properties?.countrycode;
    if (typeof name !== "string" || typeof code !== "string") return null;
    if (normalizePlace(name) !== normalizePlace(city.split(/[,(]/)[0])) return null;
    return code.toUpperCase();
  } catch {
    return null;
  }
}

// Client service_role : schéma « public » typé librement pour que
// .from("profiles") ne retombe pas sur never (check Deno, lot G1).
type Supa = SupabaseClient<any, "public", "public", any, any>;

async function writePlace(
  supabase: Supa,
  user_id: string,
  coords: { lat: number; lng: number } | null,
  status: PlaceStatus | null,
): Promise<string | null> {
  const { error } = await supabase
    .from("profiles")
    .update({
      latitude: coords ? coords.lat : null,
      longitude: coords ? coords.lng : null,
      place_status: status,
      place_status_at: status ? new Date().toISOString() : null,
    })
    .eq("id", user_id);
  return error ? error.message : null;
}

/**
 * Situe un profil et écrit latitude, longitude. Lot G1 : un profil sans ville
 * mais avec un code postal français valide est situé au centre de la commune
 * la plus peuplée du code postal (base officielle des communes).
 * Lot G2 : un profil au pays étranger n'a jamais de point en métropole
 * (country_mismatch) ; un profil au pays France dont la ville n'est pas une
 * commune de son code postal et désigne un lieu étranger (Photon) n'a pas de
 * point (foreign_city). Les deux cas posent place_status, lu par le bandeau du
 * profil, et retirent le membre des listes « près de chez vous ».
 */
async function geocodeProfile(supabase: Supa, user_id: string): Promise<Record<string, unknown>> {
  const { data: profile, error: pErr } = await supabase
    .from("profiles")
    .select("city, postal_code, country, latitude, longitude")
    .eq("id", user_id)
    .maybeSingle();
  if (pErr || !profile) return { error: "profile not found", status: 404 };

  const plan = planProfileGeocode(profile as ProfilePlace);
  if (plan.kind === "none") {
    // Pays étranger sans ville, avec un ancien point en métropole : retiré.
    const inFrance = !isFrenchScopeCountry(profile.country)
        && isNearMetropolitanFrance(Number(profile.latitude), Number(profile.longitude))
      ? await pointIsInFrance(Number(profile.latitude), Number(profile.longitude))
      : null;
    if (foreignPointDecision(profile.country, inFrance) === "reject") {
      const err = await writePlace(supabase, user_id, null, "country_mismatch");
      if (err) return { error: err, status: 500 };
      return { skipped: "country_mismatch" };
    }
    return { skipped: plan.reason === "no_place" ? "no city" : "no city, outside France" };
  }

  let coords: { lat: number; lng: number } | null = null;
  let source = "nominatim";
  if (plan.kind === "postal") {
    const official = await geocodeOfficialFr(plan.postal, true);
    coords = official ? { lat: official.lat, lng: official.lng } : null;
    source = "communes_code_postal";
    if (!coords) return { skipped: "no result", postal: plan.postal };
  } else {
    const { city, postal, country, isFR } = plan;
    if (isFR && /^\d{5}$/.test(postal) && !/^9[78]/.test(postal)) {
      // Lot G2 : ville hors des communes du code postal et lieu étranger connu.
      const communes = await communeNamesForPostal(postal);
      if (communes && communes.length > 0 && !cityMatchesCommunes(city, communes)) {
        const topCountry = await photonTopPlaceCountry(city);
        // Correctif du 26/10 : Photon place d'abord un homonyme étranger
        // (Évian, Faverges) ; aucune commune française de ce nom n'est exigée.
        const frenchName = topCountry && !isFrenchScopeCountry(topCountry)
          ? await frenchCommuneNameExists(city)
          : null;
        if (topCountry && !isFrenchScopeCountry(topCountry) && frenchName === false) {
          const err = await writePlace(supabase, user_id, null, "foreign_city");
          if (err) return { error: err, status: 500 };
          return { skipped: "foreign_city", city, found_country: topCountry };
        }
      }
    }
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
    // Lot G2 : pays étranger, point trouvé ou ancien point en métropole : retiré.
    const candidate = coords ?? (profile.latitude != null && profile.longitude != null
      ? { lat: Number(profile.latitude), lng: Number(profile.longitude) } : null);
    const candidateInFrance = candidate && !isFrenchScopeCountry(country)
        && isNearMetropolitanFrance(candidate.lat, candidate.lng)
      ? await pointIsInFrance(candidate.lat, candidate.lng)
      : null;
    if (candidate && foreignPointDecision(country, candidateInFrance) === "reject") {
      const err = await writePlace(supabase, user_id, null, "country_mismatch");
      if (err) return { error: err, status: 500 };
      return { skipped: "country_mismatch", city, country };
    }
    if (!coords) return { skipped: "no result", city, country, postal };
  }

  const err = await writePlace(supabase, user_id, coords, null);
  if (err) return { error: err, status: 500 };
  return { ok: true, lat: coords.lat, lng: coords.lng, source };
}

/**
 * Lot G1 : rattrapage quotidien des profils restés sans position, modifiés
 * depuis plus d'une heure et moins de 7 jours, BACKFILL_LIMIT au plus, un à
 * un (les services de géocodage limitent le débit).
 */
async function backfillProfiles(supabase: Supa): Promise<Record<string, unknown>> {
  const { updatedAfter, updatedBefore } = backfillWindow(new Date());
  const { data, error } = await supabase
    .from("profiles")
    .select("id, city, postal_code, country, latitude, longitude")
    .is("latitude", null)
    .is("place_status", null)
    .gte("updated_at", updatedAfter)
    .lte("updated_at", updatedBefore)
    .order("updated_at", { ascending: false })
    .limit(BACKFILL_LIMIT * 3);
  if (error) return { error: error.message, status: 500 };
  const candidates = (data ?? []).filter((p: any) => isBackfillCandidate(p)).slice(0, BACKFILL_LIMIT);
  let situes = 0;
  let introuvables = 0;
  let erreurs = 0;
  for (const p of candidates as { id: string }[]) {
    try {
      const r = await geocodeProfile(supabase, p.id);
      if (r.ok) situes++;
      else if (r.error) erreurs++;
      else introuvables++;
    } catch {
      erreurs++;
    }
  }
  return { traites: candidates.length, situes, introuvables, erreurs };
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

    const body = await req.json().catch(() => ({}));
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Lot G1 : rattrapage quotidien, appelé par la tâche planifiée
    // geocode-profiles-backfill avec le secret partagé, journalisé.
    if (body?.mode === "backfill") {
      const run = await startCronRun("geocode-profile-backfill");
      try {
        const result = await backfillProfiles(supabase);
        if (result.error) {
          await run.fail(String(result.error));
          return json({ error: result.error }, 500);
        }
        await run.finish(Number(result.erreurs) > 0 ? "partial" : "success", result);
        return json(result);
      } catch (e) {
        await run.fail(e);
        throw e;
      }
    }

    const { user_id } = body ?? {};
    if (!user_id || typeof user_id !== "string") return json({ error: "missing user_id" }, 400);

    const result = await geocodeProfile(supabase, user_id);
    const { status, ...rest } = result as Record<string, unknown> & { status?: number };
    return json(rest, typeof status === "number" ? status : 200);
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
