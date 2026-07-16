// Alma Pass 1 — Chantier 8.4 (patch P0 : colonnes inexistantes → contexte null → refus IA)
// Génère un brouillon d'avis post-garde, citant 1 anecdote factuelle du fil.
// Entrée : { sit_id, conversation_id, sub_ratings, badge_choices? }
// Sortie : { draft: string, warnings: string[], fallback?: boolean }
// Rate limit : 3/h.
//
// Correctif : `sits.owner_id` n'existe pas (c'est `user_id`) → l'ancien code
// passait le wrapper Postgrest complet au LLM et calculait mal `isOwner`.
// Rebâti sur `user_id` + service_role + garde-fou refus.

import { callLovableAI, extractToolArgs, STYLE_GUARDRAILS, CORS_HEADERS } from "../_shared/ai-gateway.ts";
import { isLlmRefusal, logRefusalFallback } from "../_shared/refusal-guard.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const RATE_LIMIT_PER_HOUR = 3;
const PROSCRIBED = /(voisin(e|s|age)?|auvergne-rhône-alpes|\bAURA\b)/i;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}

function buildFallback(params: {
  audience: "owner" | "sitter";
  otherFirstName?: string | null;
  sitTitle?: string | null;
  sitCity?: string | null;
}): string {
  const who = params.otherFirstName ? params.otherFirstName : (params.audience === "owner" ? "notre gardien" : "les propriétaires");
  const ctxBit = params.sitCity ? ` à ${params.sitCity}` : "";
  if (params.audience === "owner") {
    return `Nous avons été très rassurés de confier notre foyer${ctxBit} à ${who}. La communication a été fluide, les consignes bien respectées, et nos animaux ont manifestement été bien accompagnés. Nous recommandons ce gardien à d'autres membres de la communauté.`;
  }
  return `L'échange avec ${who} s'est déroulé dans la confiance du début à la fin. Les consignes étaient claires, l'accueil chaleureux, et j'ai pu prendre soin de leur foyer${ctxBit} en toute sérénité. Une belle expérience à recommander.`;
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

    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } }, auth: { persistSession: false, autoRefreshToken: false } },
    );
    const { data: u, error: ue } = await userClient.auth.getUser();
    if (ue || !u?.user) return json({ error: "Unauthorized" }, 401);
    const userId = u.user.id;

    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false, autoRefreshToken: false } },
    );

    const oneHourAgo = new Date(Date.now() - 3600_000).toISOString();
    const { count: recentCount } = await adminClient
      .from("analytics_events")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("event_type", "alma_review_draft_generated")
      .gte("created_at", oneHourAgo);
    if ((recentCount ?? 0) >= RATE_LIMIT_PER_HOUR) {
      return json({ error: `Vous avez atteint la limite de ${RATE_LIMIT_PER_HOUR} générations Alma par heure.` }, 429);
    }

    // Colonnes RÉELLES : sits.user_id (pas owner_id)
    const [sitRes, msgsRes, convRes] = await Promise.all([
      adminClient.from("sits").select("user_id, title, city, start_date, end_date").eq("id", sit_id).maybeSingle(),
      adminClient.from("messages").select("sender_id, content, created_at").eq("conversation_id", conversation_id).order("created_at", { ascending: false }).limit(10),
      adminClient.from("conversations").select("owner_id, sitter_id").eq("id", conversation_id).maybeSingle(),
    ]);

    const sit = sitRes.data;
    if (!sit) return json({ error: "Annonce introuvable" }, 404);

    const isOwner = (sit as any).user_id === userId;
    const conv = convRes.data as any;
    const otherUserId = isOwner ? conv?.sitter_id : conv?.owner_id;
    const { data: otherProfile } = otherUserId
      ? await adminClient.from("profiles").select("first_name").eq("id", otherUserId).maybeSingle()
      : { data: null as any };

    const audience: "owner" | "sitter" = isOwner ? "owner" : "sitter";
    const fallbackCtx = {
      audience,
      otherFirstName: (otherProfile as any)?.first_name ?? null,
      sitTitle: (sit as any).title ?? null,
      sitCity: (sit as any).city ?? null,
    };

    const system = `Vous êtes Alma, narratrice IA de Guardiens.fr. Vous préparez un BROUILLON D'AVIS post-garde (100 à 180 mots) que la personne relira et ajustera. L'avis est TOUJOURS rédigé au vouvoiement (texte public de la communauté).

${STYLE_GUARDRAILS}

RÈGLE ABSOLUE : vous produisez TOUJOURS un avis exploitable. Vous ne refusez jamais, vous ne demandez jamais d'informations. Si les messages sont vides, écrivez un avis factuel court sans citer d'anecdote.

Contraintes :
- Si des messages sont fournis : reprendre 1 anecdote factuelle vérifiable (photo envoyée, mot précis, moment de la garde).
- Refléter les sous-notes (>=4 = point fort à citer, <=3 = ne pas mentionner, jamais négatif inventé).
- Aucune information personnelle sensible (adresse, code, tel).
- Pas de signature.`;

    const payload = {
      audience,
      annonce: {
        titre: (sit as any).title ?? null,
        ville: (sit as any).city ?? null,
        date_debut: (sit as any).start_date ?? null,
        date_fin: (sit as any).end_date ?? null,
      },
      autre_partie_prenom: (otherProfile as any)?.first_name ?? null,
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
        { role: "user", content: `Contexte :\n${JSON.stringify(payload, null, 2)}\n\nRédigez le brouillon d'avis maintenant. Vous ne demandez rien, vous produisez directement le texte.` },
      ],
      tools: [{
        type: "function",
        function: {
          name: "return_review",
          description: "Renvoie le brouillon d'avis, prêt à être publié.",
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

    if (!r.ok) {
      if (r.status === 402 || r.status === 429) return json({ error: r.error, code: r.code }, r.status);
      const draft = buildFallback(fallbackCtx);
      return json({ draft, warnings: ["Assistant IA momentanément indisponible, brouillon générique proposé."], fallback: true });
    }

    const parsed = extractToolArgs(r.data);
    let draft = typeof parsed?.draft === "string" ? String(parsed.draft) : "";
    draft = draft.replaceAll("—", ",").replaceAll("–", "-");
    const warnings: string[] = [];
    if (PROSCRIBED.test(draft)) {
      warnings.push("Un terme sensible a été détecté et neutralisé.");
      draft = draft.replace(PROSCRIBED, "gardien");
    }

    if (isLlmRefusal(draft, 100)) {
      console.warn("draft-review: LLM refusal detected, using fallback", { userId, sit_id, raw: draft.slice(0, 120) });
      await logRefusalFallback(adminClient, {
        user_id: userId,
        surface: "alma_review_draft",
        reason: "llm_refusal",
        extra: { sit_id, audience, raw_preview: draft.slice(0, 200) },
      });
      const fb = buildFallback(fallbackCtx);
      return json({ draft: fb, warnings: ["Brouillon générique proposé, personnalisez-le avant publication."], fallback: true });
    }

    return json({ draft, warnings });
  } catch (e) {
    console.error("draft-review error:", e);
    return json({ error: e instanceof Error ? e.message : "Erreur" }, 500);
  }
});
