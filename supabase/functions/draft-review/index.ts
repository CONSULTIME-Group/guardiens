// Alma Pass 1 — Chantier 8.4
// Génère un brouillon d'avis post-garde, citant 1 anecdote factuelle du fil.
// Entrée : { sit_id, conversation_id, sub_ratings, badge_choices? }
// Sortie : { draft: string, warnings: string[] }
// Rate limit : 3/h. Persona selon rôle (owner vouvoiement, sitter tutoiement dans l'accroche coach ; l'avis lui-même reste au vouvoiement).

import { callLovableAI, extractToolArgs, STYLE_GUARDRAILS, CORS_HEADERS } from "../_shared/ai-gateway.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const RATE_LIMIT_PER_HOUR = 3;
const PROSCRIBED = /(voisin(e|s|age)?|auvergne-rhône-alpes|\bAURA\b)/i;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS_HEADERS });

  try {
    const { sit_id, conversation_id, sub_ratings, badge_choices } = await req.json().catch(() => ({}));
    if (typeof sit_id !== "string" || typeof conversation_id !== "string") {
      return json({ error: "sit_id et conversation_id requis" }, 400);
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } }, auth: { persistSession: false, autoRefreshToken: false } },
    );
    const { data: u, error: ue } = await supabase.auth.getUser();
    if (ue || !u?.user) return json({ error: "Unauthorized" }, 401);
    const userId = u.user.id;

    const oneHourAgo = new Date(Date.now() - 3600_000).toISOString();
    const { count: recentCount } = await supabase
      .from("analytics_events")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("event_type", "alma_review_draft_generated")
      .gte("created_at", oneHourAgo);
    if ((recentCount ?? 0) >= RATE_LIMIT_PER_HOUR) {
      return json({ error: `Vous avez atteint la limite de ${RATE_LIMIT_PER_HOUR} générations Alma par heure.` }, 429);
    }

    const [sitRes, msgsRes, convRes] = await Promise.all([
      supabase.from("sits").select("owner_id, title, city, start_date, end_date").eq("id", sit_id).maybeSingle(),
      supabase.from("messages").select("sender_id, content, created_at").eq("conversation_id", conversation_id).order("created_at", { ascending: false }).limit(10),
      supabase.from("conversations").select("owner_id, sitter_id").eq("id", conversation_id).maybeSingle(),
    ]);
    if (!sitRes) return json({ error: "Annonce introuvable" }, 404);

    const isOwner = sitRes.owner_id === userId;
    const otherUserId = isOwner ? convRes?.sitter_id : convRes?.owner_id;
    const { data: otherProfile } = otherUserId
      ? await supabase.from("profiles").select("first_name").eq("id", otherUserId).maybeSingle()
      : { data: null } as { data: null };

    const audience: "owner" | "sitter" = isOwner ? "owner" : "sitter";
    const register = audience === "owner" ? "vouvoiement" : "tutoiement";

    const system = `Vous êtes Alma, narratrice IA de Guardiens.fr. Vous préparez un BROUILLON D'AVIS post-garde (100 à 180 mots) que la personne relira et ajustera. Utilisez le ${register} dans l'accroche coach, mais l'avis lui-même est TOUJOURS rédigé au vouvoiement (c'est un texte public qui restera lisible par la communauté).

${STYLE_GUARDRAILS}

Contraintes :
- Reprendre 1 anecdote factuelle vérifiable dans les messages fournis (photo envoyée, mot précis, moment de la garde). Si aucune anecdote n'est disponible, écrire un avis factuel sans invention.
- Refléter les sous-notes fournies (≥4 = point fort à citer, ≤3 = ne pas mentionner, jamais négatif inventé).
- Aucune information personnelle sensible (adresse, code, tel).
- Pas de signature.`;

    const payload = {
      audience,
      annonce: sitRes,
      autre_partie_prenom: otherProfile?.first_name ?? null,
      sub_ratings: sub_ratings ?? null,
      badge_choices: badge_choices ?? null,
      derniers_messages: (msgsRes.data ?? []).reverse().map((m: any) => ({
        de_moi: m.sender_id === userId,
        contenu: m.content,
      })),
    };

    const r = await callLovableAI({
      messages: [
        { role: "system", content: system },
        { role: "user", content: `Contexte :\n${JSON.stringify(payload, null, 2)}\n\nRédigez le brouillon d'avis.` },
      ],
      tools: [{
        type: "function",
        function: {
          name: "return_review",
          description: "Renvoie le brouillon d'avis.",
          parameters: {
            type: "object",
            properties: { draft: { type: "string", minLength: 200, maxLength: 1400 } },
            required: ["draft"],
            additionalProperties: false,
          },
        },
      }],
      tool_choice: { type: "function", function: { name: "return_review" } },
      temperature: 0.3,
    });

    if (!r.ok) return json({ error: r.error, code: r.code }, r.status);
    const parsed = extractToolArgs(r.data);
    if (!parsed?.draft) return json({ error: "Réponse IA invalide" }, 502);

    let draft = String(parsed.draft).replaceAll("—", ",");
    const warnings: string[] = [];
    if (PROSCRIBED.test(draft)) {
      warnings.push("Un terme sensible a été détecté et neutralisé.");
      draft = draft.replace(PROSCRIBED, "gardien");
    }

    return json({ draft, warnings });
  } catch (e) {
    console.error("draft-review error:", e);
    return json({ error: e instanceof Error ? e.message : "Erreur" }, 500);
  }
});
