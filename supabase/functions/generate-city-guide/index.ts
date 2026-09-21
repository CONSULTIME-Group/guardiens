import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { requireAdminOrServiceRole } from "../_shared/require-admin.ts";

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

class AiGatewayError extends Error {
  constructor(public status: number, message: string) {
    super(message);
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
  if (res.status === 402) {
    throw new AiGatewayError(402, "Crédits IA épuisés. Rechargez les crédits de l'espace de travail pour générer un guide.");
  }
  if (res.status === 429) {
    throw new AiGatewayError(429, "Trop de requêtes IA, réessayez dans un instant.");
  }
  if (!res.ok) throw new AiGatewayError(res.status, `Erreur fournisseur IA (statut ${res.status}).`);
  const data = await res.json();
  const content = data.choices?.[0]?.message?.content || "";
  const match = content.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
  if (!match) throw new Error("Could not parse AI JSON response");
  return JSON.parse(match[0]);
}

/**
 * Géocodage en arrière-plan, hors du chemin critique de la réponse HTTP.
 * Une requête Nominatim par seconde au maximum, comme avant.
 */
async function geocodePlacesInBackground(
  supabase: ReturnType<typeof createClient>,
  city: string,
  rows: Array<{ id: string; name: string; address: string | null }>,
) {
  const started = Date.now();
  let geocoded = 0;
  for (const row of rows) {
    const queries = [
      row.address ? `${row.address}, ${city}, France` : null,
      `${row.name}, ${city}, France`,
    ].filter(Boolean) as string[];

    let coords: { lat: number; lng: number } | null = null;
    for (const q of queries) {
      await new Promise((r) => setTimeout(r, 1100));
      coords = await geocodeAddress(q);
      if (coords) break;
    }

    if (coords) {
      const { error } = await supabase
        .from("city_guide_places")
        .update({ latitude: coords.lat, longitude: coords.lng })
        .eq("id", row.id);
      if (error) {
        console.error("[generate-city-guide] update coords error", row.id, error.message);
      } else {
        geocoded++;
      }
    }
  }
  console.log(
    `[generate-city-guide] géocodage terminé pour ${city}: ${geocoded}/${rows.length} lieux en ${Date.now() - started} ms`,
  );
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const t0 = Date.now();
  try {
    const authFail = await requireAdminOrServiceRole(req, corsHeaders);
    if (authFail) return authFail;
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

    const tIntro = Date.now();
    const introData = await callAI(LOVABLE_API_KEY, introPrompt, 400);
    console.log(`[generate-city-guide] intro ${city}: ${Date.now() - tIntro} ms`);

    // Insert guide
    const tInsert = Date.now();
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
    console.log(`[generate-city-guide] insertion guide: ${Date.now() - tInsert} ms`);

    // 2. Generate places for each category, en parallèle
    const categoryLabels: Record<string, string> = {
      dog_park: "parcs à chiens et espaces verts dog-friendly",
      walk_trail: "sentiers de balade, chemins de promenade et bords de rivière",
      vet: "vétérinaires (les 3 mieux notés)",
      dog_friendly_cafe: "cafés et restaurants qui acceptent les chiens",
      pet_shop: "animaleries et boutiques pour animaux",
    };

    const tPlaces = Date.now();
    const results = await Promise.allSettled(
      CATEGORIES.map(async (cat) => {
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
        return placeArray.slice(0, 5).map((p: any) => ({
          city_guide_id: guide.id,
          category: cat,
          name: p.name || "Lieu",
          address: p.address || "",
          description: p.description || "",
          tips: p.tips || null,
          dogs_welcome: p.dogs_welcome !== false,
          leash_required: p.leash_required ?? null,
          latitude: null as number | null,
          longitude: null as number | null,
        }));
      }),
    );

    const allPlaces: any[] = [];
    results.forEach((r, i) => {
      if (r.status === "fulfilled") {
        allPlaces.push(...r.value);
      } else {
        console.error(`[generate-city-guide] catégorie ${CATEGORIES[i]} ignorée pour ${city}:`, r.reason);
      }
    });
    console.log(
      `[generate-city-guide] ${allPlaces.length} lieux générés (${results.filter((r) => r.status === "fulfilled").length}/${CATEGORIES.length} catégories) en ${Date.now() - tPlaces} ms`,
    );

    let inserted: Array<{ id: string; name: string; address: string | null }> = [];
    if (allPlaces.length > 0) {
      const { data: insertedRows, error: placesErr } = await supabase
        .from("city_guide_places")
        .insert(allPlaces)
        .select("id, name, address");
      if (placesErr) console.error("Places insert error:", placesErr);
      inserted = (insertedRows || []) as typeof inserted;
    }

    // 3. Géocodage en arrière-plan, la réponse ne l'attend pas
    if (inserted.length > 0) {
      const task = geocodePlacesInBackground(supabase, city, inserted);
      const runtime = (globalThis as any).EdgeRuntime;
      if (runtime?.waitUntil) {
        runtime.waitUntil(task);
      } else {
        task.catch((e) => console.error("[generate-city-guide] géocodage:", e));
      }
    }

    console.log(`[generate-city-guide] réponse pour ${city} en ${Date.now() - t0} ms (géocodage en arrière-plan)`);

    return new Response(
      JSON.stringify({ ...guide, places_count: allPlaces.length, geocoding: "pending" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error(`City guide generation error (après ${Date.now() - t0} ms):`, error);
    const isGateway = error instanceof AiGatewayError;
    const status = isGateway ? error.status : 500;
    const message = error instanceof Error ? error.message : String(error);
    return new Response(JSON.stringify({ error: message, code: isGateway ? "AI_GATEWAY" : "INTERNAL" }), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
