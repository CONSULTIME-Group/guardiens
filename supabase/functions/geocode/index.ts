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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { city } = await req.json();
    if (!city || typeof city !== "string" || city.trim().length < 2) {
      return new Response(JSON.stringify({ error: "Invalid city" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const normalized = normalize(city);

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

    // Call Nominatim (OpenStreetMap) — free, no API key needed
    const url = `https://nominatim.openstreetmap.org/search?format=json&countrycodes=fr&limit=1&q=${encodeURIComponent(city.trim())}`;
    const res = await fetch(url, {
      headers: { "User-Agent": "Guardiens-App/1.0" },
    });

    if (!res.ok) {
      throw new Error(`Nominatim returned ${res.status}`);
    }

    const results = await res.json();
    if (!results || results.length === 0) {
      return new Response(JSON.stringify({ error: "City not found", lat: null, lng: null }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const lat = parseFloat(results[0].lat);
    const lng = parseFloat(results[0].lon);

    // Cache the result (ignore errors — cache is optional)
    await supabase.from("geocode_cache").upsert(
      { city_name: city.trim(), normalized_name: normalized, lat, lng },
      { onConflict: "normalized_name" }
    );

    return new Response(JSON.stringify({ lat, lng, city: city.trim() }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Geocode error:", error);
    return new Response(JSON.stringify({ error: "Geocoding failed" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
