/**
 * nudge-owner-pending-application
 *
 * Deux modes :
 *  - cron (body vide) : détecte les candidatures pending > 48h, insère un signal
 *    admin_signals (idempotent) et envoie UN email de rappel au propriétaire
 *    par candidature (dédupliqué via email_send_log).
 *  - manual (body { application_id, admin_id }) : appelé depuis l'admin pour
 *    envoyer une relance manuelle. Bypass la dédup cron (message_id distinct).
 *
 * Respecte : feature flag admin_signals_active et suppressed_emails.
 * Le filtrage par categorie est centralise dans send-transactional-email,
 * qui laisse toujours passer les templates transactionnels.
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { startCronRun, type CronRun } from "../_shared/cron-run-log.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface PendingApp {
  application_id: string;
  sit_id: string;
  sit_title: string;
  sitter_id: string;
  sitter_first_name: string | null;
  owner_id: string;
  owner_first_name: string | null;
  owner_email: string;
  hours_since_created: number;
  sit_start_date: string | null;
  sit_status: string | null;
}

async function sendReminderEmail(params: {
  serviceClient: ReturnType<typeof createClient>;
  app: PendingApp;
  messageId: string;
  templateName: string;
}): Promise<{ ok: boolean; outcome: "sent" | "deferred" | "skipped" | "failed"; error?: string }> {
  const { serviceClient, app, messageId, templateName } = params;
  const email = app.owner_email.trim().toLowerCase();

  // Dédup : si un log existe déjà pour ce message_id, skip
  const { data: existing } = await serviceClient
    .from("email_send_log")
    .select("id")
    .eq("message_id", messageId)
    .limit(1)
    .maybeSingle();
  if (existing) return { ok: false, outcome: "skipped", error: "already_sent" };


  // Suppressed
  const { data: sup } = await serviceClient
    .from("suppressed_emails")
    .select("email")
    .eq("email", email)
    .maybeSingle();
  if (sup) return { ok: false, outcome: "skipped", error: "suppressed" };

  // Le filtrage par categorie d'email est centralise dans send-transactional-email.
  // owner-pending-application-nudge est transactionnel : il n'est jamais bloque
  // par l'opt-out produit. La suppression globale reste verifiee ci-dessus.

  const daysSince = Math.max(1, Math.floor(app.hours_since_created / 24));
  // Urgence : une candidature sans reponse sur une garde qui demarre dans
  // moins de 7 jours ne doit jamais etre retardee par un plafond de frequence.
  let daysUntilStart: number | null = null;
  if (app.sit_start_date) {
    const start = new Date(`${app.sit_start_date}T00:00:00Z`).getTime();
    const today = new Date();
    const todayUtc = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
    daysUntilStart = Math.round((start - todayUtc) / 86400000);
  }
  const isUrgent = daysUntilStart !== null && daysUntilStart <= 7;
  const ctaUrl = `https://guardiens.fr/dashboard/candidatures/${app.application_id}`;

  // Reponses en un clic depuis l'email (jetons a usage unique, 30 jours).
  let declineUrl: string | undefined;
  let thinkingUrl: string | undefined;
  try {
    const [{ data: dTok }, { data: tTok }] = await Promise.all([
      serviceClient.rpc("issue_application_action_token", {
        p_application_id: app.application_id,
        p_action: "decline",
      }),
      serviceClient.rpc("issue_application_action_token", {
        p_application_id: app.application_id,
        p_action: "thinking",
      }),
    ]);
    if (dTok) declineUrl = `https://guardiens.fr/candidature/reponse?t=${dTok}`;
    if (tTok) thinkingUrl = `https://guardiens.fr/candidature/reponse?t=${tTok}`;
  } catch (e) {
    console.error("[nudge-owner-pending-application] token issue failed", e);
  }

  // Envoi via send-transactional-email : cap, suppression, opt-out, en-tetes
  // List-Unsubscribe, pied de page tokenise et journalisation centralises.
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const resp = await fetch(`${SUPABASE_URL}/functions/v1/send-transactional-email`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${SERVICE_KEY}`,
      apikey: SERVICE_KEY,
    },
    body: JSON.stringify({
      templateName: "owner-pending-application-nudge",
      recipientEmail: email,
      idempotencyKey: messageId,
      templateData: {
        ownerFirstName: app.owner_first_name || "",
        sitterFirstName: app.sitter_first_name || "",
        sitTitle: app.sit_title,
        daysSince,
        daysUntilStart,
        ctaUrl,
        declineUrl,
        thinkingUrl,
        ...(isUrgent ? { __urgent: true } : {}),
      },
      logMetadata: {
        application_id: app.application_id,
        sit_id: app.sit_id,
        sitter_id: app.sitter_id,
        owner_id: app.owner_id,
        hours_since_created: app.hours_since_created,
        days_until_start: daysUntilStart,
        urgent: isUrgent,
        source_template: templateName,
      },
    }),
  });

  if (!resp.ok) {
    const body = await resp.text();
    console.error("[nudge-owner-pending-application] send failed", resp.status, body);
    return { ok: false, outcome: "failed", error: `send_failed_${resp.status}` };
  }

  // Un HTTP 200 ne signifie pas envoye : le sender repond 200 avec deferred:true
  // quand il diffère, et 200 avec skipped:true quand il deduplique.
  const payload = (await resp.json().catch(() => null)) as Record<string, unknown> | null;
  if (payload?.deferred) {
    return { ok: false, outcome: "deferred", error: String(payload?.reason ?? "deferred") };
  }
  if (payload?.skipped) {
    return { ok: false, outcome: "skipped", error: String(payload?.reason ?? "skipped") };
  }
  return { ok: true, outcome: "sent" };
}


Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  let run: CronRun | null = null;
  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

    const serviceClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Feature flag
    const { data: flag } = await serviceClient
      .from("feature_flags")
      .select("enabled")
      .eq("key", "admin_signals_active")
      .maybeSingle();
    if (!flag?.enabled) {
      return new Response(
        JSON.stringify({ skipped: "admin_signals_active is off" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Parse body (peut être vide côté cron)
    let payload: { mode?: string; application_id?: string; admin_id?: string; signal_id?: string } = {};
    try {
      const text = await req.text();
      if (text.trim()) payload = JSON.parse(text);
    } catch {
      // ignore
    }

    const mode = payload.mode === "manual" ? "manual" : "cron";
    if (mode === "cron") {
      run = await startCronRun("nudge-owner-pending-application");
    }

    // ── Mode MANUAL : relance ciblée depuis l'admin ─────────────────────
    if (mode === "manual") {
      const authHeader = req.headers.get("Authorization");
      if (!authHeader?.startsWith("Bearer ")) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data: { user } } = await userClient.auth.getUser();
      if (!user) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const { data: role } = await serviceClient
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "admin")
        .maybeSingle();
      if (!role) {
        return new Response(JSON.stringify({ error: "Admin access required" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (!payload.application_id) {
        return new Response(JSON.stringify({ error: "application_id requis" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (!RESEND_API_KEY) throw new Error("RESEND_API_KEY not configured");

      // Re-fetch les données à jour
      const { data: apps } = await serviceClient.rpc("detect_pending_applications");
      const app = ((apps as PendingApp[]) ?? []).find(
        (a) => a.application_id === payload.application_id,
      );
      if (!app) {
        return new Response(JSON.stringify({ error: "Candidature introuvable ou déjà répondue" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const ts = Date.now();
      const result = await sendReminderEmail({
        serviceClient,
        app,
        messageId: `pending-app-manual-${app.application_id}-${ts}`,
        templateName: "pending_application_manual_reminder",
      });

      if (result.ok && payload.signal_id) {
        await serviceClient
          .from("admin_signals")
          .update({
            resolved_at: new Date().toISOString(),
            action_taken: "email_sent",
            admin_id: user.id,
          })
          .eq("id", payload.signal_id);
      }

      return new Response(
        JSON.stringify({ mode, sent: result.ok, error: result.error ?? null, recipient: app.owner_email }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // ── Mode CRON : balayage ─────────────────────────────────────────────
    const { data: apps, error: rpcErr } = await serviceClient.rpc(
      "detect_pending_applications",
    );
    if (rpcErr) throw rpcErr;
    const pending: PendingApp[] = (apps as PendingApp[]) ?? [];

    let signalsInserted = 0;
    let signalsSkipped = 0;
    let emailsSent = 0;
    let emailsDeferred = 0;
    let emailsSkipped = 0;
    const errors: Array<{ application_id: string; error: string }> = [];

    for (const app of pending) {
      const severity = app.hours_since_created >= 96 ? "critical" : "warning";

      const { error: insErr } = await serviceClient.from("admin_signals").insert({
        signal_type: "pending_application",
        severity,
        entity_type: "application",
        entity_id: app.application_id,
        metadata: {
          sit_id: app.sit_id,
          sit_title: app.sit_title,
          sitter_id: app.sitter_id,
          sitter_first_name: app.sitter_first_name,
          owner_id: app.owner_id,
          owner_first_name: app.owner_first_name,
          owner_email: app.owner_email,
          hours_since_created: app.hours_since_created,
        },
      });

      if (insErr) {
        if (insErr.code === "23505" || insErr.message?.includes("idx_admin_signals_idempotent")) {
          signalsSkipped += 1;
        } else {
          errors.push({ application_id: app.application_id, error: insErr.message });
          continue;
        }
      } else {
        signalsInserted += 1;
      }

      // Email de rappel (dédupliqué par message_id)
      if (!RESEND_API_KEY) {
        emailsSkipped += 1;
        continue;
      }
      const result = await sendReminderEmail({
        serviceClient,
        app,
        messageId: `pending-app-${app.application_id}`,
        templateName: "pending_application_reminder",
      });
      if (result.outcome === "sent") emailsSent += 1;
      else if (result.outcome === "deferred") emailsDeferred += 1;
      else if (result.outcome === "skipped") emailsSkipped += 1;
      else errors.push({ application_id: app.application_id, error: result.error ?? "send_failed" });
    }

    if (run) {
      await run.finish(errors.length > 0 ? "partial" : "success", {
        detected: pending.length,
        signals_inserted: signalsInserted,
        signals_skipped: signalsSkipped,
        emails_sent: emailsSent,
        emails_deferred: emailsDeferred,
        emails_skipped: emailsSkipped,
        errors_count: errors.length,
      });
    }
    return new Response(
      JSON.stringify({
        mode,
        detected: pending.length,
        signals_inserted: signalsInserted,
        signals_skipped: signalsSkipped,
        emails_sent: emailsSent,
        emails_deferred: emailsDeferred,
        emails_skipped: emailsSkipped,
        errors,
        generated_at: new Date().toISOString(),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("[nudge-owner-pending-application]", err);
    if (run) await run.fail(err);
    return new Response(
      JSON.stringify({ error: String((err as Error)?.message ?? err) }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
