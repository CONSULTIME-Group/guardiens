// Alma Pass 1 — Chantier 8.1
// Génère un premier message (brise-glace) pour un thread vide avec contexte sit ou mission.
// Entrée : { thread_context: { sit_id?, mission_id?, other_user_id } }
// Sortie : { draft: string, warnings: string[] }
// Rate limit : 5/h. Vouvoiement pour owner, tutoiement pour sitter.

import { callLovableAI, extractToolArgs, STYLE_GUARDRAILS, CORS_HEADERS } from "../_shared/ai-gateway.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const RATE_LIMIT_PER_HOUR = 5;
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
    const body = await req.json().catch(() => ({}));
    const ctx = body?.thread_context;
    if (!ctx || typeof ctx.other_user_id !== "string" || (!ctx.sit_id && !ctx.mission_id)) {
      return json({ error: "thread_context invalide (other_user_id + sit_id|mission_id requis)" }, 400);
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

    // Rate limit via analytics_events
    const oneHourAgo = new Date(Date.now() - 3600_000).toISOString();
    const { count: recentCount } = await supabase
      .from("analytics_events")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("event_type", "alma_message_opener_generated")
      .gte("created_at", oneHourAgo);
    if ((recentCount ?? 0) >= RATE_LIMIT_PER_HOUR) {
      return json({ error: `Vous avez atteint la limite de ${RATE_LIMIT_PER_HOUR} générations Alma par heure.` }, 429);
    }

    // Récupérer profils, annonce ou mission
    const [meRes, otherRes, mySitterRes] = await Promise.all([
      supabase.from("profiles").select("first_name, bio, city").eq("id", userId).maybeSingle(),
      supabase.from("profiles").select("first_name, bio, city").eq("id", ctx.other_user_id).maybeSingle(),
      supabase.from("sitter_profiles").select("motivation, experience_years, animal_types").eq("user_id", userId).maybeSingle(),
    ]);

    let sitCtx: Record<string, unknown> | null = null;
    let missionCtx: Record<string, unknown> | null = null;
    let audience: "owner" | "sitter" = "sitter";

    if (ctx.sit_id) {
      const { data: sit } = await supabase
        .from("sits")
        .select("id, owner_id, title, city, start_date, end_date, specific_expectations, owner_message")
        .eq("id", ctx.sit_id)
        .maybeSingle();
      sitCtx = sit;
      // Si l'utilisateur est owner de ce sit, il rédige côté owner. Sinon il candidate (sitter).
      audience = sit?.owner_id === userId ? "owner" : "sitter";
    } else if (ctx.mission_id) {
      const { data: mission } = await supabase
        .from("small_missions")
        .select("id, owner_id, title, description, category")
        .eq("id", ctx.mission_id)
        .maybeSingle();
      missionCtx = mission;
      audience = mission?.owner_id === userId ? "owner" : "sitter";
    }

    const register = audience === "owner" ? "vouvoiement" : "tutoiement";
    const system = `Vous êtes Alma, narratrice IA de Guardiens.fr. Vous rédigez UN PREMIER MESSAGE court (60 à 120 mots) pour engager la conversation avec ${otherRes?.first_name ?? "l'autre membre"}. Utilisez le ${register}.

${STYLE_GUARDRAILS}

Contraintes :
- Ton chaleureux, factuel, sans superlatif commercial.
- Se présenter en 1 phrase, mentionner UN élément concret vu dans l'annonce/mission ou le profil de l'autre partie.
- Poser 1 question ouverte pour appeler la réponse.
- Ne signez pas "Alma" ni "L'IA" : c'est le message que la personne enverra elle-même.
- Ne mentez pas sur l'expérience de l'utilisateur : appuyez-vous uniquement sur les données fournies.`;

    const userPayload = {
      audience,
      moi: {
        prenom: meRes?.first_name ?? null,
        bio: meRes?.bio ?? null,
        motivation: mySitterRes?.motivation ?? null,
        experience: mySitterRes?.experience_years ?? null,
      },
      autre_partie: {
        prenom: otherRes?.first_name ?? null,
        bio: otherRes?.bio ?? null,
      },
      annonce: sitCtx,
      mission: missionCtx,
    };

    const r = await callLovableAI({
      messages: [
        { role: "system", content: system },
        { role: "user", content: `Contexte :\n${JSON.stringify(userPayload, null, 2)}\n\nRédigez le premier message.` },
      ],
      tools: [{
        type: "function",
        function: {
          name: "return_opener",
          description: "Renvoie le brouillon de premier message.",
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
      return json({ error: r.error, code: r.code }, r.status);
    }
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
    console.error("draft-conversation-opener error:", e);
    return json({ error: e instanceof Error ? e.message : "Erreur" }, 500);
  }
});
