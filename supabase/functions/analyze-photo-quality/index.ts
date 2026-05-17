// Analyse la qualité d'une photo de logement via Lovable AI (vision).
// Retourne un score 0-100, une liste de défauts détectés et des suggestions.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { imageUrl } = await req.json();
    if (!imageUrl) {
      return new Response(JSON.stringify({ error: "imageUrl requis" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY manquant");

    const systemPrompt = `Vous évaluez des photos de couverture d'annonces de garde de maison/animaux.

Objectif : choisir LA photo qui donne le plus envie à un gardien de candidater. La pertinence éditoriale compte BIEN PLUS que la qualité technique pure.

Hiérarchie de scoring (sur 100) :
- 85-100 : animal de compagnie visible (chien, chat, NAC) dans un cadre chaleureux, OU intérieur de vie accueillant (salon, cuisine, terrasse habitée, jardin verdoyant), OU extérieur charmant de la maison.
- 60-84 : pièce correcte mais peu chaleureuse, jardin neutre, façade soignée.
- 30-59 : photo hors-sujet bien cadrée (objet, paysage lointain, véhicule, détail technique).
- 0-29 : photo manifestement inappropriée (selfie/portrait humain frontal, scène privée, rue grise, photo floue/sombre, capture d'écran, document).

Pénalisez fortement (max 40) : visages humains en gros plan, photos de personnes posant, véhicules, rues/parkings, photos administratives.
Bonus implicite : présence d'animal, lumière naturelle, atmosphère « comme à la maison ».

La qualité technique (netteté, exposition) ne départage qu'à pertinence éditoriale égale.

Utilisez le vouvoiement, soyez concret, court, bienveillant.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Évaluez cette photo en tant que candidate à la couverture d'une annonce de garde de maison/animaux. Privilégiez fortement la présence d'un animal et/ou d'un intérieur accueillant plutôt que la seule qualité technique. Notez de 0 à 100, listez les défauts visibles, et proposez 1 à 3 corrections concrètes en vouvoiement.",
              },
              { type: "image_url", image_url: { url: imageUrl } },
            ],
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "report_photo_quality",
              description: "Renvoie l'évaluation de la photo.",
              parameters: {
                type: "object",
                properties: {
                  score: {
                    type: "integer",
                    minimum: 0,
                    maximum: 100,
                    description: "Score global de 0 (mauvais) à 100 (excellent).",
                  },
                  verdict: {
                    type: "string",
                    enum: ["excellent", "bon", "moyen", "faible"],
                  },
                  issues: {
                    type: "array",
                    description: "Défauts détectés parmi : flou, sombre, surexposée, trop_loin, cadrage_serré, désordre, vide, mauvaise_perspective, basse_résolution, hors_sujet.",
                    items: {
                      type: "string",
                      enum: [
                        "flou",
                        "sombre",
                        "surexposée",
                        "trop_loin",
                        "cadrage_serré",
                        "désordre",
                        "vide",
                        "mauvaise_perspective",
                        "basse_résolution",
                        "hors_sujet",
                      ],
                    },
                  },
                  suggestions: {
                    type: "array",
                    description: "1 à 3 conseils concrets en vouvoiement.",
                    items: { type: "string" },
                    minItems: 1,
                    maxItems: 3,
                  },
                  summary: {
                    type: "string",
                    description: "Une phrase résumant l'évaluation, en vouvoiement.",
                  },
                },
                required: ["score", "verdict", "issues", "suggestions", "summary"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "report_photo_quality" } },
      }),
    });

    if (response.status === 429) {
      return new Response(JSON.stringify({ error: "Trop de requêtes, réessayez dans un instant." }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (response.status === 402) {
      return new Response(JSON.stringify({ error: "Crédits IA épuisés, ajoutez des fonds à votre espace Lovable." }), {
        status: 402,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!response.ok) {
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "Analyse indisponible" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      return new Response(JSON.stringify({ error: "Réponse IA invalide" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const result = JSON.parse(toolCall.function.arguments);
    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("analyze-photo-quality error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Erreur inconnue" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
