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
    const cityName = parts.length > 1 ? parts.slice(0, -1).join(", ") : city.trim();
    const resolvedCountry = normalizeCountry(inferredCountry);
    const normalized = `${normalize(cityName)}|${normalize(resolvedCountry.label)}`;

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

    // Call Nominatim (OpenStreetMap) — free, no API key needed.
    // France reste bornée à FR, mais les annonces internationales doivent sortir
    // du filtre FR, sinon "Marrakech" tombe sur un quartier parisien ou rien.
    const params = new URLSearchParams({
      format: "json",
      limit: "1",
      city: cityName.trim(),
      country: resolvedCountry.label,
    });
    if (resolvedCountry.code) params.set("countrycodes", resolvedCountry.code);
    const url = `https://nominatim.openstreetmap.org/search?${params}`;
    const res = await fetch(url, {
      headers: { "User-Agent": "Guardiens-App/1.0" },
    });

    if (!res.ok) {
      // Rate limit ou indisponibilité, on dégrade proprement, pas de 500.
      console.warn(`Nominatim returned ${res.status} for "${cityName}, ${resolvedCountry.label}"`);
      return new Response(
        JSON.stringify({ error: "GEOCODING_UNAVAILABLE", fallback: true, lat: null, lng: null }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const results = await res.json();
    if (!results || results.length === 0) {
      return new Response(JSON.stringify({ error: "City not found", lat: null, lng: null }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const lat = parseFloat(results[0].lat);
    const lng = parseFloat(results[0].lon);

    // Cache the result (ignore errors — cache is optional)
    await supabase.from("geocode_cache").upsert(
      { city_name: `${cityName.trim()}, ${resolvedCountry.label}`, normalized_name: normalized, lat, lng },
      { onConflict: "normalized_name" }
    );

    return new Response(JSON.stringify({ lat, lng, city: cityName.trim(), country: resolvedCountry.label }), {
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
