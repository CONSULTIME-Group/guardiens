// Génère 3 brouillons de bio gardien à partir de 5 questions courtes.
// Entrée : { answers: { experience, animals, motivation, availability, style? } }
// Sortie : { drafts: [{ tone, text }, ...] }

import { callLovableAI, extractToolArgs, STYLE_GUARDRAILS, CORS_HEADERS } from "../_shared/ai-gateway.ts";
import { isLlmRefusal } from "../_shared/refusal-guard.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS_HEADERS });

  try {
    const { answers } = await req.json().catch(() => ({}));
    if (!answers || typeof answers !== "object") {
      return new Response(JSON.stringify({ error: "answers requis" }), {
        status: 400, headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } }, auth: { persistSession: false, autoRefreshToken: false } },
    );
    const { data: u, error: ue } = await supabase.auth.getUser();
    if (ue || !u?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    const system = `Vous rédigez la bio publique d'un futur gardien d'animaux et de maison.

${STYLE_GUARDRAILS}

RÈGLE ABSOLUE : vous produisez TOUJOURS les 3 brouillons demandés. Vous ne refusez jamais, vous ne demandez jamais d'informations. Si les réponses fournies sont pauvres, appuyez-vous strictement sur ce qui est fourni.

Mission :
- Produire 3 brouillons distincts : "chaleureux", "professionnel", "concis".
- Chaque brouillon fait 350 à 700 caractères, paragraphe unique, lisible.
- Vous appuyer EXCLUSIVEMENT sur les réponses fournies. Aucune invention factuelle (pas d'années d'expérience non données, pas d'animaux non cités).
- Mettre en avant le rapport aux animaux, l'expérience concrète, la fiabilité.`;

    const r = await callLovableAI({
      messages: [
        { role: "system", content: system },
        { role: "user", content: `Voici les réponses du gardien :\n${JSON.stringify(answers, null, 2)}\n\nRédigez les 3 brouillons.` },
      ],
      tools: [{
        type: "function",
        function: {
          name: "return_bio_drafts",
          description: "Renvoie 3 brouillons de bio.",
          parameters: {
            type: "object",
            properties: {
              drafts: {
                type: "array",
                minItems: 3,
                maxItems: 3,
                items: {
                  type: "object",
                  properties: {
                    tone: { type: "string", enum: ["chaleureux", "professionnel", "concis"] },
                    text: { type: "string", minLength: 200, maxLength: 800 },
                  },
                  required: ["tone", "text"],
                  additionalProperties: false,
                },
              },
            },
            required: ["drafts"],
            additionalProperties: false,
          },
        },
      }],
      tool_choice: { type: "function", function: { name: "return_bio_drafts" } },
      temperature: 0.7,
    });

    if (!r.ok) {
      return new Response(JSON.stringify({ error: r.error, code: r.code }), {
        status: r.status, headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }
    const parsed = extractToolArgs(r.data);
    if (!parsed?.drafts) {
      return new Response(JSON.stringify({ error: "Réponse IA invalide" }), {
        status: 502, headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }
    parsed.drafts = parsed.drafts.map((d: any) => ({
      tone: d.tone,
      text: String(d.text || "").replaceAll("—", ","),
    }));

    return new Response(JSON.stringify(parsed), {
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-bio-drafts error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erreur" }), {
      status: 500, headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }
});
