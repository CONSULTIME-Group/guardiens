/**
 * notify-mission-wave
 * -------------------------------------------------------------------------
 * Moteur de diffusion de l'Entraide : un besoin, dix personnes du coin, un
 * « je peux ».
 *
 * Deux usages :
 *  - à la publication : body { mission_id }. La vague 1 part tout de suite,
 *    sauf pendant les heures calmes de Paris (22 h à 8 h) où elle est
 *    différée au premier passage du cron après 8 h.
 *  - en cron horaire : body vide. Le passage traite les besoins ouverts sans
 *    vague, puis les besoins sans réponse dont la dernière vague date de plus
 *    de 48 heures.
 *
 * Le journal cron_run_log n'est écrit que si le passage a réellement envoyé
 * ou relancé quelque chose.
 *
 * Aucune donnée personnelle dans les emails hors prénom, ville et distance
 * arrondie.
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { isParisQuietHour } from "../_shared/paris-hour.ts";
import { startCronRun, logCronRejection, describeError } from "../_shared/cron-run-log.ts";
import { checkCronFailureAlert, resolveCronFailureAlert } from "../_shared/cron-failure-alert.ts";
import { authorizeWaveCaller } from "../_shared/wave-caller.ts";
import {
  WAVE_SIZE,
  WAVE_MAX_COUNT,
  WAVE_INTERVAL_HOURS,
  shouldSendNextWave,
  countFreezingResponses,
  waveHeadline,
  frenchDateLabel,
  waveRelaunchMessage,
  waveRelaunchTitle,
  WAVE_EMPTY_MESSAGE,
  isMissionSitMode,
  sitModeEmailLine,
} from "../_shared/mission-wave.ts";
import {
  WAVE_SEND_SPACING_MS,
  parseRetryAfterMs,
  isRateLimitText,
  sendWithRateLimitRetry,
  selectStaleQueued,
  queueUpdateFor,
  waveRunStatus,
  type SendOutcome,
} from "../_shared/mission-wave-delivery.ts";
import { pickNearestProof, proofEmailLine, proofWeekLabel, type ProofRow } from "../_shared/mission-meetup.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/** Un envoi, sans jamais lever : une limite de débit est signalée, pas jetée. */
async function sendEmailOutcome(payload: Record<string, unknown>): Promise<SendOutcome> {
  try {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/send-transactional-email`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${SERVICE_KEY}`,
        apikey: SERVICE_KEY,
      },
      body: JSON.stringify(payload),
    });
    if (res.ok) return { ok: true, rateLimited: false, retryAfterMs: null };
    const text = await res.text().catch(() => "");
    console.error("[notify-mission-wave] email failed", res.status, text);
    const rateLimited = res.status === 429 || isRateLimitText(text);
    return { ok: false, rateLimited, retryAfterMs: parseRetryAfterMs(text, res.headers.get("Retry-After")) };
  } catch (e) {
    const msg = String((e as Error)?.message ?? e);
    console.error("[notify-mission-wave] email threw", msg);
    return { ok: false, rateLimited: isRateLimitText(msg), retryAfterMs: parseRetryAfterMs(msg) };
  }
}

async function sendEmail(payload: Record<string, unknown>) {
  return (await sendEmailOutcome(payload)).ok;
}

/** Envoi espacé, avec une seule nouvelle tentative sur limite de débit. */
async function deliver(payload: Record<string, unknown>) {
  await sleep(WAVE_SEND_SPACING_MS);
  return sendWithRateLimitRetry(() => sendEmailOutcome(payload), sleep);
}

interface WaveHelper {
  helper_id: string;
  distance_km: number | null;
  token: string;
}

interface WaveResult {
  sent: number;
  wave: number;
  empty: boolean;
  radiusFloor?: number;
  deferred?: number;
  caughtUp?: number;
  catchupDeferred?: number;
}

/**
 * Rattrapage : personnes mises en file il y a plus de dix minutes, jamais
 * prévenues (passage interrompu, limite de débit). Leur jeton actif est
 * réutilisé. wave_count reste inchangé : ce n'est pas une nouvelle vague.
 */
