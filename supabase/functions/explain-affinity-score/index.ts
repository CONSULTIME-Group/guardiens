// Alma Pass 1 — Chantier 8.3
// Reformule chaque critère d'affinité en langage naturel Alma + suggestion actionnable.
// Entrée : { mode: 'sitter_view' | 'owner_view', score: number, total: number,
//           matched: [{ label }], missing: [{ label, field_to_update? }] }
// Sortie : { score, total, matched_narratives: [...], missing_narratives: [...] }
// Cache 15 min par payload (in-memory best-effort).

import { callLovableAI, extractToolArgs, STYLE_GUARDRAILS, CORS_HEADERS } from "../_shared/ai-gateway.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}

// Cache in-memory (par instance edge). TTL 15 min.
const CACHE = new Map<string, { at: number; value: unknown }>();
const CACHE_TTL_MS = 15 * 60_000;

function cacheKey(userId: string, payload: unknown) {
  return `${userId}:${JSON.stringify(payload)}`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS_HEADERS });

  try {
    const body = await req.json().catch(() => ({}));
    const { mode, score, total, matched, missing } = body ?? {};

    if (mode !== "sitter_view" && mode !== "owner_view") return json({ error: "mode invalide" }, 400);
    if (typeof score !== "number" || typeof total !== "number") return json({ error: "score/total requis" }, 400);
    if (!Array.isArray(matched) || !Array.isArray(missing)) return json({ error: "matched/missing requis" }, 400);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } }, auth: { persistSession: false, autoRefreshToken: false } },
    );
    const { data: u, error: ue } = await supabase.auth.getUser();
    if (ue || !u?.user) return json({ error: "Unauthorized" }, 401);

    const key = cacheKey(u.user.id, { mode, score, total, matched, missing });
    const cached = CACHE.get(key);
    if (cached && Date.now() - cached.at < CACHE_TTL_MS) {
      return json(cached.value);
    }

    const register = mode === "owner_view" ? "vouvoiement" : "tutoiement";
    const audience = mode === "owner_view" ? "propriétaire" : "gardien";

    const system = `Vous êtes Alma, narratrice IA de Guardiens.fr. Vous expliquez à un ${audience} son score d'affinité (${score}/${total}) en langage naturel. Utilisez le ${register}.

${STYLE_GUARDRAILS}

Contraintes :
- Pour chaque critère matché : 1 phrase courte qui célèbre factuellement le match.
- Pour chaque critère manquant : 1 phrase qui explique pourquoi ça compte + 1 suggestion actionnable concrète (verbe d'action + champ de profil concerné si fourni).
- Ton chaleureux, jamais culpabilisant.`;

    const r = await callLovableAI({
      messages: [
        { role: "system", content: system },
        { role: "user", content: `Score : ${score}/${total}\nMatched : ${JSON.stringify(matched)}\nMissing : ${JSON.stringify(missing)}` },
      ],
      tools: [{
        type: "function",
        function: {
          name: "return_explanation",
          description: "Renvoie l'explication des critères matchés et manquants.",
          parameters: {
            type: "object",
            properties: {
              matched_narratives: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    label: { type: "string" },
                    text: { type: "string", minLength: 10, maxLength: 240 },
                  },
                  required: ["label", "text"],
                  additionalProperties: false,
                },
              },
              missing_narratives: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    label: { type: "string" },
                    text: { type: "string", minLength: 10, maxLength: 240 },
                    suggestion: { type: "string", minLength: 5, maxLength: 200 },
                    field_to_update: { type: ["string", "null"] },
                  },
                  required: ["label", "text", "suggestion"],
                  additionalProperties: false,
                },
              },
            },
            required: ["matched_narratives", "missing_narratives"],
            additionalProperties: false,
          },
        },
      }],
      tool_choice: { type: "function", function: { name: "return_explanation" } },
      temperature: 0.3,
    });

    if (!r.ok) return json({ error: r.error, code: r.code }, r.status);
    const parsed = extractToolArgs(r.data);
    if (!parsed) return json({ error: "Réponse IA invalide" }, 502);

    // Nettoyage tiret cadratin
    const sanitize = (arr: any[]) => arr.map((n) => ({
      ...n,
      text: String(n.text || "").replaceAll("—", ","),
      ...(n.suggestion ? { suggestion: String(n.suggestion).replaceAll("—", ",") } : {}),
    }));

    const result = {
      score,
      total,
      matched_narratives: sanitize(parsed.matched_narratives ?? []),
      missing_narratives: sanitize(parsed.missing_narratives ?? []),
    };
    CACHE.set(key, { at: Date.now(), value: result });
    return json(result);
  } catch (e) {
    console.error("explain-affinity-score error:", e);
    return json({ error: e instanceof Error ? e.message : "Erreur" }, 500);
  }
});
