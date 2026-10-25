// Modération pré-publication d'un texte (annonce, message, bio).
// Entrée : { content_type: 'sit'|'message'|'bio', text }
// Sortie : { status: 'ok'|'warning'|'block', reasons: string[], suggestion?: string,
//            rule?: AutomatedRuleId (lot J2c, présent quand status = 'block') }
// La règle permet à l'écran de citer l'article des CGU en cause (CGU 14.5).
//
// Détection combinée :
//  1) Heuristiques regex rapides (coordonnées, mot proscrit).
//  2) LLM léger pour propos hors-charte, tentative de transaction off-platform.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { callLovableAI, extractToolArgs, STYLE_GUARDRAILS, STYLE_GUARDRAILS_MESSAGING, CORS_HEADERS } from "../_shared/ai-gateway.ts";
import { AUTOMATED_RULE_IDS, type AutomatedRuleId } from "../_shared/moderation-rules.ts";
import { heuristics } from "../_shared/moderation-heuristics.ts";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Lot ERR1 : l'appel IA est borné. Au-delà, la vérification se limite aux
// heuristiques (même règle qu'un quota IA) : le 14/10/2026, un appel sans délai
// a tenu la publication d'une annonce jusqu'au plafond de 150 s (504).
export const MODERATION_AI_TIMEOUT_MS = 12_000;

function asRule(raw: unknown): AutomatedRuleId | null {
  return typeof raw === "string" && (AUTOMATED_RULE_IDS as readonly string[]).includes(raw)
    ? raw as AutomatedRuleId
    : null;
}


Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS_HEADERS });

  try {
    const { content_type, text, acting_user_id, check_postal_address } = await req.json().catch(() => ({}));
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
    // Lot E19 : appel interne d'une autre fonction (mission-quick-action, mot
    // laissé depuis un lien d'email, sans session) avec la clé de service ; le
    // membre concerné est transmis pour le journal de modération.
    const isInternalCall = authHeader === `Bearer ${SERVICE_KEY}`;
    let userId: string | null = null;
    if (isInternalCall) {
      userId = typeof acting_user_id === "string" && UUID_RE.test(acting_user_id) ? acting_user_id : null;
    } else {
      const userClient = createClient(SUPABASE_URL, SERVICE_KEY, {
        global: { headers: { Authorization: authHeader } },
        auth: { persistSession: false, autoRefreshToken: false },
      });
      const { data: userData, error: userErr } = await userClient.auth.getUser();
      userId = userData?.user?.id ?? null;
      if (userErr || !userId) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401, headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        });
      }
    }

    // 1) Heuristiques. Lot E19 : l'adresse postale est retenue seulement sur
    // demande explicite d'un appel interne (mot laissé après un coup de main) ;
    // les annonces de garde gardent leur comportement d'avant.
    const h = heuristics(text, ct, { checkPostalAddress: isInternalCall && check_postal_address === true });

    // 2) LLM (skip si texte très court)
    let llmReasons: string[] = [];
    let llmStatus: "ok" | "warning" | "block" = "ok";
    let suggestion: string | undefined;
    let llmRule: AutomatedRuleId | null = null;

    if (text.length >= 30) {
      const isPublicListing = ct === "sit";
      const rules = isPublicListing
        ? `- status :
  * "block" si propos haineux/discriminatoires, contenu sexuel, arnaque évidente, tentative explicite de paiement direct hors plateforme, coordonnées personnelles en clair (téléphone, email), ou contenu de test, fictif ou de recette interne (mentions du type test, recette, ne pas répondre, ignorer cette annonce, texte de remplissage) : cette annonce est une page publique indexée qui déclenche des notifications à des gardiens réels.
  * "warning" si ton trop commercial, vocabulaire à éviter, faute grave de ton.
  * "ok" sinon.`
        : `Contexte : il s'agit d'un message privé entre deux membres, qui organisent une garde réelle. Échanger un numéro de téléphone, un email, une adresse ou un rendez-vous fait partie de l'usage normal et ne constitue jamais un motif de signalement.
- status :
  * "block" uniquement si propos haineux/discriminatoires, contenu sexuel, arnaque évidente, ou proposition explicite de transaction financière directe entre membres (paiement, virement, espèces).
  * "warning" si propos agressifs ou vocabulaire à éviter.
  * "ok" sinon.`;

      const system = `Vous êtes modérateur d'une plateforme française de garde de maison et d'animaux entre particuliers.

${isPublicListing ? STYLE_GUARDRAILS : STYLE_GUARDRAILS_MESSAGING}

Évaluez le texte suivant et renvoyez :
${rules}
- reasons : liste courte et concrète (max 3).
- suggestion : si warning, une reformulation brève en vouvoiement. Sinon laissez vide.
- rule : si block, la catégorie de la règle en cause : "hate" (propos haineux, discriminatoires ou menaçants), "sexual" (contenu sexuel), "scam" (arnaque), "payment" (paiement ou rémunération entre membres), "contact_details" (coordonnées dans une annonce), "test_content" (contenu de test). Sinon laissez vide.`;


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
                rule: { type: "string", enum: ["hate", "sexual", "scam", "payment", "contact_details", "test_content"] },
              },
              required: ["status", "reasons"],
              additionalProperties: false,
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "return_moderation" } },
        temperature: 0.1,
        signal: AbortSignal.timeout(MODERATION_AI_TIMEOUT_MS),
      });

      if (r.ok) {
        const parsed = extractToolArgs(r.data);
        if (parsed) {
          llmStatus = parsed.status;
          llmReasons = Array.isArray(parsed.reasons) ? parsed.reasons : [];
          suggestion = parsed.suggestion?.replaceAll("—", ",") || undefined;
          llmRule = asRule(parsed.rule);
        }
      } else if (r.status === 429 || r.status === 402 || r.code === "AI_TIMEOUT") {
        // Tolérance : quota IA ou délai dépassé, on ne bloque pas l'utilisateur. Heuristiques seules.
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

    // Lot J2c : règle en cause d'un texte retenu, citée à l'écran (CGU 14.5).
    const rule = status === "block" ? (h.block ? h.rule : llmRule) ?? undefined : undefined;

    return new Response(JSON.stringify({ status, reasons: allReasons, suggestion, rule }), {
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("moderate-content error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erreur" }), {
      status: 500, headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }
});
