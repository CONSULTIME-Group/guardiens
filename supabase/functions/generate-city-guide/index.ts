import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const LOVABLE_API_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";

const CATEGORIES = ["dog_park", "walk_trail", "vet", "dog_friendly_cafe", "pet_shop"];

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

async function callAI(apiKey: string, prompt: string, maxTokens = 1000) {
  const res = await fetch(LOVABLE_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [{ role: "user", content: prompt }],
      max_tokens: maxTokens,
      temperature: 0.7,
    }),
  });
  if (!res.ok) throw new Error(`AI error [${res.status}]: ${await res.text()}`);
  const data = await res.json();
  const content = data.choices?.[0]?.message?.content || "";
  const match = content.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
  if (!match) throw new Error("Could not parse AI JSON response");
  return JSON.parse(match[0]);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { city, postal_code, department } = await req.json();
    if (!city) {
      return new Response(JSON.stringify({ error: "city required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const slug = city
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");

    // Check existing
    const { data: existing } = await supabase
      .from("city_guides")
      .select("*")
      .eq("slug", slug)
      .maybeSingle();

    if (existing) {
      return new Response(JSON.stringify(existing), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    // 1. Generate intro
    const introPrompt = `Tu es un guide local expert. Génère une introduction de 3-4 phrases pour un guide destiné aux gardiens de maison et d'animaux qui vont séjourner à ${city}. Ton chaleureux et pratique. Mentionne l'ambiance du coin, ce qui le rend agréable pour se balader avec un chien. Termine par "Idéal pour les gardiens qui..." en une phrase.
Réponds UNIQUEMENT en JSON valide : {"intro": "...", "ideal_for": "Idéal pour les gardiens qui..."}`;

    const introData = await callAI(LOVABLE_API_KEY, introPrompt, 400);

    // Insert guide
    const { data: guide, error: guideErr } = await supabase
      .from("city_guides")
      .insert({
        city: city.trim(),
        postal_code: postal_code || "",
        slug,
        department: department || "",
        intro: introData.intro || "",
        ideal_for: introData.ideal_for || "",
        published: true,
      })
      .select()
      .single();

    if (guideErr) throw guideErr;

    // 2. Generate places for each category
    const categoryLabels: Record<string, string> = {
      dog_park: "parcs à chiens et espaces verts dog-friendly",
      walk_trail: "sentiers de balade, chemins de promenade et bords de rivière",
      vet: "vétérinaires (les 3 mieux notés)",
      dog_friendly_cafe: "cafés et restaurants qui acceptent les chiens",
      pet_shop: "animaleries et boutiques pour animaux",
    };

    const allPlaces: any[] = [];

    for (const cat of CATEGORIES) {
      try {
        const placesPrompt = `Tu es un guide local expert de ${city} en France. Liste les ${categoryLabels[cat]} les plus connus et recommandés de ${city} et ses environs immédiats. Pour chaque lieu, donne le nom réel, l'adresse approximative, et une description courte du point de vue d'un gardien qui promène un chien.

Catégorie : ${cat}

Réponds UNIQUEMENT en JSON valide, un tableau de lieux :
[
  {
    "name": "Nom réel du lieu",
    "address": "Adresse approximative",
    "description": "1-2 phrases pratiques pour un gardien avec un chien",
    "tips": "1 conseil concret",
    "dogs_welcome": true,
    "leash_required": true
  }
]
En français. Maximum 5 lieux. Privilégie les lieux réels et connus.`;

        const places = await callAI(LOVABLE_API_KEY, placesPrompt, 1200);
        const placeArray = Array.isArray(places) ? places : [places];

        for (const p of placeArray.slice(0, 5)) {
          allPlaces.push({
            city_guide_id: guide.id,
            category: cat,
            name: p.name || "Lieu",
            address: p.address || "",
            description: p.description || "",
            tips: p.tips || null,
            dogs_welcome: p.dogs_welcome !== false,
            leash_required: p.leash_required ?? null,
          });
        }
      } catch (catErr) {
        console.error(`Error generating ${cat} for ${city}:`, catErr);
      }
    }

    if (allPlaces.length > 0) {
      const { error: placesErr } = await supabase
        .from("city_guide_places")
        .insert(allPlaces);
      if (placesErr) console.error("Places insert error:", placesErr);
    }

    return new Response(
      JSON.stringify({ ...guide, places_count: allPlaces.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("City guide generation error:", error);
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