async function catchUpQueued(supabase: any, missionId: string, now = new Date()): Promise<{ sent: number; deferred: number; skipped: number }> {
  const out = { sent: 0, deferred: 0, skipped: 0 };
  const { data: rows } = await supabase
    .from("mission_notification_queue")
    .select("helper_id, status, sent_at, queued_at, wave, distance_km")
    .eq("mission_id", missionId)
    .eq("status", "queued")
    .is("sent_at", null);
  const stale = selectStaleQueued((rows ?? []) as any[], now);
  if (stale.length === 0) return out;

  const { data: mission } = await supabase
    .from("small_missions")
    .select("id, title, city, user_id, status, date_needed, end_date, sit_mode")
    .eq("id", missionId)
    .maybeSingle();
  if (!mission) return out;
  const { data: owner } = await supabase
    .from("profiles")
    .select("first_name")
    .eq("id", mission.user_id)
    .maybeSingle();
  const dateLabel = frenchDateLabel(mission.date_needed ?? mission.end_date);
  const sitLine = isMissionSitMode(mission.sit_mode)
    ? sitModeEmailLine(mission.sit_mode, owner?.first_name ?? null)
    : "";

  for (const r of stale) {
    const { data: tok } = await supabase
      .from("mission_action_tokens")
      .select("token")
      .eq("mission_id", missionId)
      .eq("helper_id", r.helper_id)
      .eq("action", "can_help")
      .is("used_at", null)
      .gt("expires_at", now.toISOString())
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    const { data: helper } = await supabase
      .from("profiles")
      .select("first_name, email")
      .eq("id", r.helper_id)
      .maybeSingle();
    if (!tok?.token || !helper?.email) {
      await supabase
        .from("mission_notification_queue")
        .update({ status: "skipped", skip_reason: tok?.token ? "no_email" : "token_missing" })
        .eq("mission_id", missionId)
        .eq("helper_id", r.helper_id);
      out.skipped++;
      continue;
    }
    const headline = waveHeadline(owner?.first_name ?? null, r.distance_km, mission.title ?? "un coup de main", dateLabel);
    const result = await deliver({
      templateName: "mission-help-needed",
      recipientEmail: helper.email,
      idempotencyKey: `mission-wave-${missionId}-${r.helper_id}-${r.wave}`,
      templateData: {
        helperFirstName: helper.first_name ?? "",
        headline,
        missionTitle: mission.title ?? "",
        missionCity: mission.city ?? "",
        missionId,
        canHelpToken: tok.token,
        proofLine: "",
        sitModeLine: sitLine,
        distanceKm: r.distance_km,
      },
      logMetadata: { mission_id: missionId, wave: r.wave, source: "mission_wave_catchup" },
    });
    if (result === "deferred") { out.deferred++; continue; }
    if (result === "sent") {
      await supabase.from("notifications").insert({
        user_id: r.helper_id,
        type: "mission_help_needed",
        title: "Un besoin près de chez vous",
        body: headline,
        link: `/petites-missions/${missionId}`,
      });
      out.sent++;
    }
    await supabase
      .from("mission_notification_queue")
      .update(queueUpdateFor(result, new Date().toISOString()))
      .eq("mission_id", missionId)
      .eq("helper_id", r.helper_id);
  }
  return out;
}

