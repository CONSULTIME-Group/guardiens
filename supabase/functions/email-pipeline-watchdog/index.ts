// Watchdog du pipeline d'emails d'authentification.
// Lit la vue v_email_pipeline_health. Si un seuil est dépassé :
//   - insère une ligne dans error_logs (fingerprint stable par type d'anomalie),
//   - envoie UN email d'alerte à l'admin via Resend.
// Anti-spam : au plus 1 alerte par type d'anomalie et par heure
// (dédup via error_logs.fingerprint + last_seen_at).
// Ne modifie PAS l'état du rate-limit ni la file : purement observationnel.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { resendFetch } from "../_shared/resend-guard.ts";
import { EMAIL_CATEGORY_MAP } from "../_shared/email-categories.ts";

// Liste des templates transactionnels, transmise en SQL pour que le compteur
// transactionnel en retard soit calcule sur toute la file, pas sur la liste
// d'exemples plafonnee a 50 lignes.
const TRANSACTIONAL_TEMPLATES = Object.entries(EMAIL_CATEGORY_MAP)
  .filter(([, category]) => category === "transactional")
  .map(([template]) => template);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const ADMIN_EMAIL = "jeremie.martinot@gmail.com";
const FROM_EMAIL = "Guardiens Monitoring <notify@guardiens.fr>";

// Seuils
const MAX_LAST_RUN_AGE_S = 5 * 60;      // 5 min
const MAX_OLDEST_PENDING_S = 10 * 60;    // 10 min
const MAX_FAILURE_RATE = 0.3;
const MIN_ATTEMPTS_FOR_RATE = 10;

