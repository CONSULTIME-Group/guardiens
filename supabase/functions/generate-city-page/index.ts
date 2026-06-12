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
    const { city, department, force } = await req.json();
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

    const prompt = `Vous êtes rédacteur SEO senior pour Guardiens, plateforme française de house-sitting de proximité (garde de maison et d'animaux entre particuliers, sans transaction financière directe). Vous rédigez une landing page locale RICHE et DÉTAILLÉE pour la ville de ${city} (département ${department}).

CONTEXTE MARQUE (à intégrer naturellement dans le contenu) :
- Guardiens a été fondée par Jérémie et Elisa, après 5 ans de house-sitting à travers la France (37 maisons gardées, 234 animaux accompagnés).
- Principe fondamental : rencontre physique obligatoire entre propriétaire et gardien avant chaque garde.
- Modèle : propriétaires sans frais. Gardiens : 6,99 €/mois résiliable, ou 10 € en formule ponctuelle, ou 65 €/an.
- Aucune commission par garde, jamais.
- Gratuit pour tous (propriétaires ET gardiens) jusqu'au 14 juillet 2026.
- L'animal reste chez lui, dans ses repères. La maison reste vivante (courrier, plantes, lumières).
- Vérification d'identité + avis croisés après chaque garde.

RÈGLES STRICTES NON NÉGOCIABLES :
- Vouvoiement systématique.
- Aucune mention de région administrative ni de « Auvergne-Rhône-Alpes » / « AURA ».
- Mots PROSCRITS : « voisin », « voisine », « voisinage ». Utilisez : « gardien », « gens du coin », « personne de confiance », « proche ».
- Tiret cadratin « — » PROSCRIT. Utilisez virgule, deux-points, parenthèses ou point.
- Pas d'emoji, pas de superlatif commercial, pas de mention de concurrents (Animaute, Holidog, Pet Sitting, etc.).
- Ton YMYL : factuel, rassurant, utile. Évitez « unique », « révolutionnaire », « le meilleur ».
- Préférez « gratuit » à « 0 € ». Pas de « à vie » ni « pour toujours ».
- Ancrage local concret : citez 2 à 4 lieux RÉELS et VÉRIFIABLES de ${city} (parcs, places, quartiers, monuments connus). N'inventez RIEN. Si vous doutez d'un lieu, n'en parlez pas.
- Liens internes OBLIGATOIRES en markdown, à répartir dans le contenu : [tarifs](/tarifs), [inscription propriétaire](/inscription?role=owner), [devenir gardien](/inscription?role=sitter), [petites missions](/petites-missions), [gardien d'urgence](/gardien-urgence).

Répondez UNIQUEMENT en JSON valide avec EXACTEMENT cette structure :
{
  "h1_title": "Titre H1 percutant intégrant ${city}, 60-80 caractères, parlant de house-sitting / garde maison animaux",
  "meta_title": "Titre SEO 50-60 caractères avec ${city} et la marque Guardiens",
  "meta_description": "Méta-description 140-160 caractères, claire, incite à l'inscription gratuite",
  "excerpt": "1 à 2 phrases résumant la page (pour aperçu cards), max 200 caractères",
  "intro_text": "Texte d'introduction de 5 à 7 phrases. Présentez ${city} comme cadre de vie pour les animaux, mentionnez les profils susceptibles d'utiliser Guardiens (familles, retraités actifs, télétravailleurs, voyageurs), évoquez ce que les gardiens y apprécient. Concret, ancré localement.",
  "content": "Article markdown LONG et RICHE (1500 à 1800 mots minimum) structuré EXACTEMENT comme suit :\\n\\n## Pourquoi ${city} a besoin d'une plateforme de garde de proximité\\n(3 sous-sections en ### : 'Une ville où les animaux font partie de la famille' avec un chiffre estimé de foyers avec chien/chat, 'Les limites des pensions classiques' avec fourchette de prix 25-50€/nuit, 'Le house-sitting, une alternative qui a fait ses preuves'. 4 paragraphes denses au total.)\\n\\n## Comment fonctionne Guardiens à ${city}\\n(4 sous-sections en ### intitulées 'Étape 1, Publiez votre annonce' avec lien [tarifs](/tarifs), 'Étape 2, Rencontrez les gardiens intéressés', 'Étape 3, Confirmez la garde', 'Étape 4, Partez l'esprit libre' avec lien [gardien d'urgence](/gardien-urgence). 1 paragraphe par étape.)\\n\\n## Les quartiers et environs de ${city}\\n(1 paragraphe d'intro puis 3 à 5 paragraphes en **gras** sur des quartiers ou communes limitrophes RÉELS de ${city}, type d'habitat, espaces verts, profils de gardes. Si vous ne connaissez pas finement la ville, restez sur 3 zones génériques bien identifiées, pas plus.)\\n\\n## Propriétaires à ${city}, ce que Guardiens vous offre\\n(5 à 6 bénéfices en **gras** puis 1-2 phrases : animal reste chez lui, maison reste vivante, rencontre préalable obligatoire, aucune commission avec lien [tarifs détaillés](/tarifs), accord de garde clair, gardiens vérifiés.)\\n\\n## Qui sont les gardiens à ${city}\\n(Intro 1 phrase + 4 profils en **gras** : retraités actifs, jeunes actifs en télétravail, familles, étudiants vérifiés. Mentionnez les [petites missions](/petites-missions) pour les gardes courtes.)\\n\\n## Tarifs Guardiens : transparents et sans surprise\\n(3 paragraphes en **gras** : Propriétaires sans frais, Gardiens trois formules au choix avec prix exacts 6,99€/mois et 10€ ponctuel et 65€/an, Aucune commission par garde. Lien [page tarifs complète](/tarifs). Mentionnez la gratuité totale jusqu'au 14 juillet 2026.)\\n\\n## Notre histoire et notre engagement à ${city}\\n(2-3 paragraphes : fondation par Jérémie et Elisa, 37 maisons gardées et 234 animaux accompagnés en 5 ans, ce que cette expérience a apporté à la plateforme, lancement officiel le 14 juillet 2026, ${city} fait partie du déploiement France entière.)\\n\\n## Questions fréquentes des propriétaires à ${city}\\n(5 à 6 questions FAQ au format **Question ?** suivi de la réponse en 2-3 phrases. Couvrez : rencontre préalable, urgence/imprévu, frais cachés, animaux à besoins spécifiques, durée minimum/maximum, vérification d'identité.)"
}

Le champ "content" DOIT être du markdown valide, faire AU MINIMUM 1500 mots, contenir les liens internes demandés, et suivre la structure H2/### ci-dessus. Pas de H1 dans le content (le H1 est géré par h1_title).`;

    const aiResponse = await fetch(LOVABLE_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-pro",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 12000,
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
