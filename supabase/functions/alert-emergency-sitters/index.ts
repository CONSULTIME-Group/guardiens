import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Verify JWT
    const anonClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!);
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await anonClient.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { sitId, sitCity } = await req.json();

    if (!sitId || !sitCity) {
      return new Response(JSON.stringify({ error: "sitId and sitCity required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Geocode the sit city to get lat/lng
    const { data: geoCache } = await supabase
      .from("geocode_cache")
      .select("lat, lng")
      .ilike("normalized_name", sitCity.trim().toLowerCase())
      .limit(1)
      .maybeSingle();

    if (!geoCache) {
      return new Response(
        JSON.stringify({ error: "City not found in geocode cache", alerted: 0 }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const sitLat = geoCache.lat;
    const sitLng = geoCache.lng;

    // Get all active emergency sitters (excluding the requesting user)
    const { data: emergencySitters } = await supabase
      .from("emergency_sitter_profiles")
      .select("user_id, radius_km")
      .eq("is_active", true)
      .neq("user_id", user.id);

    if (!emergencySitters || emergencySitters.length === 0) {
      return new Response(
        JSON.stringify({ alerted: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get profiles with city for all emergency sitters
    const sitterIds = emergencySitters.map((s) => s.user_id);
    const { data: sitterProfiles } = await supabase
      .from("profiles")
      .select("id, city")
      .in("id", sitterIds);

    if (!sitterProfiles || sitterProfiles.length === 0) {
      return new Response(
        JSON.stringify({ alerted: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get geocode cache for all sitter cities
    const sitterCities = [...new Set(sitterProfiles.map((p) => p.city?.trim().toLowerCase()).filter(Boolean))];
    const { data: geoCaches } = await supabase
      .from("geocode_cache")
      .select("normalized_name, lat, lng")
      .in("normalized_name", sitterCities);

    const cityGeoMap = new Map<string, { lat: number; lng: number }>();
    (geoCaches || []).forEach((g) => cityGeoMap.set(g.normalized_name, { lat: g.lat, lng: g.lng }));

    // Build radius map
    const radiusMap = new Map<string, number>();
    emergencySitters.forEach((s) => radiusMap.set(s.user_id, s.radius_km));

    // Find sitters within 35km of the sit
    const MAX_RADIUS = 35;
    const eligibleSitterIds: string[] = [];

    for (const profile of sitterProfiles) {
      if (!profile.city) continue;
      const geo = cityGeoMap.get(profile.city.trim().toLowerCase());
      if (!geo) continue;

      const distance = haversine(sitLat, sitLng, geo.lat, geo.lng);
      const sitterRadius = Math.min(radiusMap.get(profile.id) || 20, MAX_RADIUS);

      if (distance <= sitterRadius) {
        eligibleSitterIds.push(profile.id);
      }
    }

    if (eligibleSitterIds.length === 0) {
      return new Response(
        JSON.stringify({ alerted: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get requester name
    const { data: requesterProfile } = await supabase
      .from("profiles")
      .select("first_name, avatar_url")
      .eq("id", user.id)
      .single();

    // Send notifications to all eligible sitters
    const notifications = eligibleSitterIds.map((sitterId) => ({
      user_id: sitterId,
      type: "emergency_alert",
      title: "🚨 Alerte gardien d'urgence",
      body: `${requesterProfile?.first_name || "Un propriétaire"} a besoin d'un gardien d'urgence près de ${sitCity}. Pouvez-vous aider ?`,
      link: `/sits/${sitId}`,
      actor_name: requesterProfile?.first_name || null,
      actor_avatar_url: requesterProfile?.avatar_url || null,
    }));

    await supabase.from("notifications").insert(notifications);

    return new Response(
      JSON.stringify({ alerted: eligibleSitterIds.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
