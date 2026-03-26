import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

async function geocodeAddress(query: string): Promise<{ lat: number; lng: number } | null> {
  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&countrycodes=fr&limit=1&q=${encodeURIComponent(query)}`;
    const res = await fetch(url, { headers: { "User-Agent": "Guardiens-App/1.0" } });
    if (!res.ok) return null;
    const results = await res.json();
    if (!results?.length) return null;
    return { lat: parseFloat(results[0].lat), lng: parseFloat(results[0].lon) };
  } catch {
    return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Get all places without coordinates
    const { data: places, error } = await supabase
      .from("city_guide_places")
      .select("id, name, address, city_guide_id")
      .is("latitude", null)
      .limit(50);

    if (error) throw error;
    if (!places || places.length === 0) {
      return new Response(JSON.stringify({ message: "No places to geocode", geocoded: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get city names for context
    const guideIds = [...new Set(places.map((p: any) => p.city_guide_id))];
    const { data: guides } = await supabase
      .from("city_guides")
      .select("id, city")
      .in("id", guideIds);

    const cityMap: Record<string, string> = {};
    (guides || []).forEach((g: any) => { cityMap[g.id] = g.city; });

    let geocoded = 0;
    const results: any[] = [];

    for (const place of places) {
      const city = cityMap[place.city_guide_id] || "";
      // Try with address + city first, fallback to name + city
      const queries = [
        place.address && city ? `${place.address}, ${city}, France` : null,
        `${place.name}, ${city}, France`,
      ].filter(Boolean) as string[];

      let coords: { lat: number; lng: number } | null = null;
      for (const q of queries) {
        coords = await geocodeAddress(q);
        if (coords) break;
        // Respect Nominatim rate limit (1 req/s)
        await new Promise((r) => setTimeout(r, 1100));
      }

      if (coords) {
        const { error: upErr } = await supabase
          .from("city_guide_places")
          .update({ latitude: coords.lat, longitude: coords.lng })
          .eq("id", place.id);

        if (!upErr) {
          geocoded++;
          results.push({ id: place.id, name: place.name, ...coords });
        }
      }

      // Rate limit
      await new Promise((r) => setTimeout(r, 1100));
    }

    return new Response(
      JSON.stringify({ geocoded, total: places.length, remaining: places.length - geocoded, results }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Geocode places error:", error);
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
