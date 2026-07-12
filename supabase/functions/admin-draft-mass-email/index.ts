// Assistant IA de rédaction d'emails de masse (Guardiens).
// Utilise la passerelle Lovable AI (google/gemini-2.5-pro) avec response_format JSON.
import { requireAdminOrServiceRole } from "../_shared/require-admin.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `Vous rédigez des emails pour Guardiens, plateforme d'entraide et de house-sitting entre particuliers. Ton : chaleureux, humain, vouvoiement systématique, vocabulaire "gens du coin"/"personne de confiance" (jamais "voisin"). Interdits : tiret cadratin (—), emojis, superlatifs commerciaux, chiffres/statistiques inventés, mentions de prix ou de dates non fournis. Le CORPS doit être du texte simple avec de vrais retours à la ligne pour séparer les paragraphes, et UNIQUEMENT ces balises HTML inline autorisées : <strong> pour l'emphase, <a href="https://..."> pour les liens. PAS de <p>, <div>, <br>, PAS de markdown.`;

type Action = "generate" | "shorten" | "warmer" | "proofread" | "subjects";

interface Brief {
  objective?: string;
  audience?: string;
  tone?: string;
  key_points?: string;
}

interface Body {
  action: Action;
  brief?: Brief;
  subject?: string;
  body?: string;
}

function sanitize(text: string): string {
  return (text ?? "").replace(/—/g, ",");
}

function buildUserPrompt(payload: Body): string {
  const { action, brief, subject, body } = payload;
  const b = brief ?? {};
  const briefBlock = `Brief:
- Objectif: ${b.objective || "(non précisé)"}
- Audience: ${b.audience || "(non précisée)"}
- Ton souhaité: ${b.tone || "(par défaut Guardiens)"}
- Points clés: ${b.key_points || "(aucun)"}`;

  const currentBlock = `Sujet actuel: ${subject || "(vide)"}
Corps actuel:
${body || "(vide)"}`;

  switch (action) {
    case "generate":
      return `${briefBlock}

Rédigez un email complet. Répondez STRICTEMENT en JSON: {"subject": string (<=90 caractères), "body": string}. Aucun autre champ.`;
    case "shorten":
      return `${currentBlock}

Raccourcissez le corps sans perdre le message clé. Conservez le sujet fourni s'il n'est pas vide, sinon proposez-en un. Répondez STRICTEMENT en JSON: {"subject": string, "body": string}.`;
    case "warmer":
      return `${currentBlock}

Réécrivez le corps avec un ton plus chaleureux, plus incarné, sans en changer le sens. Conservez le sujet fourni s'il n'est pas vide. Répondez STRICTEMENT en JSON: {"subject": string, "body": string}.`;
    case "proofread":
      return `${currentBlock}

Corrigez orthographe, grammaire et ponctuation du sujet et du corps. Retirez tout tiret cadratin (—). Ne changez pas le sens. Répondez STRICTEMENT en JSON: {"subject": string, "body": string}.`;
    case "subjects":
      return `${briefBlock}

${currentBlock}

Proposez 3 objets alternatifs percutants (chacun <=90 caractères), variés dans l'angle. Répondez STRICTEMENT en JSON: {"subjects": [string, string, string]}.`;
  }
}

function extractJson(text: string): any {
  try {
    return JSON.parse(text);
  } catch {
    const match = text.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        return JSON.parse(match[0]);
      } catch {
        // fallthrough
      }
    }
    throw new Error("Réponse IA non parseable");
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const authFail = await requireAdminOrServiceRole(req, corsHeaders);
  if (authFail) return authFail;

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ error: "LOVABLE_API_KEY non configurée" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const payload = (await req.json()) as Body;
    const validActions: Action[] = ["generate", "shorten", "warmer", "proofread", "subjects"];
    if (!payload?.action || !validActions.includes(payload.action)) {
      return new Response(
        JSON.stringify({ error: "action invalide" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const userPrompt = buildUserPrompt(payload);

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-pro",
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (aiRes.status === 402) {
      return new Response(
        JSON.stringify({ error: "Crédits Lovable AI épuisés. Rechargez dans Paramètres > Plans & credits." }),
        { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    if (aiRes.status === 429) {
      return new Response(
        JSON.stringify({ error: "Trop de requêtes IA. Réessayez dans un instant." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    if (!aiRes.ok) {
      const errText = await aiRes.text();
      console.error("Lovable AI error:", aiRes.status, errText);
      return new Response(
        JSON.stringify({ error: `Erreur passerelle IA (${aiRes.status})` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const aiJson = await aiRes.json();
    const content: string = aiJson?.choices?.[0]?.message?.content ?? "";
    const parsed = extractJson(content);

    let result: Record<string, unknown> = {};
    if (payload.action === "subjects") {
      const subs = Array.isArray(parsed?.subjects) ? parsed.subjects : [];
      result = {
        subjects: subs
          .slice(0, 3)
          .map((s: unknown) => sanitize(String(s ?? "")).slice(0, 200)),
      };
    } else {
      const outSubject = sanitize(String(parsed?.subject ?? payload.subject ?? ""));
      const outBody = sanitize(String(parsed?.body ?? ""));
      result = { subject: outSubject, body: outBody };
    }

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("admin-draft-mass-email error:", err);
    const message = err instanceof Error ? err.message : "Erreur inconnue";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
