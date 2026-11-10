// Alma Pass 1 — Chantier 8.1 (patch P0 : colonnes inexistantes → contexte null → refus IA)
// Génère un premier message (brise-glace) pour un thread vide avec contexte sit ou mission.
// Entrée : { thread_context: { sit_id?, mission_id?, other_user_id, mode? } }
// mode « reply_application » (lot ALMA2, 10/11/2026) : réponse du propriétaire
// à une candidature reçue, à partir du mot du candidat.
// Sortie : { draft: string, warnings: string[] } ou { available: false, reason, message }
// Rate limit : 5/h. Vouvoiement absolu, quelle que soit l'audience.
//
// Correctifs :
//   - `sits.owner_id` et `small_missions.owner_id` n'existent pas (c'est
//     `user_id`) → l'ancien code lisait null silencieusement, passait le
//     wrapper au LLM et générait un refus. Corrigé + service_role.
//   - Détection refus : aucune réponse de repli rédigée, on annonce l'indisponibilité.

import { callLovableAI, extractToolArgs, STYLE_GUARDRAILS, CORS_HEADERS } from "../_shared/ai-gateway.ts";
import { DECLARED_FACTS_RULE, stripUndeclaredSlots } from "../_shared/alma-declared-facts.ts";
import { isLlmRefusal, logRefusalFallback } from "../_shared/refusal-guard.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const RATE_LIMIT_PER_HOUR = 5;
const PROSCRIBED = /(voisin(e|s|age)?|gratuit à vie|pour toujours|période d'essai|programme fondateur|auvergne-rhône-alpes|\bAURA\b)/i;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}

/**
 * Aucun texte de repli n'est renvoyé : un brouillon figé produisait le même
 * message chez tous les membres tombés sur ce chemin. En cas d'indisponibilité
 * on le dit, et la personne écrit avec ses mots.
 */
function unavailable(reason: string) {
  return json({
    available: false,
    reason,
    message: "Je n'arrive pas à vous aider à rédiger là tout de suite. Écrivez-lui avec vos mots, c'est ce qui marche le mieux.",
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS_HEADERS });

  try {
    const body = await req.json().catch(() => ({}));
    const ctx = body?.thread_context;
    if (!ctx || typeof ctx.other_user_id !== "string" || (!ctx.sit_id && !ctx.mission_id)) {
      return json({ error: "thread_context invalide (other_user_id + sit_id|mission_id requis)" }, 400);
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

    // service_role pour reconstruire le contexte (bypass RLS)
    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false, autoRefreshToken: false } },
    );

    // Rate limit
    const oneHourAgo = new Date(Date.now() - 3600_000).toISOString();
    const { count: recentCount } = await adminClient
      .from("analytics_events")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("event_type", "alma_message_opener_generated")
      .gte("created_at", oneHourAgo);
    if ((recentCount ?? 0) >= RATE_LIMIT_PER_HOUR) {
      return json({ error: `Vous avez atteint la limite de ${RATE_LIMIT_PER_HOUR} générations Alma par heure.` }, 429);
    }

    // Contexte annonce/mission chargé AVANT tout accès au profil de l'autre
    // partie : `other_user_id` vient du client, il ne peut pas être utilisé
    // pour lire un profil arbitraire (les profils sont en RLS "own or admin").
    let sitCtx: Record<string, unknown> | null = null;
    let missionCtx: Record<string, unknown> | null = null;
    let audience: "owner" | "sitter" = "sitter";
    let posterId: string | null = null;

    if (ctx.sit_id) {
      const { data: sit } = await adminClient
        .from("sits")
        .select("id, user_id, title, city, start_date, end_date, specific_expectations, owner_message")
        .eq("id", ctx.sit_id)
        .maybeSingle();
      if (!sit) return json({ error: "Annonce introuvable" }, 404);
      sitCtx = sit;
      posterId = (sit as any).user_id ?? null;
      audience = posterId === userId ? "owner" : "sitter";
    } else if (ctx.mission_id) {
      const { data: mission } = await adminClient
        .from("small_missions")
        .select("id, user_id, title, description, category")
        .eq("id", ctx.mission_id)
        .maybeSingle();
      if (!mission) return json({ error: "Mission introuvable" }, 404);
      missionCtx = mission;
      posterId = (mission as any).user_id ?? null;
      audience = posterId === userId ? "owner" : "sitter";
    }

    // Autorisation : l'autre partie doit être réellement liée à cette annonce
    // ou mission. Deux cas légitimes seulement :
    //   1. le caller contacte l'auteur de l'annonce/mission,
    //   2. le caller EST l'auteur et contacte un candidat / répondant / une
    //      personne avec qui une conversation existe déjà.
    let authorized = posterId !== null && ctx.other_user_id === posterId && userId !== posterId;

    if (!authorized && posterId === userId) {
      const counterparties = new Set<string>();
      if (ctx.sit_id) {
        const [appsRes, convRes] = await Promise.all([
          adminClient.from("applications").select("sitter_id").eq("sit_id", ctx.sit_id),
          adminClient.from("conversations").select("owner_id, sitter_id").eq("sit_id", ctx.sit_id),
        ]);
        for (const a of appsRes.data ?? []) if ((a as any).sitter_id) counterparties.add((a as any).sitter_id);
        for (const c of convRes.data ?? []) {
          if ((c as any).owner_id) counterparties.add((c as any).owner_id);
          if ((c as any).sitter_id) counterparties.add((c as any).sitter_id);
        }
      } else if (ctx.mission_id) {
        const { data: responses } = await adminClient
          .from("small_mission_responses")
          .select("responder_id")
          .eq("mission_id", ctx.mission_id);
        for (const r of responses ?? []) if ((r as any).responder_id) counterparties.add((r as any).responder_id);
      }
      counterparties.delete(userId);
      authorized = counterparties.has(ctx.other_user_id);
    }

    if (!authorized) {
      return json({ error: "Forbidden: aucun lien avec cette annonce ou mission" }, 403);
    }

    // Lot ALMA2 : réponse du propriétaire à une candidature. Seul l'auteur de
    // l'annonce y a droit, et la candidature doit exister.
    const replyMode = ctx.mode === "reply_application";
    let candidature: { message: string | null; status: string | null } | null = null;
    if (replyMode) {
      if (!ctx.sit_id || posterId !== userId) {
        return json({ error: "Forbidden: réponse réservée à l'auteur de l'annonce" }, 403);
      }
      const { data: app } = await adminClient
        .from("applications")
        .select("message, status")
        .eq("sit_id", ctx.sit_id)
        .eq("sitter_id", ctx.other_user_id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (!app) return json({ error: "Candidature introuvable" }, 404);
      candidature = {
        message: typeof (app as any).message === "string" ? String((app as any).message).slice(0, 1500) : null,
        status: (app as any).status ?? null,
      };
    }

    // Profils (lecture autorisée seulement après la vérification du lien)
    const [meRes, otherRes, mySitterRes] = await Promise.all([
      adminClient.from("profiles").select("first_name, bio, city").eq("id", userId).maybeSingle(),
      adminClient.from("profiles").select("first_name, bio, city").eq("id", ctx.other_user_id).maybeSingle(),
      adminClient.from("sitter_profiles").select("motivation, experience_years, animal_types").eq("user_id", userId).maybeSingle(),
    ]);


    const meFirstName = (meRes.data as any)?.first_name ?? null;
    const otherFirstName = (otherRes.data as any)?.first_name ?? null;
    const register = "vouvoiement";
    const replySystem = `Vous êtes Alma, compagne IA de Guardiens.fr. Le propriétaire d'une annonce de garde répond à la candidature de ${otherFirstName ?? "la personne"}. Vous rédigez SA RÉPONSE, courte (50 à 110 mots), au vouvoiement.

${STYLE_GUARDRAILS}

${DECLARED_FACTS_RULE}

RÈGLE ABSOLUE : vous produisez TOUJOURS une réponse exploitable, sans refus ni demande d'informations.

Contraintes :
- Remercier ${otherFirstName ?? "la personne"} par son prénom pour son message.
- Reprendre UN élément concret de son message ou de son profil.
- Proposer la suite : une question ouverte, ou un échange par téléphone ou en visio pour faire connaissance. Une rencontre en personne reste facultative : vous pouvez la proposer, jamais l'exiger.
- Ne promettre ni accord ni refus : la décision reste au propriétaire.
- Ton chaleureux, simple, sans superlatif.
- Ne signez pas "Alma" ni "L'IA" : c'est le message que le propriétaire enverra lui-même.`;

    const openerSystem = `Vous êtes Alma, narratrice IA de Guardiens.fr. Vous rédigez UN PREMIER MESSAGE court (60 à 120 mots) pour engager la conversation avec ${otherFirstName ?? "l'autre membre"}. Utilisez le vouvoiement, quelle que soit l'audience (jamais de tutoiement, même pour un sitter).

${STYLE_GUARDRAILS}

${DECLARED_FACTS_RULE}

RÈGLE ABSOLUE : vous produisez TOUJOURS un message exploitable, sans jamais répondre par un refus, une excuse ou une demande d'informations. Si un champ manque, vous l'ignorez.

Contraintes :
- Ton chaleureux, factuel, sans superlatif commercial.
- Se présenter en 1 phrase, mentionner UN élément concret vu dans l'annonce/mission ou le profil de l'autre partie.
- Poser 1 question ouverte.
- Ne signez pas "Alma" ni "L'IA" : c'est le message que la personne enverra elle-même.`;
    const system = replyMode ? replySystem : openerSystem;

    const userPayload = {
      audience,
      moi: {
        prenom: meFirstName,
        bio: (meRes.data as any)?.bio ?? null,
        motivation: (mySitterRes.data as any)?.motivation ?? null,
        experience: (mySitterRes.data as any)?.experience_years ?? null,
      },
      autre_partie: {
        prenom: otherFirstName,
        bio: (otherRes.data as any)?.bio ?? null,
      },
      annonce: sitCtx,
      mission: missionCtx,
      ...(candidature ? { candidature } : {}),
    };

    const r = await callLovableAI({
      messages: [
        { role: "system", content: system },
        { role: "user", content: `Contexte (certains champs peuvent être null, ignorez-les) :\n${JSON.stringify(userPayload, null, 2)}\n\n${replyMode ? "Rédigez la réponse à cette candidature." : "Rédigez le premier message."} Vous ne demandez rien, vous produisez directement le message.` },
      ],
      tools: [{
        type: "function",
        function: {
          name: "return_opener",
          description: "Renvoie le brouillon de premier message, prêt à envoyer.",
          parameters: {
            type: "object",
            properties: {
              draft: { type: "string", minLength: 50, maxLength: 900 },
            },
            required: ["draft"],
            additionalProperties: false,
          },
        },
      }],
      tool_choice: { type: "function", function: { name: "return_opener" } },
      temperature: 0.3,
    });

    if (!r.ok) {
      if (r.status === 402 || r.status === 429) return json({ error: r.error, code: r.code }, r.status);
      return unavailable("ai_unavailable");
    }

    const parsed = extractToolArgs(r.data);
    let draft = typeof parsed?.draft === "string" ? String(parsed.draft) : "";
    draft = draft.replaceAll("—", ",").replaceAll("–", "-");
    const warnings: string[] = [];
    if (PROSCRIBED.test(draft)) {
      warnings.push("Un terme sensible a été détecté et neutralisé.");
      draft = draft.replace(PROSCRIBED, "gardien");
    }

    // Lot L2 : une phrase qui cite un jour ou une heure absents du contexte est retirée.
    const stripped = stripUndeclaredSlots(draft, JSON.stringify(userPayload));
    if (stripped.removed > 0) {
      draft = stripped.text;
      warnings.push("Une précision de jour ou d'heure a été retirée : ajoutez la vôtre si vous le souhaitez.");
    }

    if (!draft.trim()) return unavailable("empty_draft");

    if (isLlmRefusal(draft)) {
      console.warn("draft-conversation-opener: LLM refusal detected, using fallback", { userId, raw: draft.slice(0, 120) });
      await logRefusalFallback(adminClient, {
        user_id: userId,
        surface: "alma_message_opener",
        reason: "llm_refusal",
        extra: { audience, mode: replyMode ? "reply_application" : "opener", has_sit: !!ctx.sit_id, has_mission: !!ctx.mission_id, raw_preview: draft.slice(0, 200) },
      });
      return unavailable("llm_refusal");
    }

    return json({ draft, warnings });
  } catch (e) {
    console.error("draft-conversation-opener error:", e);
    return json({ error: e instanceof Error ? e.message : "Erreur" }, 500);
  }
});
