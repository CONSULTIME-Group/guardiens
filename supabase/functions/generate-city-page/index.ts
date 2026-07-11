import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { requireAdminOrServiceRole } from "../_shared/require-admin.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const LOVABLE_API_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
const USER_AGENT = "GuardiensBot/1.0 (https://guardiens.fr)";

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
  try { return JSON.parse(s); } catch { /* fallthrough */ }
  const repaired = s
    .replace(/,\s*([}\]])/g, "$1")
    .replace(/[\x00-\x1F\x7F]/g, " ");
  try { return JSON.parse(repaired); } catch { return null; }
}

async function fetchWikipediaImage(city: string): Promise<{ url: string; alt: string } | null> {
  try {
    const res = await fetch(
      `https://fr.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(city)}`,
      { headers: { "User-Agent": USER_AGENT, Accept: "application/json" } },
    );
    if (!res.ok) return null;
    const data = await res.json();
    const url: string | undefined = data.originalimage?.source || data.thumbnail?.source;
    if (!url) return null;
    return { url, alt: `Vue de ${city}, ville de France` };
  } catch (e) {
    console.error("wiki err", city, String(e));
    return null;
  }
}

/**
 * Récupère des lieux réels depuis OpenStreetMap Overpass API.
 * Dégradation gracieuse : en cas d'erreur, timeout ou zéro résultat, on renvoie
 * des listes vides — on n'invente JAMAIS de lieu.
 */
