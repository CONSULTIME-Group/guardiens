// Edge function : récupère les avis Google d'un établissement via Places API (New)
// et met en cache 24h dans pro_google_reviews_cache.
// Appelée publiquement depuis la fiche pro.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const GATEWAY_URL = "https://connector-gateway.lovable.dev/google_maps";
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24h

interface RequestBody {
  pro_id?: string;
  place_id?: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = (await req.json().catch(() => ({}))) as RequestBody;
    const proId = body.pro_id?.trim();
    const placeId = body.place_id?.trim();

    if (!proId || !placeId) {
      return new Response(
        JSON.stringify({ error: "pro_id et place_id sont requis" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (!/^[a-zA-Z0-9_-]{10,128}$/.test(placeId)) {
      return new Response(
        JSON.stringify({ error: "place_id invalide" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // 1. Lire le cache
    const { data: cached } = await supabase
      .from("pro_google_reviews_cache")
      .select("*")
      .eq("pro_id", proId)
      .maybeSingle();

    if (cached && cached.place_id === placeId) {
      const age = Date.now() - new Date(cached.fetched_at).getTime();
      if (age < CACHE_TTL_MS) {
        return new Response(
          JSON.stringify({
            cached: true,
            rating_avg: cached.rating_avg,
            rating_count: cached.rating_count,
            reviews: cached.reviews,
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
    }

    // 2. Appel gateway Google Places (New)
    const lovableKey = Deno.env.get("LOVABLE_API_KEY");
    const gmapsKey = Deno.env.get("GOOGLE_MAPS_API_KEY");
    if (!lovableKey || !gmapsKey) {
      return new Response(
        JSON.stringify({ error: "Configuration Google Maps manquante" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const placeRes = await fetch(`${GATEWAY_URL}/places/v1/places/${encodeURIComponent(placeId)}`, {
      headers: {
        Authorization: `Bearer ${lovableKey}`,
        "X-Connection-Api-Key": gmapsKey,
        "X-Goog-FieldMask": "id,displayName,rating,userRatingCount,reviews,googleMapsUri",
      },
    });

    if (!placeRes.ok) {
      const txt = await placeRes.text();
      return new Response(
        JSON.stringify({ error: "Erreur Google Places", status: placeRes.status, detail: txt.slice(0, 300) }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const place = await placeRes.json();
    const rawReviews: any[] = Array.isArray(place.reviews) ? place.reviews : [];

    // Normalisation : on garde attribution (auteur + photo + lien) obligatoire
    const reviews = rawReviews.slice(0, 5).map((r: any) => ({
      author_name: r.authorAttribution?.displayName ?? "Anonyme",
      author_photo: r.authorAttribution?.photoUri ?? null,
      author_uri: r.authorAttribution?.uri ?? null,
      rating: r.rating ?? null,
      text: r.text?.text ?? r.originalText?.text ?? "",
      relative_time: r.relativePublishTimeDescription ?? "",
      publish_time: r.publishTime ?? null,
    }));

    const ratingAvg = typeof place.rating === "number" ? Number(place.rating.toFixed(2)) : null;
    const ratingCount = typeof place.userRatingCount === "number" ? place.userRatingCount : 0;

    // 3. Upsert cache
    await supabase
      .from("pro_google_reviews_cache")
      .upsert(
        {
          pro_id: proId,
          place_id: placeId,
          reviews,
          rating_avg: ratingAvg,
          rating_count: ratingCount,
          fetched_at: new Date().toISOString(),
        },
        { onConflict: "pro_id" },
      );

    return new Response(
      JSON.stringify({
        cached: false,
        rating_avg: ratingAvg,
        rating_count: ratingCount,
        reviews,
        google_maps_uri: place.googleMapsUri ?? null,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