type Anomaly = {
  code: string;
  title: string;
  detail: string;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    const service = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { data: healthRows, error: healthErr } = await service
      .rpc("get_email_pipeline_health", {
        p_transactional_templates: TRANSACTIONAL_TEMPLATES,
      });

    if (healthErr) throw new Error(`health read failed: ${healthErr.message}`);
    const health = (healthRows || [])[0];
    if (!health) {
      return new Response(JSON.stringify({ ok: true, health: null }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const anomalies: Anomaly[] = [];

    const lastRunAge = Number(health.last_run_age_seconds ?? 0);
    const oldestPending = Number(health.oldest_pending_age_seconds ?? 0);
    const attempts1h = Number(health.attempts_1h ?? 0);
    const dlqLastHour = Number(health.dlq_last_hour ?? 0);
    // Note : last_run_age_seconds n'est PLUS un déclencheur d'alerte. Le worker
    // process-email-queue est event-driven et se dé-planifie quand les files pgmq
    // sont vides. Un âge élevé pendant les périodes calmes est normal. Le vrai
    // signal de panne = backlog réel dans les files, échecs, rate-limit bloqué
    // ou DLQ. On garde lastRunAge dans le corps de l'alerte à titre informatif.

    if (health.oldest_pending_age_seconds != null && oldestPending > MAX_OLDEST_PENDING_S) {
      anomalies.push({
        code: "email_pipeline_queue_backlog",
        title: "Message en attente trop ancien",
        detail: `Le plus vieux message pending a ${Math.round(oldestPending)}s (seuil ${MAX_OLDEST_PENDING_S}s).`,
      });
    }

    const failureRate = Number(health.failure_rate_1h ?? 0);
    if (attempts1h >= MIN_ATTEMPTS_FOR_RATE && failureRate > MAX_FAILURE_RATE) {
      anomalies.push({
        code: "email_pipeline_failure_rate",
        title: "Taux d'échec d'envoi élevé",
        detail: `Sur la dernière heure : ${attempts1h} tentatives, taux d'échec ${(failureRate * 100).toFixed(1)}% (seuil ${(MAX_FAILURE_RATE * 100).toFixed(0)}%). DLQ 1h : ${health.dlq_last_hour}.`,
      });
    }

    if (health.stuck_rate_limit) {
      anomalies.push({
        code: "email_pipeline_stuck_rate_limit",
        title: "Rate-limit bloqué",
        detail: `retry_after_until = ${health.retry_after_until} (plus de 30 min dans le futur).`,
      });
    }

    if (dlqLastHour > 0) {
      anomalies.push({
        code: "email_pipeline_dlq",
        title: "Envois basculés en DLQ (dernière heure)",
        detail: `${dlqLastHour} message(s) en DLQ sur la dernière heure.`,
      });
    }

    // --- File d'emails différés (email_deferred_queue) ---
    type StaleRow = {
      template_name: string;
      recipient_email: string;
      attempts: number;
      defer_reason: string | null;
      first_enqueued_at: string;
      age_seconds: number;
    };
    const staleRows: StaleRow[] = Array.isArray(health.deferred_stale_rows)
      ? (health.deferred_stale_rows as StaleRow[])
      : [];

    const fmtAge = (s: number) => {
      const h = Math.floor(s / 3600);
      const m = Math.round((s % 3600) / 60);
      return h > 0 ? `${h}h${String(m).padStart(2, "0")}` : `${m} min`;
    };
    const describe = (r: StaleRow) =>
      `${r.template_name} vers ${r.recipient_email} (retard ${fmtAge(Number(r.age_seconds))}, ${r.attempts} tentative(s))`;

    // Compteur calcule en SQL sur l'integralite de la file. staleRows ne sert
    // qu'a illustrer l'alerte.
    const txOverdueCount = Number(health.deferred_transactional_overdue_2h ?? 0);
    if (txOverdueCount > 0) {
      const examples = staleRows
        .filter((r) => EMAIL_CATEGORY_MAP[r.template_name] === "transactional")
        .slice(0, 5)
        .map(describe)
        .join(" ; ");
      anomalies.push({
        code: "email_deferred_transactional_stuck",
        title: "Email transactionnel en retard de plus de 2 heures",
        detail: `${txOverdueCount} email(s) transactionnel(s) dont l'heure d'envoi prevue est depassee de plus de 2h. Les plus anciens : ${examples || "detail indisponible"}.`,
      });
    }

    const over24hCount = Number(health.deferred_pending_over_24h ?? 0);
    if (over24hCount > 0) {
      const examples = staleRows
        .filter((r) => Number(r.age_seconds) >= 24 * 3600)
        .slice(0, 5)
        .map(describe)
        .join(" ; ");
      anomalies.push({
        code: "email_deferred_stale_24h",
        title: "Email en retard de plus de 24 heures",
        detail: `${over24hCount} email(s) dont l'heure d'envoi prevue est depassee de plus de 24h. Les plus anciens : ${examples || "detail indisponible"}.`,
      });
    }

    const attemptsGe3 = Number(health.deferred_attempts_ge_3 ?? 0);
    if (attemptsGe3 > 0) {
      anomalies.push({
        code: "email_deferred_retry_chain",
        title: "Chaine de reports qui n'aboutit pas",
        detail: `${attemptsGe3} email(s) en file avec au moins 3 reports. Total en attente : ${
          String(health.deferred_pending_total ?? 0)
        }, expires sur 24h : ${String(health.deferred_expired_24h ?? 0)}, abandonnes sur 24h : ${String(health.deferred_abandoned_24h ?? 0)}.`,
      });
    }

    // --- Cohérence du miroir email_send_log avec la file de travail ---
    // email_send_log est un journal : sa ligne 'deferred' est figée à
    // l'enfilement. Une ligne 'deferred' de plus de 24h SANS ligne vivante
    // (pending/processing) dans email_deferred_queue est une dérive : la file
    // a tranché, le miroir n'a pas suivi. C'est l'invariant qui manquait lors
    // de l'incident des 2 162 lignes fantômes (août 2026).
    try {
      const { data: driftRaw, error: driftErr } = await service.rpc("email_mirror_drift_count");
      if (driftErr) {
        console.error("email_mirror_drift_count failed", driftErr);
      } else {
        const drift = Number(driftRaw ?? 0);
        if (drift > 0) {
          anomalies.push({
            code: "email_deferred_mirror_drift",
            title: "Miroir email_send_log désynchronisé de la file",
            detail: `${drift} ligne(s) email_send_log en statut 'deferred' depuis plus de 24h sans ligne vivante dans email_deferred_queue. Le journal affirme un envoi en attente que la file ne porte plus. Ne jamais conclure à un incident d'envoi à partir du seul email_send_log : joindre sur metadata.idempotency_key et chercher une ligne 'sent' avec resend_id.`,
          });
        }
      }
    } catch (driftEx) {
      console.error("mirror drift check failed", driftEx);
    }

    if (anomalies.length === 0) {
      return new Response(JSON.stringify({ ok: true, anomalies: 0 }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Anti-spam : au plus 1 alerte par code par heure
    const oneHourAgo = new Date(Date.now() - 60 * 60_000).toISOString();
    const fresh: Anomaly[] = [];
    for (const a of anomalies) {
      const fingerprint = `email_pipeline:${a.code}`;
      const { data: recent, error: qErr } = await service
        .from("error_logs")
        .select("id, last_seen_at")
        .eq("fingerprint", fingerprint)
        .gte("last_seen_at", oneHourAgo)
        .limit(1);

      if (qErr) {
        console.error("error_logs lookup failed", qErr);
      }

      // Toujours logger (upsert via RPC pour incrémenter occurrences)
      await service.rpc("log_client_error", {
        _fingerprint: fingerprint,
        _message: `[${a.code}] ${a.title} — ${a.detail}`,
        _severity: "error",
        _source: "email-pipeline-watchdog",
        _context: {
          code: a.code,
          health,
        } as unknown as Record<string, unknown>,
      });

      if (!recent || recent.length === 0) {
        fresh.push(a);
      }
    }

    if (fresh.length === 0 || !RESEND_API_KEY) {
      return new Response(
        JSON.stringify({
          ok: true,
          anomalies: anomalies.length,
          alerted: 0,
          reason: !RESEND_API_KEY ? "no_resend_key" : "throttled",
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Envoi de UN seul email regroupant les anomalies fraîches
    const subject = `[Guardiens] Pipeline emails : ${fresh.length} anomalie${fresh.length > 1 ? "s" : ""}`;
    const rows = fresh
      .map(
        (a) =>
          `<li><strong>${escape(a.title)}</strong> (${escape(a.code)})<br/><span style="color:#555">${escape(a.detail)}</span></li>`,
      )
      .join("");
    const html = `
      <div style="font-family:system-ui,sans-serif;font-size:14px;line-height:1.5">
        <h2>Anomalies détectées sur le pipeline d'emails</h2>
        <ul>${rows}</ul>
        <p style="color:#666;font-size:12px">
          Résumé santé :<br/>
          last_run_age_seconds = ${String(health.last_run_age_seconds)}<br/>
          oldest_pending_age_seconds = ${String(health.oldest_pending_age_seconds)}<br/>
          failure_rate_1h = ${String(health.failure_rate_1h)} (${String(health.attempts_1h)} tentatives)<br/>
          dlq_last_hour = ${String(health.dlq_last_hour)}<br/>
          stuck_rate_limit = ${String(health.stuck_rate_limit)} (${String(health.retry_after_until)})<br/>
          file différée : pending = ${String(health.deferred_pending_total)}, en retard &gt; 2h = ${String(health.deferred_pending_over_2h)}, transactionnels en retard &gt; 2h = ${String(health.deferred_transactional_overdue_2h)}, en retard &gt; 24h = ${String(health.deferred_pending_over_24h)}, attempts &ge; 3 = ${String(health.deferred_attempts_ge_3)}, expirés 24h = ${String(health.deferred_expired_24h)}, abandonnés 24h = ${String(health.deferred_abandoned_24h)}
        </p>
        <p style="color:#999;font-size:11px">1 alerte max par type d'anomalie par heure.</p>
      </div>
    `;

    const resendRes = await resendFetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: ADMIN_EMAIL,
        subject,
        html,
      }),
    }, { functionName: "email-pipeline-watchdog" });

    if (!resendRes.ok) {
      const errText = await resendRes.text();
      console.error("Resend alert failed", resendRes.status, errText);
    }

    return new Response(
      JSON.stringify({
        ok: true,
        anomalies: anomalies.length,
        alerted: fresh.length,
        resend_status: resendRes.status,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("email-pipeline-watchdog error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

function escape(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