async function fetchOsmPlaces(
  city: string,
): Promise<{ vets: string[]; parks: string[] }> {
  const empty = { vets: [], parks: [] };
  const safeCity = city.replace(/"/g, '\\"');
  const query = `[out:json][timeout:25];
area["name"="${safeCity}"]["boundary"="administrative"]["admin_level"~"7|8"]->.a;
(
  node["amenity"="veterinary"](area.a);
  way["amenity"="veterinary"](area.a);
  node["leisure"="dog_park"](area.a);
  node["leisure"="park"]["name"](area.a);
  way["leisure"="park"]["name"](area.a);
);
out tags center 40;`;

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 20000);
    const res = await fetch("https://overpass-api.de/api/interpreter", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": USER_AGENT,
      },
      body: "data=" + encodeURIComponent(query),
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (!res.ok) {
      console.warn("overpass non-200", city, res.status);
      return empty;
    }
    const data = await res.json();
    const elements: any[] = Array.isArray(data?.elements) ? data.elements : [];
    const vets = new Set<string>();
    const parks = new Set<string>();
    for (const el of elements) {
      const tags = el?.tags || {};
      const name: string | undefined = tags.name;
      if (!name || typeof name !== "string") continue;
      const clean = name.trim();
      if (!clean) continue;
      if (tags.amenity === "veterinary") {
        if (vets.size < 5) vets.add(clean);
      } else if (tags.leisure === "dog_park" || tags.leisure === "park") {
        if (parks.size < 5) parks.add(clean);
      }
    }
    return { vets: [...vets], parks: [...parks] };
  } catch (e) {
    console.warn("overpass err", city, String(e));
    return empty;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authFail = await requireAdminOrServiceRole(req, corsHeaders);
    if (authFail) return authFail;
    const { city, department, force, cover_image_url: coverIn, hero_image_alt: altIn } = await req.json();
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

    // ── DONNÉES RÉELLES : Guardiens (couverture) + OSM (lieux) + sits actifs.
    const [{ count: sitterCountRaw }, { count: activeSitsCountRaw }, osm] = await Promise.all([
      supabase
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .in("role", ["sitter", "both"])
        .ilike("city", `%${city}%`),
      supabase
        .from("sits")
        .select("id", { count: "exact", head: true })
        .eq("status", "published")
        .ilike("city", `%${city}%`),
      fetchOsmPlaces(city),
    ]);

    const realSitterCount = sitterCountRaw ?? 0;
    const realActiveSitsCount = activeSitsCountRaw ?? 0;

    const vetsLine = osm.vets.length > 0 ? osm.vets.join(", ") : "non disponibles";
    const parksLine = osm.parks.length > 0 ? osm.parks.join(", ") : "non disponibles";

    const realDataBlock = `DONNÉES LOCALES RÉELLES (vérifiées, à utiliser telles quelles, ne pas en inventer d'autres) :
- Gardiens Guardiens actifs à ${city} : ${realSitterCount}.
- Vétérinaires réels : ${vetsLine}.
- Parcs et espaces verts réels : ${parksLine}.`;

    const brandContext = `CONTEXTE MARQUE Guardiens (plateforme de house-sitting de proximité, sans transaction financière directe) :
- Fondée par Jérémie et Elisa après 5 ans de house-sitting en France (37 maisons gardées, 234 animaux accompagnés).
- Rencontre physique obligatoire propriétaire/gardien avant chaque garde.
- Propriétaires : gratuit. Gardiens : gratuit aujourd'hui, sans engagement. Aucune commission par garde. Service gratuit jusqu'à nouvel ordre.
- L'animal reste chez lui, la maison reste vivante (courrier, plantes, lumières). Vérification d'identité + avis croisés.

RÈGLES STRICTES :
- Vouvoiement systématique.
- Mots PROSCRITS : « voisin », « voisine », « voisinage ». Utilisez « gardien », « gens du coin », « personne de confiance », « proche ».
- Aucune mention de « Auvergne-Rhône-Alpes » / « AURA » ni de région administrative.
- Tiret cadratin « — » PROSCRIT. Utilisez virgule, deux-points, parenthèses ou point.
- Pas d'emoji, pas de superlatif commercial, pas de concurrents (Animaute, Holidog, etc.).
- Ton YMYL factuel. Évitez « unique », « révolutionnaire », « le meilleur ».
- Préférez « gratuit » à « 0 € ». Pas de « à vie » ni « pour toujours ».
- Ne mentionnez AUCUN prix d'abonnement (ni 6,99 €, ni 10 €, ni 65 €, ni 9 €) ni date de fin de gratuité.
- N'inventez aucun lieu. Si vous doutez, restez générique.

RÈGLE DURE — DONNÉES CHIFFRÉES :
N'inventez AUCUN chiffre : ni population, ni nombre de foyers, ni prix, ni statistique. N'employez que les données du bloc DONNÉES LOCALES RÉELLES fourni ci-dessous. Si une information n'y figure pas, ne la mentionnez pas plutôt que de l'inventer.`;

    // Appel 1 : métadonnées JSON courtes (fiable)
    const metaPrompt = `${brandContext}

${realDataBlock}

Vous générez les MÉTADONNÉES SEO d'une landing page Guardiens pour ${city} (département ${department}).

Répondez UNIQUEMENT en JSON strict :
{
  "h1_title": "H1 60-80 caractères avec ${city}, sur house-sitting / garde maison animaux",
  "meta_title": "50-60 caractères avec ${city} et Guardiens",
  "meta_description": "140-160 caractères, incite à l'inscription gratuite",
  "excerpt": "1-2 phrases résumé, max 200 caractères",
  "intro_text": "5 à 7 phrases : ${city} comme cadre de vie pour les animaux, profils utilisateurs (familles, retraités actifs, télétravailleurs, voyageurs), ancrage local concret. AUCUN chiffre inventé."
}`;

    // Appel 2 : corps markdown brut
    const contentPrompt = `${brandContext}

${realDataBlock}

Vous rédigez le CORPS markdown (1000 à 1300 mots) d'une landing page Guardiens pour ${city} (${department}).

Répondez UNIQUEMENT en markdown brut. PAS de JSON, PAS de \`\`\`, PAS de H1 (réservé au titre de page).

Structure EXACTE :

## Pourquoi ${city} a besoin d'une plateforme de garde de proximité
### Une ville où les animaux font partie de la famille
(paragraphe qualitatif, sans chiffre inventé)
### Les limites des pensions classiques
(paragraphe qualitatif, sans fourchette de prix inventée)
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
(intro + citez uniquement les parcs, espaces verts et lieux figurant dans DONNÉES LOCALES RÉELLES (en **gras**). Si la liste est "non disponibles", restez générique sur 3 zones sans nommer de lieu précis.)

## Propriétaires à ${city}, ce que Guardiens vous offre
(5 à 6 bénéfices en **gras** suivis de 1-2 phrases : animal chez lui, maison vivante, rencontre préalable obligatoire, aucune commission, accord de garde clair, gardiens vérifiés)

## Qui sont les gardiens à ${city}
(intro + 4 profils en **gras** : retraités actifs, jeunes actifs en télétravail, familles, étudiants vérifiés. Mentionnez les [petites missions](/petites-missions) pour les gardes courtes.)

## Combien ça coûte à ${city}
(un paragraphe factuel : Guardiens est gratuit pour les propriétaires et pour les gardiens aujourd'hui, sans engagement, aucune commission par garde. Lien [tarifs](/tarifs). AUCUN montant, AUCUNE date.)

## Notre histoire et notre engagement à ${city}
(2-3 paragraphes : fondation Jérémie & Elisa, 37 maisons et 234 animaux en 5 ans, déploiement en France, ${city} intégrée au maillage. AUCUNE date de lancement inventée.)

## Questions fréquentes des propriétaires à ${city}
(5 à 6 questions au format **Question ?** + réponse 2-3 phrases : rencontre préalable, urgence, animaux à besoins spécifiques, durée min/max, vérification d'identité, sécurité du logement. Aucune question sur les prix d'abonnement ou une date de fin de gratuité.)`;

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
    const wiki = coverIn ? null : await fetchWikipediaImage(city);
    const finalCover = coverIn || wiki?.url || existing?.cover_image_url || null;
    const finalAlt = altIn || wiki?.alt || existing?.hero_image_alt || (finalCover ? `Vue de ${city}` : null);

    // Une page n'est indexable que si la ville a >= 1 gardien Guardiens ET
    // que le contenu est valide (>200 car.). Sinon on la garde publiée mais
    // noindex (accessible mais hors index Google).
    const contentIsValid = hasValidContent || (typeof existing?.content === "string" && existing.content.trim().length > 200);
    const noindex = realSitterCount === 0 || !contentIsValid;

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
      cover_image_url: finalCover,
      hero_image_alt: finalAlt,
      sitter_count: realSitterCount,
      active_sits_count: realActiveSitsCount,
      noindex,
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
        .insert(record)
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
