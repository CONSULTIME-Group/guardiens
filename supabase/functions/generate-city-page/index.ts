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
    const body = await req.json();
    console.log("generate-city-page body:", JSON.stringify(body));
    const { city, department, force } = body;
    if (!city || !department) {
      return new Response(JSON.stringify({ error: "city and department required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const slug = city
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");

    const { data: existing } = await supabase
      .from("seo_city_pages")
      .select("*")
      .eq("slug", slug)
      .maybeSingle();

    if (existing && !force) {
      return new Response(JSON.stringify(existing), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const prompt = `Vous êtes rédacteur SEO senior pour Guardiens, plateforme française de house-sitting de proximité (garde de maison et d'animaux entre particuliers, sans transaction financière directe). Vous rédigez une landing page locale riche, factuelle et chaleureuse pour la ville de ${city} (département ${department}).

RÈGLES STRICTES NON NÉGOCIABLES :
- Vouvoiement systématique.
- Aucune mention de région administrative ni de « Auvergne-Rhône-Alpes » / « AURA ».
- Mots PROSCRITS : « voisin », « voisine », « voisinage ». Utilisez : « gardien », « gens du coin », « personne de confiance », « proche ».
- Tiret cadratin « — » PROSCRIT. Utilisez virgule, deux-points, parenthèses ou point.
- Pas d'emoji, pas de superlatif commercial, pas de mention de concurrents.
- Ton YMYL : factuel, rassurant, utile. Évitez « unique », « révolutionnaire », « le meilleur ».
- Préférez « gratuit » à « 0 € ». Pas de « à vie » ni « pour toujours ».

Répondez UNIQUEMENT en JSON valide avec EXACTEMENT cette structure :
{
  "h1_title": "Titre H1 percutant intégrant ${city}, 60-80 caractères, parlant de house-sitting / garde maison animaux",
  "meta_title": "Titre SEO 50-60 caractères avec ${city} et la marque Guardiens",
  "meta_description": "Méta-description 140-160 caractères, claire, incite à l'inscription gratuite",
  "excerpt": "1 à 2 phrases résumant la page (pour aperçu cards), max 200 caractères",
  "intro_text": "Texte d'introduction de 5 à 7 phrases. Présentez ${city} comme cadre de vie, mentionnez le profil des habitants susceptibles d'utiliser Guardiens (familles, retraités actifs, voyageurs), évoquez ce que les gardiens y apprécient. Concret, ancré localement (sans inventer de monuments faux).",
  "content": "Article markdown long et riche (700 à 900 mots) structuré ainsi :\\n\\n## Pourquoi ${city} est un cadre idéal pour le house-sitting\\n(3-4 paragraphes : cadre de vie, type d'habitat, activités, proximité nature, profils des propriétaires)\\n\\n## Le profil des gardiens à ${city}\\n(2-3 paragraphes : qui sont-ils, leur motivation, ce qu'ils proposent, exemples concrets de besoins)\\n\\n## Comment ça se passe concrètement\\n(2-3 paragraphes : inscription gratuite, mise en relation, échanges sans transaction financière, période de gratuité jusqu'au 14 juillet 2026)\\n\\n## Conseils pratiques pour bien démarrer à ${city}\\n(liste à puces de 4 à 6 conseils concrets pour propriétaires et gardiens)\\n\\n## Questions fréquentes\\n(3 questions FAQ courtes au format : **Question ?** Réponse en 1-2 phrases)"
}

Le champ "content" DOIT être du markdown valide avec les sections H2 ci-dessus et entre 700 et 900 mots au total. Pas de H1 dans le content (le H1 est géré par h1_title).`;

    const aiResponse = await fetch(LOVABLE_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-pro",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 5000,
        temperature: 0.75,
        response_format: { type: "json_object" },
      }),
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      throw new Error(`AI API call failed [${aiResponse.status}]: ${errText}`);
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices?.[0]?.message?.content || "";
    const finishReason = aiData.choices?.[0]?.finish_reason;
    if (finishReason === "length") {
      console.warn("Response truncated for city", city);
    }

    const generated = extractJson(content) ?? {};

    const record: Record<string, unknown> = {
      city: city.trim(),
      department: department.trim(),
      slug,
      h1_title: generated.h1_title || `House-sitting à ${city}, gardiens de confiance près de chez vous`,
      intro_text: generated.intro_text || "",
      meta_title: generated.meta_title || `House-sitting ${city}, garde maison et animaux | Guardiens`,
      meta_description: generated.meta_description || `Trouvez un gardien de confiance à ${city}. Inscription gratuite, gardiens vérifiés.`,
      excerpt: generated.excerpt || null,
      content: generated.content || null,
      published: true,
      updated_at: new Date().toISOString(),
    };

    let result;
    if (existing && force) {
      const { data: updated, error } = await supabase
        .from("seo_city_pages")
        .update(record)
        .eq("id", existing.id)
        .select()
        .single();
      if (error) throw error;
      result = updated;
    } else {
      const { data: inserted, error } = await supabase
        .from("seo_city_pages")
        .insert({ ...record, sitter_count: 0, active_sits_count: 0 })
        .select()
        .single();
      if (error) throw error;
      result = inserted;
    }

    return new Response(JSON.stringify(result), {
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
