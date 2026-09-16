import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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


Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { city, country } = await req.json();
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


    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

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

  } catch (error) {
    console.error("Geocode error:", error);
    // Toujours 200 + fallback, le front gère l'absence de coords.
    return new Response(
      JSON.stringify({ error: "GEOCODING_FAILED", fallback: true, lat: null, lng: null }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
