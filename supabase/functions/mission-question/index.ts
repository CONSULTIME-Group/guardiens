/**
 * mission-question (lot E24, 26/10/2026)
 * -------------------------------------------------------------------------
 * Une question se pose sur la fiche d'un besoin et se lit par tous ; l'auteur
 * du besoin y répond sous la question. Seule voie d'écriture de
 * public.mission_questions (aucun droit d'écriture pour les membres).
 *
 * POST { action: "ask", mission_id, body }
 * POST { action: "answer", question_id, answer }
 *
 * Appel d'un membre connecté (jeton de session). Garde-fous : compte actif,
 * besoin ouvert et visible hors projet participatif, l'auteur répond et ne
 * pose pas de question sur son propre besoin, 3 questions par personne et par
 * besoin, 10 par 24 heures (recomptés sous verrou par insert_mission_question),
 * aucune question entre deux membres dont l'un a bloqué l'autre, modération
 * avant enregistrement (règles pures dans _shared/mission-question.ts). Notification et email à l'auteur pour une
 * question, à la personne qui l'a posée pour la réponse.
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import {
  QUESTIONS_PER_DAY_MAX,
  QUESTIONS_PER_MISSION_MAX,
  checkAnswer,
  checkQuestion,
  missionAcceptsQuestions,
  missionHasQuestions,
  missionQuestionsPath,
  moderatePublicText,
  questionErrorMessage,
  questionFirstName,
} from "../_shared/mission-question.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const refuse = (reason: string, status = 422) => json({ ok: false, reason, message: questionErrorMessage(reason) }, status);

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const isUuid = (v: unknown): v is string =>
  typeof v === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ ok: false, reason: "method_not_allowed" }, 405);

  const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (!token || token === SERVICE_KEY) return json({ ok: false, reason: "unauthorized" }, 401);
  const anon = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: false } });
  const { data: u } = await anon.auth.getUser(token);
  const userId = u?.user?.id ?? null;
  if (!userId) return json({ ok: false, reason: "unauthorized" }, 401);

  const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

  const { data: me } = await admin
    .from("profiles")
    .select("id, first_name, account_status")
    .eq("id", userId)
    .maybeSingle();
  if (!me || me.account_status !== "active") return refuse("account_inactive", 403);

  const payload = await req.json().catch(() => ({}));
  const action = payload?.action;

  try {
    if (action === "ask") return await ask(admin, userId, me.first_name, payload);
    if (action === "answer") return await answer(admin, userId, me.first_name, payload);
    return json({ ok: false, reason: "invalid_action" }, 400);
  } catch (e) {
    console.error("[mission-question]", e instanceof Error ? e.message : String(e));
    return refuse("unexpected", 500);
  }
});

async function ask(admin: any, userId: string, myFirstName: string | null, payload: any) {
  if (!isUuid(payload?.mission_id)) return json({ ok: false, reason: "invalid_mission" }, 400);
  const check = checkQuestion(payload?.body);
  if (!check.ok) return refuse(check.reason, 400);

  const { data: mission } = await admin
    .from("small_missions")
    .select("id, user_id, title, status, category, mission_type, hidden_at, moderation_hidden_at")
    .eq("id", payload.mission_id)
    .maybeSingle();
  if (!missionAcceptsQuestions(mission)) return refuse("mission_closed");
  if (mission.user_id === userId) return refuse("own_mission");

  // Un blocage, dans un sens ou dans l'autre, ferme la question (réponse neutre).
  const { count: blocks } = await admin
    .from("blocked_users")
    .select("id", { count: "exact", head: true })
    .or(`and(blocker_id.eq.${mission.user_id},blocked_id.eq.${userId}),and(blocker_id.eq.${userId},blocked_id.eq.${mission.user_id})`);
  if ((blocks ?? 0) > 0) return refuse("mission_closed");

  // Lecture rapide des plafonds, avant la modération ; ils sont recomptés sous
  // verrou à l'enregistrement.
  const { count: onMission } = await admin
    .from("mission_questions")
    .select("id", { count: "exact", head: true })
    .eq("mission_id", mission.id)
    .eq("asker_id", userId);
  if ((onMission ?? 0) >= QUESTIONS_PER_MISSION_MAX) return refuse("limit_mission", 429);

  const mod = await moderatePublicText(check.text, { supabaseUrl: SUPABASE_URL, serviceKey: SERVICE_KEY, actingUserId: userId });
  if (mod.verdict === "refused") return refuse(mod.rule === "contact_details" ? "contact_details" : "refused");

  const { data: newId, error } = await admin.rpc("insert_mission_question", {
    p_mission_id: mission.id,
    p_asker_id: userId,
    p_body: check.text,
    p_moderation: mod.verdict,
    p_per_mission: QUESTIONS_PER_MISSION_MAX,
    p_per_day: QUESTIONS_PER_DAY_MAX,
  });
  if (error) {
    if (String(error.message).includes("limit_mission")) return refuse("limit_mission", 429);
    if (String(error.message).includes("limit_day")) return refuse("limit_day", 429);
    throw new Error(error.message);
  }
  if (typeof newId !== "string") throw new Error("insert_failed");
  const row = { id: newId };

  const askerFirstName = questionFirstName(myFirstName) || "Un membre";
  await notify(admin, {
    userId: mission.user_id,
    type: "mission_question",
    title: "Une question sur votre besoin",
    body: `${askerFirstName} a posé une question sur « ${mission.title} ».`,
    link: missionQuestionsPath(mission.id),
    actorName: askerFirstName,
    template: "mission-question-received",
    templateData: { askerFirstName, missionTitle: mission.title, missionId: mission.id, question: check.text },
    idempotencyKey: `mission-question-received-${row.id}`,
  });

  return json({ ok: true, id: row.id, is_public: mod.verdict === "ok" });
}

async function answer(admin: any, userId: string, myFirstName: string | null, payload: any) {
  if (!isUuid(payload?.question_id)) return json({ ok: false, reason: "invalid_question" }, 400);
  const check = checkAnswer(payload?.answer);
  if (!check.ok) return refuse(check.reason, 400);

  const { data: q } = await admin
    .from("mission_questions")
    .select("id, asker_id, body, answer, hidden_at, mission:small_missions(id, user_id, title, status, category, mission_type, hidden_at, moderation_hidden_at)")
    .eq("id", payload.question_id)
    .maybeSingle();
  const mission = q?.mission;
  if (!q || q.hidden_at || !mission || mission.user_id !== userId) return json({ ok: false, reason: "forbidden" }, 403);
  if (!missionHasQuestions(mission)) return refuse("mission_closed");
  if (q.answer) return refuse("already_answered", 409);

  const mod = await moderatePublicText(check.text, { supabaseUrl: SUPABASE_URL, serviceKey: SERVICE_KEY, actingUserId: userId });
  if (mod.verdict === "refused") return refuse(mod.rule === "contact_details" ? "contact_details" : "refused");

  const { data: updated, error } = await admin
    .from("mission_questions")
    .update({ answer: check.text, answer_moderation: mod.verdict, answered_at: new Date().toISOString() })
    .eq("id", q.id)
    .is("answer", null)
    .select("id");
  if (error) throw new Error(error.message);
  if (!updated || updated.length === 0) return refuse("already_answered", 409);

  const authorFirstName = questionFirstName(myFirstName) || "L'auteur";
  await notify(admin, {
    userId: q.asker_id,
    type: "mission_question_answered",
    title: "Réponse à votre question",
    body: `${authorFirstName} a répondu à votre question sur « ${mission.title} ».`,
    link: missionQuestionsPath(mission.id),
    actorName: authorFirstName,
    template: "mission-question-answered",
    templateData: { authorFirstName, missionTitle: mission.title, missionId: mission.id, question: q.body, answer: check.text },
    idempotencyKey: `mission-question-answered-${q.id}`,
  });

  return json({ ok: true, id: q.id, is_public: mod.verdict === "ok" });
}

/** Notification dans le site, puis email (liste de suppression et plafonds tenus par send-transactional-email). */
async function notify(admin: any, n: {
  userId: string;
  type: string;
  title: string;
  body: string;
  link: string;
  actorName: string;
  template: string;
  templateData: Record<string, unknown>;
  idempotencyKey: string;
}) {
  const { error: notifErr } = await admin.from("notifications").insert({
    user_id: n.userId, type: n.type, title: n.title, body: n.body, link: n.link, actor_name: n.actorName,
  });
  if (notifErr) console.error("[mission-question] notification", notifErr.message);
  try {
    const { data: profile } = await admin
      .from("profiles")
      .select("email, account_status")
      .eq("id", n.userId)
      .maybeSingle();
    const email = (profile?.email as string | undefined)?.trim();
    if (!email || profile?.account_status !== "active") return;
    const res = await fetch(`${SUPABASE_URL}/functions/v1/send-transactional-email`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${SERVICE_KEY}` },
      body: JSON.stringify({
        templateName: n.template,
        recipientEmail: email,
        idempotencyKey: n.idempotencyKey,
        templateData: n.templateData,
        logMetadata: { mission_id: n.templateData.missionId, user_id: n.userId },
      }),
    });
    if (!res.ok) console.error("[mission-question] email", res.status, await res.text().catch(() => ""));
  } catch (e) {
    console.error("[mission-question] email", e instanceof Error ? e.message : String(e));
  }
}
