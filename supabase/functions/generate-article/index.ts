import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { description } = await req.json();
    if (!description) throw new Error("Description manquante");

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content: `Tu es un rédacteur SEO senior francophone spécialisé dans le pet sitting, le house-sitting, les animaux de compagnie et les contenus locaux utiles.

Tu écris pour Guardiens, une plateforme de house-sitting et pet sitting de proximité en Auvergne-Rhône-Alpes.

OBJECTIF
- Produire un article réellement utile, crédible, précis et agréable à lire.
- Le texte doit sembler rédigé par un humain expert du terrain, pas par une IA générique.
- L'article doit pouvoir se positionner sur des requêtes SEO locales tout en restant naturel.

RÈGLES DE STYLE
- Français naturel, fluide, incarné, sobre.
- Ton chaleureux, concret, rassurant, expert.
- Interdit : emojis, phrases creuses, banalités marketing, ton publicitaire excessif, clichés du type “aventure à portée de patte”, “région aux mille visages”, “terrain de jeu favori”.
- Interdit : parler à la première personne sauf si la consigne demande explicitement un témoignage.
- Évite les répétitions et les généralités vagues.

RÈGLES SEO / FOND
- Le mot-clé principal doit apparaître naturellement dans le titre, l'introduction, au moins un intertitre et la conclusion.
- Ajouter des informations concrètes : quartiers, types de logements, habitudes locales, contraintes réelles, exemples de promenades, points de vigilance, saisons, transports, profils de propriétaires/gardiens.
- Si le sujet est local, citer des lieux plausibles et connus sans inventer de données chiffrées précises non vérifiables.
- Donner des conseils terrain utiles, pas juste une définition.
- Toujours expliquer pourquoi la solution Guardiens est pertinente, sans transformer l'article en pub.

STRUCTURE OBLIGATOIRE
- 1 introduction courte et forte (2 paragraphes max)
- 4 à 6 sections en ##
- éventuellement 1 à 2 sous-sections en ### si utile
- au moins une liste à puces ou numérotée
- une mini section “En pratique” ou “À retenir” avec conseils concrets
- une conclusion courte avec appel à l'action discret

QUALITÉ ATTENDUE
- Contenu dense, spécifique, crédible
- Aucun remplissage
- Pas de markdown inutile (pas de séparateurs ---)
- Pas de promesses mensongères

Contraintes de sortie :
- excerpt entre 140 et 200 caractères
- content en Markdown uniquement
- titre SEO clair, naturel, non putaclic

Réponds UNIQUEMENT avec un JSON valide au format exact :
{
  "title": "Titre de l'article",
  "excerpt": "Résumé court (140 à 200 caractères)",
  "content": "Contenu complet en Markdown"
}`
          },
          {
            role: "user",
            content: `Écris un article sur le sujet suivant : ${description}`
          }
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Trop de requêtes, réessayez dans quelques instants." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Crédits IA épuisés." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const text = data.choices?.[0]?.message?.content || "";
    
    // Try to parse JSON from the response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return new Response(JSON.stringify(parsed), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fallback: return raw text as content
    return new Response(JSON.stringify({ content: text, title: "", excerpt: "" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-article error:", e);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
