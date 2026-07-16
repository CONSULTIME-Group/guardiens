// Alma Pass 1 — Chantier 8.1 (patch P0 : colonnes inexistantes → contexte null → refus IA)
// Génère un premier message (brise-glace) pour un thread vide avec contexte sit ou mission.
// Entrée : { thread_context: { sit_id?, mission_id?, other_user_id } }
// Sortie : { draft: string, warnings: string[], fallback?: boolean }
// Rate limit : 5/h. Vouvoiement pour owner, tutoiement pour sitter (accroche).
//
// Correctifs :
//   - `sits.owner_id` et `small_missions.owner_id` n'existent pas (c'est
//     `user_id`) → l'ancien code lisait null silencieusement, passait le
//     wrapper au LLM et générait un refus. Corrigé + service_role.
//   - Détection refus + fallback statique par public/audience.

import { callLovableAI, extractToolArgs, STYLE_GUARDRAILS, CORS_HEADERS } from "../_shared/ai-gateway.ts";
import { isLlmRefusal, logRefusalFallback } from "../_shared/refusal-guard.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const RATE_LIMIT_PER_HOUR = 5;
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
  meFirstName?: string | null;
  sitTitle?: string | null;
  sitCity?: string | null;
  missionTitle?: string | null;
}): string {
  const salut = `Bonjour${params.otherFirstName ? ` ${params.otherFirstName}` : ""},`;
  const refObj = params.sitTitle
    ? `votre annonce${params.sitCity ? ` à ${params.sitCity}` : ""}`
    : params.missionTitle
      ? "votre demande d'entraide"
      : "votre profil";
  const lead = params.audience === "owner"
    ? `Je découvre ${refObj} et je pense que vous pourriez rejoindre notre cercle de confiance pour cette période.`
    : `Je découvre ${refObj} et je serais heureux d'en discuter avec vous.`;
  const q = params.audience === "owner"
    ? "Souhaitez-vous que je vous en dise plus sur notre foyer et nos animaux ?"
    : "Seriez-vous disponible pour un premier échange, par message ou en visio ?";
  return [salut, "", lead, "", q, "", "Belle journée,"].join("\n");
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

    // Profils + contexte annonce/mission (colonnes RÉELLES : user_id, pas owner_id)
    const [meRes, otherRes, mySitterRes] = await Promise.all([
      adminClient.from("profiles").select("first_name, bio, city").eq("id", userId).maybeSingle(),
      adminClient.from("profiles").select("first_name, bio, city").eq("id", ctx.other_user_id).maybeSingle(),
      adminClient.from("sitter_profiles").select("motivation, experience_years, animal_types").eq("user_id", userId).maybeSingle(),
    ]);

    let sitCtx: Record<string, unknown> | null = null;
    let missionCtx: Record<string, unknown> | null = null;
    let audience: "owner" | "sitter" = "sitter";

    if (ctx.sit_id) {
      const { data: sit } = await adminClient
        .from("sits")
        .select("id, user_id, title, city, start_date, end_date, specific_expectations, owner_message")
        .eq("id", ctx.sit_id)
        .maybeSingle();
      sitCtx = sit;
      audience = sit?.user_id === userId ? "owner" : "sitter";
    } else if (ctx.mission_id) {
      const { data: mission } = await adminClient
        .from("small_missions")
        .select("id, user_id, title, description, category")
        .eq("id", ctx.mission_id)
        .maybeSingle();
      missionCtx = mission;
      audience = mission?.user_id === userId ? "owner" : "sitter";
    }

    const meFirstName = (meRes.data as any)?.first_name ?? null;
    const otherFirstName = (otherRes.data as any)?.first_name ?? null;
    const fallbackCtx = {
      audience,
      otherFirstName,
      meFirstName,
      sitTitle: (sitCtx as any)?.title ?? null,
      sitCity: (sitCtx as any)?.city ?? null,
      missionTitle: (missionCtx as any)?.title ?? null,
    };

    const register = audience === "owner" ? "vouvoiement" : "tutoiement";
    const system = `Vous êtes Alma, narratrice IA de Guardiens.fr. Vous rédigez UN PREMIER MESSAGE court (60 à 120 mots) pour engager la conversation avec ${otherFirstName ?? "l'autre membre"}. Utilisez le ${register}.

${STYLE_GUARDRAILS}

RÈGLE ABSOLUE : vous produisez TOUJOURS un message exploitable, sans jamais répondre par un refus, une excuse ou une demande d'informations. Si un champ manque, vous l'ignorez.

Contraintes :
- Ton chaleureux, factuel, sans superlatif commercial.
- Se présenter en 1 phrase, mentionner UN élément concret vu dans l'annonce/mission ou le profil de l'autre partie.
- Poser 1 question ouverte.
- Ne signez pas "Alma" ni "L'IA" : c'est le message que la personne enverra elle-même.`;

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
    };

    const r = await callLovableAI({
      messages: [
        { role: "system", content: system },
        { role: "user", content: `Contexte (certains champs peuvent être null, ignorez-les) :\n${JSON.stringify(userPayload, null, 2)}\n\nRédigez le premier message. Vous ne demandez rien, vous produisez directement le message.` },
      ],
      tools: [{
        type: "function",
        function: {
          name: "return_opener",
          description: "Renvoie le brouillon de premier message, prêt à envoyer.",
          parameters: {
            type: "object",
            properties: {
              draft: { type: "string", minLength: 60, maxLength: 900 },
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

    if (isLlmRefusal(draft)) {
      console.warn("draft-conversation-opener: LLM refusal detected, using fallback", { userId, raw: draft.slice(0, 120) });
      await logRefusalFallback(adminClient, {
        user_id: userId,
        surface: "alma_message_opener",
        reason: "llm_refusal",
        extra: { audience, has_sit: !!ctx.sit_id, has_mission: !!ctx.mission_id, raw_preview: draft.slice(0, 200) },
      });
      const fb = buildFallback(fallbackCtx);
      return json({ draft: fb, warnings: ["Brouillon générique proposé, personnalisez-le avant envoi."], fallback: true });
    }

    return json({ draft, warnings });
  } catch (e) {
    console.error("draft-conversation-opener error:", e);
    return json({ error: e instanceof Error ? e.message : "Erreur" }, 500);
  }
});
