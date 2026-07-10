// Watchdog du pipeline d'emails d'authentification.
// Lit la vue v_email_pipeline_health. Si un seuil est dépassé :
//   - insère une ligne dans error_logs (fingerprint stable par type d'anomalie),
//   - envoie UN email d'alerte à l'admin via Resend.
// Anti-spam : au plus 1 alerte par type d'anomalie et par heure
// (dédup via error_logs.fingerprint + last_seen_at).
// Ne modifie PAS l'état du rate-limit ni la file : purement observationnel.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

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
      .from("v_email_pipeline_health")
      .select("*")
      .limit(1);

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
    if (health.last_run_age_seconds == null || lastRunAge > MAX_LAST_RUN_AGE_S) {
      anomalies.push({
        code: "email_pipeline_worker_stalled",
        title: "Worker process-email-queue silencieux",
        detail: `Dernier heartbeat il y a ${health.last_run_age_seconds == null ? "jamais" : Math.round(lastRunAge) + "s"} (seuil ${MAX_LAST_RUN_AGE_S}s).`,
      });
    }

    const oldestPending = Number(health.oldest_pending_age_seconds ?? 0);
    if (health.oldest_pending_age_seconds != null && oldestPending > MAX_OLDEST_PENDING_S) {
      anomalies.push({
        code: "email_pipeline_queue_backlog",
        title: "Message en attente trop ancien",
        detail: `Le plus vieux message pending a ${Math.round(oldestPending)}s (seuil ${MAX_OLDEST_PENDING_S}s).`,
      });
    }

    const attempts = Number(health.attempts_1h ?? 0);
    const failureRate = Number(health.failure_rate_1h ?? 0);
    if (attempts >= MIN_ATTEMPTS_FOR_RATE && failureRate > MAX_FAILURE_RATE) {
      anomalies.push({
        code: "email_pipeline_failure_rate",
        title: "Taux d'échec d'envoi élevé",
        detail: `Sur la dernière heure : ${attempts} tentatives, taux d'échec ${(failureRate * 100).toFixed(1)}% (seuil ${(MAX_FAILURE_RATE * 100).toFixed(0)}%). DLQ 1h : ${health.dlq_last_hour}.`,
      });
    }

    if (health.stuck_rate_limit) {
      anomalies.push({
        code: "email_pipeline_stuck_rate_limit",
        title: "Rate-limit bloqué",
        detail: `retry_after_until = ${health.retry_after_until} (plus de 30 min dans le futur).`,
      });
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
          stuck_rate_limit = ${String(health.stuck_rate_limit)} (${String(health.retry_after_until)})
        </p>
        <p style="color:#999;font-size:11px">1 alerte max par type d'anomalie par heure.</p>
      </div>
    `;

    const resendRes = await fetch("https://api.resend.com/emails", {
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
    });

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
