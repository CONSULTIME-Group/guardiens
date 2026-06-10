// Modération pré-publication d'un texte (annonce, message, bio).
// Entrée : { content_type: 'sit'|'message'|'bio', text }
// Sortie : { status: 'ok'|'warning'|'block', reasons: string[], suggestion?: string }
//
// Détection combinée :
//  1) Heuristiques regex rapides (coordonnées, mot proscrit).
//  2) LLM léger pour propos hors-charte, tentative de transaction off-platform.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { callLovableAI, extractToolArgs, STYLE_GUARDRAILS, CORS_HEADERS } from "../_shared/ai-gateway.ts";

const PHONE_RE = /(?:(?:\+33|0033|0)\s?[1-9](?:[\s.\-]?\d{2}){4})/g;
const EMAIL_RE = /[\w.+-]+@[\w-]+\.[\w.-]+/g;
const URL_RE = /\bhttps?:\/\/\S+/gi;
const FORBIDDEN_WORDS = /\b(voisin|voisine|voisins|voisinage)\b/gi;

type Reason = string;

function heuristics(text: string): { reasons: Reason[]; block: boolean } {
  const reasons: Reason[] = [];
  let block = false;
  if (PHONE_RE.test(text)) { reasons.push("Numéro de téléphone détecté"); block = true; }
  if (EMAIL_RE.test(text)) { reasons.push("Adresse email détectée"); block = true; }
  if (URL_RE.test(text)) { reasons.push("Lien externe détecté"); }
  if (FORBIDDEN_WORDS.test(text)) { reasons.push("Vocabulaire à éviter : « voisin »"); }
  return { reasons, block };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS_HEADERS });

  try {
    const { content_type, text } = await req.json().catch(() => ({}));
    if (typeof text !== "string" || text.trim().length === 0) {
      return new Response(JSON.stringify({ error: "text requis" }), {
        status: 400, headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }
    const ct = ["sit", "message", "bio"].includes(content_type) ? content_type : "message";

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ") || !SUPABASE_URL || !SERVICE_KEY) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }
    const userClient = createClient(SUPABASE_URL, SERVICE_KEY, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    const userId = userData?.user?.id ?? null;
    if (userErr || !userId) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    // 1) Heuristiques
    const h = heuristics(text);

    // 2) LLM (skip si texte très court)
    let llmReasons: string[] = [];
    let llmStatus: "ok" | "warning" | "block" = "ok";
    let suggestion: string | undefined;

    if (text.length >= 30) {
      const system = `Vous êtes modérateur d'une plateforme française de garde de maison et d'animaux entre particuliers.

${STYLE_GUARDRAILS}

Évaluez le texte suivant et renvoyez :
- status :
  * "block" si propos haineux/discriminatoires, contenu sexuel, arnaque évidente, tentative explicite de paiement direct hors plateforme.
  * "warning" si ton trop commercial, vocabulaire à éviter, incitation indirecte au hors-plateforme, faute grave de ton.
  * "ok" sinon.
- reasons : liste courte et concrète (max 3).
- suggestion : si warning, une reformulation brève en vouvoiement. Sinon laissez vide.`;

      const r = await callLovableAI({
        messages: [
          { role: "system", content: system },
          { role: "user", content: `type=${ct}\n\nTexte :\n"""${text.slice(0, 3000)}"""` },
        ],
        tools: [{
          type: "function",
          function: {
            name: "return_moderation",
            description: "Verdict de modération.",
            parameters: {
              type: "object",
              properties: {
                status: { type: "string", enum: ["ok", "warning", "block"] },
                reasons: { type: "array", items: { type: "string" }, maxItems: 3 },
                suggestion: { type: "string" },
              },
              required: ["status", "reasons"],
              additionalProperties: false,
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "return_moderation" } },
        temperature: 0.1,
      });

      if (r.ok) {
        const parsed = extractToolArgs(r.data);
        if (parsed) {
          llmStatus = parsed.status;
          llmReasons = Array.isArray(parsed.reasons) ? parsed.reasons : [];
          suggestion = parsed.suggestion?.replaceAll("—", ",") || undefined;
        }
      } else if (r.status === 429 || r.status === 402) {
        // Tolérance : si quota IA, on ne bloque pas l'utilisateur. Heuristiques only.
        console.warn("Moderation LLM skipped:", r.code);
      }
    }

    // Synthèse
    const allReasons = [...h.reasons, ...llmReasons];
    let status: "ok" | "warning" | "block" = "ok";
    if (h.block || llmStatus === "block") status = "block";
    else if (allReasons.length > 0 || llmStatus === "warning") status = "warning";

    // Log non bloquant
    if (userId && SUPABASE_URL && SERVICE_KEY && status !== "ok") {
      const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
        auth: { persistSession: false, autoRefreshToken: false },
      });
      await admin.from("moderation_logs").insert({
        user_id: userId,
        content_type: ct,
        status,
        reasons: allReasons,
        excerpt: text.slice(0, 500),
      }).then(({ error }) => { if (error) console.error("log error", error); });
    }

    return new Response(JSON.stringify({ status, reasons: allReasons, suggestion }), {
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("moderate-content error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erreur" }), {
      status: 500, headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }
});
