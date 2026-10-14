import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { cityQueryVariants, countryQueryVariants } from "../_shared/geocode-variants.ts";


const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function normalize(city: string): string {
  return city
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9 -]/g, "")
    .replace(/\s+/g, " ");
}

const COUNTRY_BY_ALIAS: Record<string, { label: string; code?: string }> = {
  fr: { label: "France", code: "fr" },
  france: { label: "France", code: "fr" },
  ma: { label: "Morocco", code: "ma" },
  maroc: { label: "Morocco", code: "ma" },
  morocco: { label: "Morocco", code: "ma" },
  be: { label: "Belgium", code: "be" },
  belgique: { label: "Belgium", code: "be" },
  belgium: { label: "Belgium", code: "be" },
  ch: { label: "Switzerland", code: "ch" },
  suisse: { label: "Switzerland", code: "ch" },
  switzerland: { label: "Switzerland", code: "ch" },
  es: { label: "Spain", code: "es" },
  espagne: { label: "Spain", code: "es" },
  spain: { label: "Spain", code: "es" },
  it: { label: "Italy", code: "it" },
  italie: { label: "Italy", code: "it" },
  italy: { label: "Italy", code: "it" },
  pt: { label: "Portugal", code: "pt" },
  portugal: { label: "Portugal", code: "pt" },
  de: { label: "Germany", code: "de" },
  allemagne: { label: "Germany", code: "de" },
  germany: { label: "Germany", code: "de" },
  gb: { label: "United Kingdom", code: "gb" },
  uk: { label: "United Kingdom", code: "gb" },
  royaumeuni: { label: "United Kingdom", code: "gb" },
  "royaume uni": { label: "United Kingdom", code: "gb" },
  unitedkingdom: { label: "United Kingdom", code: "gb" },
  "united kingdom": { label: "United Kingdom", code: "gb" },
};

function normalizeCountry(country?: string | null) {
  const raw = (country || "FR").trim();
  const key = normalize(raw);
  return COUNTRY_BY_ALIAS[key] ?? { label: raw || "France", code: /^[a-z]{2}$/i.test(raw) ? raw.toLowerCase() : undefined };
}

/**
 * Nettoie un nom de ville avant géocodage : retire les parenthèses et leur
 * contenu, un code postal FR isolé (préfixe ou suffixe), et normalise les
 * espaces. « CONQUEREUIL (44290) » devient « CONQUEREUIL ».
 */
function cleanCityName(raw: string): string {
  return raw
    .replace(/\([^)]*\)/g, " ")
    .replace(/[()]/g, " ")
    .replace(/(^|[\s,;-])\d{5}(?=$|[\s,;-])/g, "$1 ")
    .replace(/\s+/g, " ")
    .replace(/^[\s,;-]+|[\s,;-]+$/g, "")
    .trim();
}


/** Clé de cache d'une commune, calculée comme dans geocodePlace (lot H3). */
function placeCacheKey(city: unknown, country: unknown): string | null {
  if (!city || typeof city !== "string" || city.trim().length < 2) return null;
  const parts = city.split(",").map((part) => part.trim()).filter(Boolean);
  const inferredCountry = typeof country === "string" && country.trim()
    ? country.trim()
    : parts.length > 1 ? parts[parts.length - 1] : "FR";
  const rawCityName = parts.length > 1 ? parts.slice(0, -1).join(", ") : city.trim();
  const resolvedCountry = normalizeCountry(inferredCountry);
  const isFrPostal = /^\d{5}$/.test(rawCityName.trim()) &&
    (resolvedCountry.code === "fr" || normalize(resolvedCountry.label) === "france");
  const cityName = isFrPostal ? rawCityName.trim() : cleanCityName(rawCityName);
  if (!isFrPostal && !cityName) return null;
  return isFrPostal ? `cp:${cityName}|fr` : `city:${normalize(cityName)}|${normalize(resolvedCountry.label)}`;
}