/** Envoie une vague pour un besoin. Retourne le nombre de messages partis. */
async function runWave(supabase: any, missionId: string): Promise<WaveResult> {
  // Rattrapage d'abord, sans toucher à wave_count.
  const catchup = await catchUpQueued(supabase, missionId);

  const { data: mission } = await supabase
    .from("small_missions")
    .select("id, title, city, user_id, status, date_needed, end_date, wave_count, sit_mode, latitude, longitude")
    .eq("id", missionId)
    .maybeSingle();

  const cu = { caughtUp: catchup.sent, catchupDeferred: catchup.deferred };
  if (!mission || mission.status !== "open") return { sent: 0, wave: 0, empty: false, ...cu };

  // Plafond de diffusion : au plus trois vagues, soit trente personnes.
  // Au-delà, le besoin reste visible sur la page Entraide.
  if (Number(mission.wave_count ?? 0) >= WAVE_MAX_COUNT) {
    return { sent: 0, wave: Number(mission.wave_count ?? 0), empty: false, ...cu };
  }

  const { data: owner } = await supabase
    .from("profiles")
    .select("first_name, email")
    .eq("id", mission.user_id)
    .maybeSingle();

  const { data: waveData, error: waveErr } = await supabase.rpc("enqueue_mission_wave", {
    p_mission_id: missionId,
    p_size: WAVE_SIZE,
  });
  if (waveErr) throw waveErr;

  const helpers: WaveHelper[] = (waveData?.helpers ?? []) as WaveHelper[];
  const wave = Number(waveData?.wave ?? 0);
  const radiusFloor = Number(waveData?.radius_floor ?? 30);

  if (helpers.length === 0) {
    // Personne à prévenir. Au premier tour seulement, on le dit au demandeur,
    // honnêtement, et le besoin reste visible dans le fil.
    if (wave <= 1 && owner?.email) {
      await sendEmail({
        templateName: "mission-wave-status",
        recipientEmail: owner.email,
        idempotencyKey: `mission-wave-empty-${missionId}`,
        templateData: {
          ownerFirstName: owner.first_name ?? "",
          missionTitle: mission.title ?? "",
          missionId,
          message: WAVE_EMPTY_MESSAGE,
        },
      });
      await supabase.from("notifications").insert({
        user_id: mission.user_id,
        type: "mission_wave_empty",
        title: "Votre demande reste visible",
        body: WAVE_EMPTY_MESSAGE,
        link: `/petites-missions/${missionId}`,
      });
    }
    return { sent: 0, wave, empty: true, radiusFloor, ...cu };
  }

  const dateLabel = frenchDateLabel(mission.date_needed ?? mission.end_date);

  // Une seule ligne de preuve, quand une rencontre confirmée existe à moins de
  // cinquante kilomètres du besoin.
  let proofLine = "";
  const { data: proofRows } = await supabase
    .from("public_entraide_proofs")
    .select("mission_id, owner_first_name, helper_first_name, city, latitude_approx, longitude_approx, word, happened_at")
    .order("happened_at", { ascending: false })
    .limit(200);
  const nearest = pickNearestProof((proofRows ?? []) as ProofRow[], mission.latitude, mission.longitude);
  if (nearest) {
    proofLine = proofEmailLine({
      owner_first_name: nearest.proof.owner_first_name,
      helper_first_name: nearest.proof.helper_first_name,
      distance_km: nearest.distance_km,
      week_label: proofWeekLabel(nearest.proof.happened_at),
    });
  }

  let sent = 0;
  let deferred = 0;

  for (const h of helpers) {
    const { data: helper } = await supabase
      .from("profiles")
      .select("first_name, email")
      .eq("id", h.helper_id)
      .maybeSingle();
    if (!helper?.email) continue;

    const headline = waveHeadline(
      owner?.first_name ?? null,
      h.distance_km,
      mission.title ?? "un coup de main",
      dateLabel,
    );

    const sitLine = isMissionSitMode(mission.sit_mode)
      ? sitModeEmailLine(mission.sit_mode, owner?.first_name ?? null)
      : "";

    const result = await deliver({
      templateName: "mission-help-needed",
      recipientEmail: helper.email,
      idempotencyKey: `mission-wave-${missionId}-${h.helper_id}-${wave}`,
      templateData: {
        helperFirstName: helper.first_name ?? "",
        headline,
        missionTitle: mission.title ?? "",
        missionCity: mission.city ?? "",
        missionId,
        canHelpToken: h.token,
        proofLine,
        sitModeLine: sitLine,
        distanceKm: h.distance_km,
      },
      logMetadata: { mission_id: missionId, wave, source: "mission_wave" },
    });

    // Limite de débit persistante : la ligne reste queued, sans sent_at, et
    // le rattrapage du passage suivant la reprend.
    if (result === "deferred") { deferred++; continue; }

    await supabase.from("notifications").insert({
      user_id: h.helper_id,
      type: "mission_help_needed",
      title: "Un besoin près de chez vous",
      body: headline,
      link: `/petites-missions/${missionId}`,
    });

    await supabase
      .from("mission_notification_queue")
      .update(queueUpdateFor(result, new Date().toISOString()))
      .eq("mission_id", missionId)
      .eq("helper_id", h.helper_id);

    if (result === "sent") sent++;
  }

  // Relance du demandeur à partir de la deuxième vague.
  if (wave >= 2 && sent > 0 && owner?.email) {
    await sendEmail({
      templateName: "mission-wave-status",
      recipientEmail: owner.email,
      idempotencyKey: `mission-wave-relaunch-${missionId}-${wave}`,
      templateData: {
        ownerFirstName: owner.first_name ?? "",
        missionTitle: mission.title ?? "",
        missionId,
        message: waveRelaunchMessage(sent),
      },
    });
    await supabase.from("notifications").insert({
      user_id: mission.user_id,
      type: "mission_wave_relaunch",
      title: waveRelaunchTitle(sent),
      body: waveRelaunchMessage(sent),
      link: `/petites-missions/${missionId}`,
    });
  }

  return { sent, wave, empty: false, radiusFloor, deferred, caughtUp: catchup.sent, catchupDeferred: catchup.deferred };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  let body: { mission_id?: string } = {};
  try { if (req.body) body = await req.json(); } catch { /* corps vide */ }

  const supabase = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

  // Accès réservé au planificateur (clé de service) et, à la publication, à
  // l'auteur du besoin concerné depuis son navigateur.
  const decision = await authorizeWaveCaller({
    authHeader: req.headers.get("Authorization"),
    serviceKey: SERVICE_KEY,
    missionId: body.mission_id ?? null,
    getUserId: async (token) => {
      const { data, error } = await supabase.auth.getUser(token);
      if (error || !data?.user) return null;
      return data.user.id;
    },
    getMissionOwnerId: async (missionId) => {
      const { data } = await supabase
        .from("small_missions")
        .select("user_id")
        .eq("id", missionId)
        .maybeSingle();
      return (data?.user_id as string | undefined) ?? null;
    },
  });
  if (!decision.allowed) {
    try { await logCronRejection("notify-mission-wave", `auth refusee, ${decision.reason} (HTTP ${decision.status})`); } catch { /* la journalisation ne masque jamais le rejet */ }
    return json({ error: decision.error }, decision.status);
  }

  const now = new Date();


  try {
    // 1) Publication d'un besoin : vague 1 immédiate, hors heures calmes.
    if (body.mission_id) {
      if (isParisQuietHour(now)) {
        return json({ ok: true, deferred: true, reason: "quiet_hours" });
      }
      const r = await runWave(supabase, body.mission_id);
      const pubSent = r.sent + (r.caughtUp ?? 0);
      const pubDeferred = (r.deferred ?? 0) + (r.catchupDeferred ?? 0);
      if (pubSent > 0 || r.empty || pubDeferred > 0) {
        const run = await startCronRun("notify-mission-wave");
        const st = waveRunStatus(pubSent, pubDeferred, 0);
        const metrics = { mode: "publish", mission_id: body.mission_id, sent: r.sent, caught_up: r.caughtUp ?? 0, deferred: pubDeferred, empty: r.empty };
        if (st === "failed") await run.fail(new Error(`aucun envoi, ${pubDeferred} report(s) sur limite de debit`), metrics);
        else await run.finish(st, metrics);
      }
      return json({ ok: true, ...r });
    }

    // 2) Passage horaire. Rien pendant les heures calmes.
    if (isParisQuietHour(now)) {
      return json({ ok: true, skipped: "quiet_hours" });
    }

    const { data: missions, error } = await supabase
      .from("small_missions")
      .select("id, status, wave_count, last_wave_at")
      .eq("status", "open")
      .eq("mission_type", "besoin")
      .order("created_at", { ascending: true })
      .limit(200);
    if (error) throw error;

    let treated = 0;
    let totalSent = 0;
    let totalCaughtUp = 0;
    let totalDeferred = 0;
    const errors: Array<{ mission_id: unknown; error: string }> = [];
    const details: Array<Record<string, unknown>> = [];

    for (const m of missions ?? []) {
     try {
      // Seules les réponses qui engagent gèlent la diffusion : accepted, ou pending récente.
      const { data: responses, error: respErr } = await supabase
        .from("small_mission_responses")
        .select("status, created_at")
        .eq("mission_id", m.id)
        .in("status", ["pending", "accepted"]);
      if (respErr) throw respErr;
      const freezing = countFreezingResponses(responses ?? [], now);

      const due = shouldSendNextWave(
        {
          status: m.status as string,
          wave_count: m.wave_count as number | null,
          last_wave_at: m.last_wave_at as string | null,
          response_count: freezing,
        },
        now,
      );
      if (!due) {
        // Rattrapage même hors vague : les personnes laissées en file sont reprises
        // à chaque passage, sans attendre les 48 heures.
        const cu = await catchUpQueued(supabase, m.id as string, now);
        if (cu.sent > 0 || cu.deferred > 0 || cu.skipped > 0) {
          treated++;
          totalCaughtUp += cu.sent;
          totalDeferred += cu.deferred;
          details.push({ mission_id: m.id, catchup: true, caught_up: cu.sent, deferred: cu.deferred, token_missing: cu.skipped });
        }
        continue;
      }

      const r = await runWave(supabase, m.id as string);
      const deferred = (r.deferred ?? 0) + (r.catchupDeferred ?? 0);
      if (r.sent > 0 || r.empty || deferred > 0 || (r.caughtUp ?? 0) > 0) {
        treated++;
        totalSent += r.sent;
        totalCaughtUp += r.caughtUp ?? 0;
        totalDeferred += deferred;
        details.push({ mission_id: m.id, wave: r.wave, sent: r.sent, caught_up: r.caughtUp ?? 0, deferred, empty: r.empty, radius_floor: r.radiusFloor });
      }
     } catch (e) {
      // Une mission en échec ne bloque pas les suivantes.
      console.error("[notify-mission-wave] mission", m.id, e);
      errors.push({ mission_id: m.id, error: describeError(e) });
     }
    }

    // Signal admin : besoin ouvert depuis plus de 72 h, personne joignable même à 100 km.
    const { error: signalErr } = await supabase.rpc("detect_missions_without_audience");
    if (signalErr) console.error("[notify-mission-wave] signal sans audience", signalErr.message);

    // Journal seulement si le passage a fait quelque chose.
    const delivered = totalSent + totalCaughtUp;
    const runStatus = waveRunStatus(delivered, totalDeferred, errors.length);
    const metrics = {
      mode: "cron",
      missions_treated: treated,
      emails_sent: totalSent,
      emails_caught_up: totalCaughtUp,
      emails_deferred: totalDeferred,
      errors,
      wave_interval_hours: WAVE_INTERVAL_HOURS,
      details,
    };
    if (treated > 0 || errors.length > 0) {
      const run = await startCronRun("notify-mission-wave");
      if (runStatus === "failed") {
        await run.fail(new Error(errors[0]?.error ?? `aucun envoi, ${totalDeferred} report(s)`), metrics);
      } else {
        await run.finish(runStatus, metrics);
      }
    }

    if (runStatus === "failed") {
      await checkCronFailureAlert(supabase, "notify-mission-wave", errors[0]?.error ?? "aucun envoi").catch(() => {});
    } else {
      await resolveCronFailureAlert(supabase, "notify-mission-wave").catch(() => {});
    }
    return json({ ok: runStatus !== "failed", status: runStatus, ...metrics });
  } catch (e) {
    const run = await startCronRun("notify-mission-wave");
    await run.fail(e);
    await checkCronFailureAlert(supabase, "notify-mission-wave", describeError(e)).catch((err) =>
      console.error("[notify-mission-wave] alerte", err),
    );
    console.error("[notify-mission-wave] fatal", e);
    return json({ ok: false, error: String(e) }, 500);
  }
});
