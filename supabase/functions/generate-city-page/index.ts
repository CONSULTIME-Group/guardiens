import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const LOVABLE_API_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";

function extractJson(raw: string): any | null {
  if (!raw) return null;
  let s = raw.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
  const start = s.search(/[\{\[]/);
  if (start === -1) return null;
  const open = s[start];
  const close = open === "[" ? "]" : "}";
  const end = s.lastIndexOf(close);
  if (end === -1 || end < start) return null;
  s = s.slice(start, end + 1);
  try { return JSON.parse(s); } catch {}
  const repaired = s
    .replace(/,\s*([}\]])/g, "$1")
    .replace(/[\x00-\x1F\x7F]/g, " ");
  try { return JSON.parse(repaired); } catch { return null; }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { city, department } = await req.json();
    if (!city || !department) {
      return new Response(JSON.stringify({ error: "city and department required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Generate slug
    const slug = city
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");

    // Check if already exists
    const { data: existing } = await supabase
      .from("seo_city_pages")
      .select("*")
      .eq("slug", slug)
      .maybeSingle();

    if (existing) {
      return new Response(JSON.stringify(existing), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const prompt = `Tu es un expert SEO et rédacteur pour Guardiens, une plateforme de house-sitting de proximité couvrant toute la France. Génère le contenu d'une landing page pour la ville de ${city} (département ${department}).

Règles strictes : vouvoiement ; pas de mention de région administrative ; pas du mot « voisin » ni « voisinage » (utiliser « gardien », « gens du coin », « personne de confiance ») ; pas de tiret cadratin « — » (utiliser virgule, deux-points ou parenthèses) ; pas d'emoji ; ton factuel, chaleureux, sans superlatifs commerciaux.

Réponds UNIQUEMENT en JSON valide :
{
  "h1_title": "House-sitting à ${city}, gardiens de confiance près de chez vous",
  "intro_text": "3-4 phrases qui décrivent pourquoi ${city} est un cadre agréable pour le house-sitting. Mentionnez l'ambiance, la nature, le cadre de vie local. Ton chaleureux, factuel.",
  "meta_title": "House-sitting ${city}, garde maison et animaux | Guardiens",
  "meta_description": "Trouvez un gardien de maison et d'animaux de confiance à ${city}. Gardiens vérifiés, proximité, avis croisés. Inscription gratuite."
}`;

    const aiResponse = await fetch(LOVABLE_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 1200,
        temperature: 0.7,
        response_format: { type: "json_object" },
      }),
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      throw new Error(`AI API call failed [${aiResponse.status}]: ${errText}`);
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices?.[0]?.message?.content || "";

    const generated = extractJson(content) ?? {};

    const record = {
      city: city.trim(),
      department: department.trim(),
      slug,
      h1_title: generated.h1_title || `House-sitting à ${city}`,
      intro_text: generated.intro_text || "",
      meta_title: generated.meta_title || `House-sitting ${city} | Guardiens`,
      meta_description: generated.meta_description || `Trouvez un gardien de confiance à ${city}.`,
      published: true,
      sitter_count: 0,
      active_sits_count: 0,
    };

    const { data: inserted, error } = await supabase
      .from("seo_city_pages")
      .insert(record)
      .select()
      .single();

    if (error) throw error;

    return new Response(JSON.stringify(inserted), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("City page generation error:", error);
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
