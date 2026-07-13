// Assistant IA de rédaction d'emails de masse (Guardiens).
// Utilise la passerelle Lovable AI (google/gemini-2.5-pro) avec response_format JSON.
import { requireAdminOrServiceRole } from "../_shared/require-admin.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT_EMAIL = `Vous rédigez des emails pour Guardiens, plateforme d'entraide et de house-sitting entre particuliers. Ton : chaleureux, humain, vouvoiement systématique, vocabulaire "gens du coin"/"personne de confiance" (jamais "voisin"). Interdits : tiret cadratin (—), emojis, superlatifs commerciaux, chiffres/statistiques inventés, mentions de prix ou de dates non fournis. Le CORPS doit être du texte simple avec de vrais retours à la ligne pour séparer les paragraphes, et UNIQUEMENT ces balises HTML inline autorisées : <strong> pour l'emphase, <a href="https://..."> pour les liens. PAS de <p>, <div>, <br>, PAS de markdown.`;

const SYSTEM_PROMPT_MESSAGE = `Vous rédigez un message 1:1 envoyé par un admin Guardiens à un utilisateur via la messagerie interne. Ton : chaleureux, humain, vouvoiement systématique, vocabulaire "gens du coin"/"personne de confiance" (jamais "voisin"). Interdits : tiret cadratin (—), emojis, superlatifs commerciaux, chiffres/statistiques inventés, mentions de prix ou de dates non fournis. Le message doit être en TEXTE BRUT uniquement, avec de vrais retours à la ligne pour séparer les paragraphes. AUCUNE balise HTML, AUCUN markdown, AUCUN objet/sujet.`;

type Action = "generate" | "shorten" | "warmer" | "proofread" | "subjects";
type Format = "email" | "message";

interface Brief {
  objective?: string;
  audience?: string;
  tone?: string;
  key_points?: string;
}

interface Body {
  action: Action;
  format?: Format;
  brief?: Brief;
  subject?: string;
  body?: string;
}

function sanitize(text: string): string {
  return (text ?? "").replace(/—/g, ",");
}

function stripHtml(text: string): string {
  return (text ?? "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|li)>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function buildUserPromptEmail(payload: Body): string {
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

function buildUserPromptMessage(payload: Body): string {
  const { action, brief, body } = payload;
  const b = brief ?? {};
  const briefBlock = `Brief:
- Objectif: ${b.objective || "(non précisé)"}
- Destinataire: ${b.audience || "(non précisé)"}
- Ton souhaité: ${b.tone || "(par défaut Guardiens)"}
- Points clés: ${b.key_points || "(aucun)"}`;

  const currentBlock = `Message actuel:
${body || "(vide)"}`;

  switch (action) {
    case "generate":
      return `${briefBlock}

Rédigez le message en texte brut. Répondez STRICTEMENT en JSON: {"body": string}. Aucun autre champ.`;
    case "shorten":
      return `${currentBlock}

Raccourcissez le message sans perdre le sens. Répondez STRICTEMENT en JSON: {"body": string}.`;
    case "warmer":
      return `${currentBlock}

Réécrivez le message avec un ton plus chaleureux, plus incarné, sans en changer le sens. Répondez STRICTEMENT en JSON: {"body": string}.`;
    case "proofread":
      return `${currentBlock}

Corrigez orthographe, grammaire et ponctuation. Retirez tout tiret cadratin (—). Ne changez pas le sens. Répondez STRICTEMENT en JSON: {"body": string}.`;
    case "subjects":
      // Non applicable en format message; renvoyer un JSON vide, géré côté handler.
      return `${currentBlock}

Le format "message" n'a pas d'objet. Répondez STRICTEMENT en JSON: {"body": ""}.`;
  }
}

function extractJson(text: string): any {
  const cleaned = (text ?? "")
    .replace(/^\uFEFF/, "")
    .replace(/```(?:json)?\s*/gi, "")
    .replace(/```/g, "")
    .trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    const start = cleaned.indexOf("{");
    if (start !== -1) {
      let depth = 0;
      let inStr = false;
      let esc = false;
      for (let i = start; i < cleaned.length; i++) {
        const c = cleaned[i];
        if (inStr) {
          if (esc) esc = false;
          else if (c === "\\") esc = true;
          else if (c === '"') inStr = false;
        } else {
          if (c === '"') inStr = true;
          else if (c === "{") depth++;
          else if (c === "}") {
            depth--;
            if (depth === 0) {
              const candidate = cleaned.slice(start, i + 1);
              try { return JSON.parse(candidate); } catch { break; }
            }
          }
        }
      }
    }
    // Fallback : renvoie le texte brut comme body pour préserver l'UX
    return { body: cleaned, subject: "" };
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

    const format: Format = payload.format === "message" ? "message" : "email";

    // subjects reste réservé au format email
    if (format === "message" && payload.action === "subjects") {
      return new Response(
        JSON.stringify({ error: "action 'subjects' non disponible en format 'message'" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const systemPrompt = format === "message" ? SYSTEM_PROMPT_MESSAGE : SYSTEM_PROMPT_EMAIL;
    const userPrompt = format === "message" ? buildUserPromptMessage(payload) : buildUserPromptEmail(payload);

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
          { role: "system", content: systemPrompt },
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
    if (format === "message") {
      const outBody = sanitize(stripHtml(String(parsed?.body ?? "")));
      result = { body: outBody };
    } else if (payload.action === "subjects") {
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
