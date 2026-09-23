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
import { startCronRun, logCronRejection } from "../_shared/cron-run-log.ts";
import { authorizeWaveCaller } from "../_shared/wave-caller.ts";
import {
  WAVE_SIZE,
  WAVE_MAX_COUNT,
  WAVE_INTERVAL_HOURS,
  shouldSendNextWave,
  waveHeadline,
  frenchDateLabel,
  WAVE_RELAUNCH_MESSAGE,
  WAVE_EMPTY_MESSAGE,
  isMissionSitMode,
  sitModeEmailLine,
} from "../_shared/mission-wave.ts";
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

async function sendEmail(payload: Record<string, unknown>) {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/send-transactional-email`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${SERVICE_KEY}`,
      apikey: SERVICE_KEY,
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    console.error("[notify-mission-wave] email failed", res.status, await res.text().catch(() => ""));
  }
  return res.ok;
}

interface WaveHelper {
  helper_id: string;
  distance_km: number | null;
  token: string;
}

/** Envoie une vague pour un besoin. Retourne le nombre de messages partis. */
async function runWave(supabase: any, missionId: string): Promise<{ sent: number; wave: number; empty: boolean }> {
  const { data: mission } = await supabase
    .from("small_missions")
    .select("id, title, city, user_id, status, date_needed, end_date, wave_count, latitude, longitude")
    .eq("id", missionId)
    .maybeSingle();

  if (!mission || mission.status !== "open") return { sent: 0, wave: 0, empty: false };

  // Plafond de diffusion : au plus trois vagues, soit trente personnes.
  // Au-delà, le besoin reste visible sur la page Entraide.
  if (Number(mission.wave_count ?? 0) >= WAVE_MAX_COUNT) {
    return { sent: 0, wave: Number(mission.wave_count ?? 0), empty: false };
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
    return { sent: 0, wave, empty: true };
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

    const ok = await sendEmail({
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
      },
      logMetadata: { mission_id: missionId, wave, source: "mission_wave" },
    });

    await supabase.from("notifications").insert({
      user_id: h.helper_id,
      type: "mission_help_needed",
      title: "Un besoin près de chez vous",
      body: headline,
      link: `/petites-missions/${missionId}`,
    });

    await supabase
      .from("mission_notification_queue")
      .update({ status: ok ? "sent" : "skipped", sent_at: new Date().toISOString(), skip_reason: ok ? null : "send_failed" })
      .eq("mission_id", missionId)
      .eq("helper_id", h.helper_id);

    if (ok) sent++;
  }

  // Relance du demandeur à partir de la deuxième vague.
  if (wave >= 2 && owner?.email) {
    await sendEmail({
      templateName: "mission-wave-status",
      recipientEmail: owner.email,
      idempotencyKey: `mission-wave-relaunch-${missionId}-${wave}`,
      templateData: {
        ownerFirstName: owner.first_name ?? "",
        missionTitle: mission.title ?? "",
        missionId,
        message: WAVE_RELAUNCH_MESSAGE,
      },
    });
    await supabase.from("notifications").insert({
      user_id: mission.user_id,
      type: "mission_wave_relaunch",
      title: "On prévient dix autres personnes",
      body: WAVE_RELAUNCH_MESSAGE,
      link: `/petites-missions/${missionId}`,
    });
  }

  return { sent, wave, empty: false };
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
      if (r.sent > 0 || r.empty) {
        const run = await startCronRun("notify-mission-wave");
        await run.finish("success", { mode: "publish", mission_id: body.mission_id, sent: r.sent, empty: r.empty });
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
    const details: Array<Record<string, unknown>> = [];

    for (const m of missions ?? []) {
      const { count } = await supabase
        .from("small_mission_responses")
        .select("id", { count: "exact", head: true })
        .eq("mission_id", m.id);

      const due = shouldSendNextWave(
        {
          status: m.status as string,
          wave_count: m.wave_count as number | null,
          last_wave_at: m.last_wave_at as string | null,
          response_count: count ?? 0,
        },
        now,
      );
      if (!due) continue;

      const r = await runWave(supabase, m.id as string);
      if (r.sent > 0 || r.empty) {
        treated++;
        totalSent += r.sent;
        details.push({ mission_id: m.id, wave: r.wave, sent: r.sent, empty: r.empty });
      }
    }

    // Journal seulement si le passage a fait quelque chose.
    if (treated > 0) {
      const run = await startCronRun("notify-mission-wave");
      await run.finish("success", {
        mode: "cron",
        missions_treated: treated,
        emails_sent: totalSent,
        wave_interval_hours: WAVE_INTERVAL_HOURS,
        details,
      });
    }

    return json({ ok: true, missions_treated: treated, emails_sent: totalSent, details });
  } catch (e) {
    const run = await startCronRun("notify-mission-wave");
    await run.fail(e);
    console.error("[notify-mission-wave] fatal", e);
    return json({ ok: false, error: String(e) }, 500);
  }
});
