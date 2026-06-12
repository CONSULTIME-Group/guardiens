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

async function fetchWikipediaImage(city: string): Promise<{ url: string; alt: string } | null> {
  try {
    const res = await fetch(
      `https://fr.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(city)}`,
      { headers: { "User-Agent": "Guardiens/1.0 (contact@guardiens.fr)", Accept: "application/json" } },
    );
    if (!res.ok) return null;
    const data = await res.json();
    const url: string | undefined = data.originalimage?.source || data.thumbnail?.source;
    if (!url) return null;
    return { url, alt: `Vue de ${city}, ville de France` };
  } catch {
    return null;
  }
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

    const brandContext = `CONTEXTE MARQUE Guardiens (plateforme de house-sitting de proximité, sans transaction financière directe) :
- Fondée par Jérémie et Elisa après 5 ans de house-sitting en France (37 maisons gardées, 234 animaux accompagnés).
- Rencontre physique obligatoire propriétaire/gardien avant chaque garde.
- Propriétaires sans frais. Gardiens : 6,99 €/mois résiliable, 10 € ponctuel, ou 65 €/an. Aucune commission.
- Gratuit pour tous jusqu'au 14 juillet 2026.
- L'animal reste chez lui, la maison reste vivante (courrier, plantes, lumières). Vérification d'identité + avis croisés.

RÈGLES STRICTES :
- Vouvoiement systématique.
- Mots PROSCRITS : « voisin », « voisine », « voisinage ». Utilisez « gardien », « gens du coin », « personne de confiance », « proche ».
- Aucune mention de « Auvergne-Rhône-Alpes » / « AURA » ni de région administrative.
- Tiret cadratin « — » PROSCRIT. Utilisez virgule, deux-points, parenthèses ou point.
- Pas d'emoji, pas de superlatif commercial, pas de concurrents (Animaute, Holidog, etc.).
- Ton YMYL factuel. Évitez « unique », « révolutionnaire », « le meilleur ».
- Préférez « gratuit » à « 0 € ». Pas de « à vie » ni « pour toujours ».
- N'inventez aucun lieu. Si vous doutez, restez générique.`;

    // Appel 1 : métadonnées JSON courtes (fiable)
    const metaPrompt = `${brandContext}

Vous générez les MÉTADONNÉES SEO d'une landing page Guardiens pour ${city} (département ${department}).

Répondez UNIQUEMENT en JSON strict :
{
  "h1_title": "H1 60-80 caractères avec ${city}, sur house-sitting / garde maison animaux",
  "meta_title": "50-60 caractères avec ${city} et Guardiens",
  "meta_description": "140-160 caractères, incite à l'inscription gratuite",
  "excerpt": "1-2 phrases résumé, max 200 caractères",
  "intro_text": "5 à 7 phrases : ${city} comme cadre de vie pour les animaux, profils utilisateurs (familles, retraités actifs, télétravailleurs, voyageurs), ancrage local concret."
}`;

    // Appel 2 : corps markdown brut (pas d'échappement JSON, beaucoup plus stable)
    const contentPrompt = `${brandContext}

Vous rédigez le CORPS markdown (1000 à 1300 mots) d'une landing page Guardiens pour ${city} (${department}).

Répondez UNIQUEMENT en markdown brut. PAS de JSON, PAS de \`\`\`, PAS de H1 (réservé au titre de page).

Structure EXACTE :

## Pourquoi ${city} a besoin d'une plateforme de garde de proximité
### Une ville où les animaux font partie de la famille
(paragraphe + chiffre estimé de foyers avec chien/chat)
### Les limites des pensions classiques
(paragraphe + fourchette 25-50 € la nuit)
### Le house-sitting, une alternative qui a fait ses preuves
(paragraphe)

## Comment fonctionne Guardiens à ${city}
### Étape 1, Publiez votre annonce
(paragraphe avec lien [tarifs](/tarifs))
### Étape 2, Rencontrez les gardiens intéressés
(paragraphe)
### Étape 3, Confirmez la garde
(paragraphe)
### Étape 4, Partez l'esprit libre
(paragraphe avec lien [gardien d'urgence](/gardien-urgence))

## Les quartiers et environs de ${city}
(intro + 3 à 5 zones réelles de ${city} en **gras**, type d'habitat, espaces verts. Si doute, restez sur 3 zones génériques.)

## Propriétaires à ${city}, ce que Guardiens vous offre
(5 à 6 bénéfices en **gras** suivis de 1-2 phrases : animal chez lui, maison vivante, rencontre préalable obligatoire, aucune commission avec lien [tarifs détaillés](/tarifs), accord de garde clair, gardiens vérifiés)

## Qui sont les gardiens à ${city}
(intro + 4 profils en **gras** : retraités actifs, jeunes actifs en télétravail, familles, étudiants vérifiés. Mentionnez les [petites missions](/petites-missions) pour les gardes courtes.)

## Tarifs Guardiens : transparents et sans surprise
(3 paragraphes en **gras** : Propriétaires sans frais ; Gardiens 6,99 €/mois ou 10 € ponctuel ou 65 €/an ; Aucune commission par garde. Lien [page tarifs complète](/tarifs). Gratuité totale jusqu'au 14 juillet 2026.)

## Notre histoire et notre engagement à ${city}
(2-3 paragraphes : fondation Jérémie & Elisa, 37 maisons et 234 animaux en 5 ans, lancement officiel 14 juillet 2026, ${city} dans le déploiement France entière)

## Questions fréquentes des propriétaires à ${city}
(5 à 6 questions au format **Question ?** + réponse 2-3 phrases : rencontre préalable, urgence, frais cachés, animaux à besoins spécifiques, durée min/max, vérification d'identité)`;

    const callAI = async (p: string, jsonMode: boolean) => {
      const res = await fetch(LOVABLE_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-pro",
          messages: [{ role: "user", content: p }],
          max_tokens: jsonMode ? 2000 : 8000,
          temperature: 0.7,
          ...(jsonMode ? { response_format: { type: "json_object" } } : {}),
        }),
      });
      if (!res.ok) {
        const t = await res.text();
        throw new Error(`AI API [${res.status}]: ${t}`);
      }
      const data = await res.json();
      return {
        text: data.choices?.[0]?.message?.content || "",
        finishReason: data.choices?.[0]?.finish_reason,
      };
    };

    const [metaRes, contentRes] = await Promise.all([
      callAI(metaPrompt, true),
      callAI(contentPrompt, false),
    ]);

    const truncated = contentRes.finishReason === "length";
    if (truncated) console.warn("Content truncated for city", city);

    const generated: any = extractJson(metaRes.text) ?? {};
    const markdown = (contentRes.text || "")
      .replace(/^```(?:markdown|md)?\s*/i, "")
      .replace(/```\s*$/, "")
      .trim();
    if (markdown.length > 200) generated.content = markdown;

    // Defensive : si l'IA a tronqué ou si le content est vide, on REFUSE
    // d'écraser un contenu existant valide. En cas de création, on échoue
    // proprement avec un 502.
    const hasValidContent = typeof generated.content === "string" && generated.content.trim().length > 200;
    if (!hasValidContent) {
      if (existing && force) {
        return new Response(
          JSON.stringify({
            error: "AI_GENERATION_INCOMPLETE",
            detail: truncated ? "Response truncated by AI" : "Empty or invalid AI content",
            preserved: true,
          }),
          { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      if (!existing) {
        return new Response(
          JSON.stringify({
            error: "AI_GENERATION_INCOMPLETE",
            detail: truncated ? "Response truncated by AI" : "Empty or invalid AI content",
          }),
          { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
    }

    // Photo réelle (non IA) depuis Wikipedia FR si dispo
    const wiki = await fetchWikipediaImage(city);

    const record: Record<string, unknown> = {
      city: city.trim(),
      department: department.trim(),
      slug,
      h1_title: generated.h1_title || existing?.h1_title || `House-sitting à ${city}, gardiens de confiance près de chez vous`,
      intro_text: generated.intro_text || existing?.intro_text || "",
      meta_title: generated.meta_title || existing?.meta_title || `House-sitting ${city}, garde maison et animaux | Guardiens`,
      meta_description: generated.meta_description || existing?.meta_description || `Trouvez un gardien de confiance à ${city}. Inscription gratuite, gardiens vérifiés.`,
      excerpt: generated.excerpt || existing?.excerpt || null,
      content: generated.content || existing?.content || null,
      cover_image_url: wiki?.url || existing?.cover_image_url || null,
      hero_image_alt: wiki?.alt || existing?.hero_image_alt || null,
      published: true,
      updated_at: new Date().toISOString(),
    };

    let result;
    if (existing) {
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