/** Une commune : cache, puis variantes, puis Nominatim. Réponse inchangée. */
// deno-lint-ignore no-explicit-any
async function geocodePlace(supabase: any, city: any, country: any): Promise<Response> {
  if (!city || typeof city !== "string" || city.trim().length < 2) {
    return new Response(JSON.stringify({ error: "Invalid city" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const parts = city.split(",").map((part) => part.trim()).filter(Boolean);
  const inferredCountry = typeof country === "string" && country.trim()
    ? country.trim()
    : parts.length > 1
      ? parts[parts.length - 1]
      : "FR";
  const rawCityName = parts.length > 1 ? parts.slice(0, -1).join(", ") : city.trim();
  const resolvedCountry = normalizeCountry(inferredCountry);

  // Détecte un code postal français (5 chiffres) pour interroger Nominatim
  // par `postalcode=` au lieu de `city=` (sinon "69003" tombe parfois sur des
  // localités homonymes ou rien). La clé de cache est préfixée pour éviter
  // toute collision avec une éventuelle ville nommée identiquement.
  const isFrPostal =
    /^\d{5}$/.test(rawCityName.trim()) &&
    (resolvedCountry.code === "fr" || normalize(resolvedCountry.label) === "france");

  // Nettoyage avant requête ET avant clé de cache, pour rester cohérents.
  const cityName = isFrPostal ? rawCityName.trim() : cleanCityName(rawCityName);
  if (!isFrPostal && !cityName) {
    return new Response(JSON.stringify({ error: "City not found", lat: null, lng: null }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const normalized = isFrPostal
    ? `cp:${cityName}|fr`
    : `city:${normalize(cityName)}|${normalize(resolvedCountry.label)}`;



  // Check cache first
  const { data: cached } = await supabase
    .from("geocode_cache")
    .select("lat, lng, city_name")
    .eq("normalized_name", normalized)
    .maybeSingle();

  if (cached) {
    return new Response(JSON.stringify({ lat: cached.lat, lng: cached.lng, city: cached.city_name }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Recherche tolérante : la ville exacte d'abord, puis les variantes
  // obtenues en retirant les mots de tête ("Hauteur de Taravao" puis
  // "Taravao"), et pour l'outre-mer le rattachement à la France.
  const cityCandidates = isFrPostal ? [cityName.trim()] : cityQueryVariants(cityName);
  const countryCandidates = isFrPostal
    ? [inferredCountry]
    : countryQueryVariants(inferredCountry);

  type Attempt = { city: string; country: ReturnType<typeof normalizeCountry> };
  const attempts: Attempt[] = [];
  for (const c of cityCandidates) {
    for (const co of countryCandidates) {
      const resolved = co ? normalizeCountry(co) : resolvedCountry;
      if (attempts.some((a) => a.city === c && a.country.label === resolved.label)) continue;
      attempts.push({ city: c, country: resolved });
    }
  }

  const keyFor = (attempt: Attempt) =>
    isFrPostal ? `cp:${attempt.city}|fr` : `city:${normalize(attempt.city)}|${normalize(attempt.country.label)}`;

  const cacheAndRespond = async (lat: number, lng: number, attempt: Attempt) => {
    // Mise en cache sous la clé d'origine, pour ne pas refaire le détour.
    await supabase.from("geocode_cache").upsert(
      { city_name: `${cityName.trim()}, ${resolvedCountry.label}`, normalized_name: normalized, lat, lng },
      { onConflict: "normalized_name" },
    );
    return new Response(
      JSON.stringify({ lat, lng, city: attempt.city, country: attempt.country.label }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  };

  // 1) Le cache porte peut-être déjà une des variantes.
  const altKeys = attempts.map(keyFor).filter((k) => k !== normalized);
  if (altKeys.length > 0) {
    const { data: altRows } = await supabase
      .from("geocode_cache")
      .select("normalized_name, lat, lng")
      .in("normalized_name", altKeys);
    if (altRows && altRows.length > 0) {
      for (const attempt of attempts) {
        const row = altRows.find((r: any) => r.normalized_name === keyFor(attempt));
        if (row && row.lat != null && row.lng != null) {
          return await cacheAndRespond(Number(row.lat), Number(row.lng), attempt);
        }
      }
    }
  }

  // 2) Nominatim, variante par variante, au plus quatre requêtes.
  let unavailable = false;
  for (const attempt of attempts.slice(0, 4)) {
    const params = new URLSearchParams({
      format: "json",
      limit: "1",
      country: isFrPostal ? "France" : attempt.country.label,
    });
    if (isFrPostal) {
      params.set("postalcode", attempt.city);
      params.set("countrycodes", "fr");
    } else {
      params.set("city", attempt.city);
      if (attempt.country.code) params.set("countrycodes", attempt.country.code);
    }
    const url = `https://nominatim.openstreetmap.org/search?${params}`;
    // Timeout explicite : sans borne, un pic de requêtes simultanées sur
    // Nominatim (rate limité) fait traîner les workers jusqu'à saturation et
    // la plateforme répond alors 502 avant que le handler ne rende sa réponse.
    const res = await fetch(url, {
      headers: { "User-Agent": "Guardiens-App/1.0" },
      signal: AbortSignal.timeout(6000),
    });

    if (!res.ok) {
      console.warn(`Nominatim returned ${res.status} for "${attempt.city}, ${attempt.country.label}"`);
      unavailable = true;
      break;
    }

    const results = await res.json();
    if (results && results.length > 0) {
      return await cacheAndRespond(parseFloat(results[0].lat), parseFloat(results[0].lon), attempt);
    }
  }

  if (unavailable) {
    // Rate limit ou indisponibilité, on dégrade proprement, pas de 500.
    return new Response(
      JSON.stringify({ error: "GEOCODING_UNAVAILABLE", fallback: true, lat: null, lng: null }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  return new Response(JSON.stringify({ error: "City not found", lat: null, lng: null }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

/** Lot H3 : au plus 40 communes par appel, 8 recherches hors cache. */
const BATCH_MAX = 40;
const BATCH_MISS_MAX = 8;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    // Lot H3 : plusieurs communes en un appel. Le cache est lu en une requête,
    // les communes absentes du cache sont cherchées une à une (8 au plus), les
    // suivantes sont rendues « fallback » et le site les redemande seules.
    if (Array.isArray(body?.places)) {
      const places = body.places.slice(0, BATCH_MAX);
      const keys = places.map((p: { city?: unknown; country?: unknown }) => placeCacheKey(p?.city, p?.country));
      const wanted = [...new Set(keys.filter(Boolean))] as string[];
      const cachedByKey = new Map<string, { lat: number; lng: number; city_name: string }>();
      if (wanted.length > 0) {
        const { data: rows } = await supabase
          .from("geocode_cache")
          .select("normalized_name, lat, lng, city_name")
          .in("normalized_name", wanted);
        // deno-lint-ignore no-explicit-any
        (rows ?? []).forEach((r: any) => { if (r.lat != null && r.lng != null) cachedByKey.set(r.normalized_name, r); });
      }
      let misses = 0;
      const results: unknown[] = [];
      for (let i = 0; i < places.length; i++) {
        const key = keys[i];
        const hit = key ? cachedByKey.get(key) : undefined;
        if (hit) { results.push({ lat: Number(hit.lat), lng: Number(hit.lng), city: hit.city_name }); continue; }
        if (!key) { results.push({ error: "City not found", lat: null, lng: null }); continue; }
        if (misses >= BATCH_MISS_MAX) { results.push({ error: "DEFERRED", fallback: true, lat: null, lng: null }); continue; }
        misses++;
        try {
          results.push(await (await geocodePlace(supabase, places[i]?.city, places[i]?.country)).json());
        } catch {
          results.push({ error: "GEOCODING_FAILED", fallback: true, lat: null, lng: null });
        }
      }
      return new Response(JSON.stringify({ results }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return await geocodePlace(supabase, body?.city, body?.country);
  } catch (error) {
    console.error("Geocode error:", error);
    // Toujours 200 + fallback, le front gère l'absence de coords.
    return new Response(
      JSON.stringify({ error: "GEOCODING_FAILED", fallback: true, lat: null, lng: null }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
