import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const LOVABLE_API_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { department, region } = await req.json();
    if (!department) {
      return new Response(JSON.stringify({ error: "department required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const slug = department
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");

    // Check existing
    const { data: existing } = await supabase
      .from("seo_department_pages")
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

    const regionName = region || "Auvergne-Rhône-Alpes";

    const prompt = `Tu es un expert SEO et rédacteur pour Guardiens, une plateforme de house-sitting de proximité en ${regionName}. Génère le contenu d'une landing page pour le département "${department}".

Réponds UNIQUEMENT en JSON valide :
{
  "h1_title": "House-sitting dans le ${department} — Gardiens de confiance près de chez vous",
  "intro_text": "3-4 phrases décrivant pourquoi le ${department} est un territoire idéal pour le house-sitting. Mentionne la géographie, les paysages, le cadre de vie. Ton chaleureux.",
  "highlights": "3-4 phrases sur les points forts du département : nature, villes principales, activités typiques.",
  "meta_title": "House-sitting ${department} — Garde maison et animaux | Guardiens",
  "meta_description": "Trouvez un gardien de maison et d'animaux de confiance dans le ${department}. Gardiens vérifiés, proximité, avis croisés."
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
        max_tokens: 600,
        temperature: 0.7,
      }),
    });

    if (!aiResponse.ok) {
      throw new Error(`AI error [${aiResponse.status}]: ${await aiResponse.text()}`);
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices?.[0]?.message?.content || "";
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("Could not parse AI JSON response");

    const generated = JSON.parse(jsonMatch[0]);

    const record = {
      department: department.trim(),
      slug,
      region: regionName,
      h1_title: generated.h1_title || `House-sitting dans le ${department}`,
      intro_text: generated.intro_text || "",
      highlights: generated.highlights || "",
      meta_title: generated.meta_title || `House-sitting ${department} | Guardiens`,
      meta_description: generated.meta_description || "",
      published: true,
      sitter_count: 0,
      active_sits_count: 0,
    };

    const { data: inserted, error } = await supabase
      .from("seo_department_pages")
      .insert(record)
      .select()
      .single();

    if (error) throw error;

    return new Response(JSON.stringify(inserted), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Department page generation error:", error);
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
