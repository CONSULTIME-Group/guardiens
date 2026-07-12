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
 * Respecte : feature flag admin_signals_active, suppressed_emails,
 * email_preferences.product_emails.
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
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function buildEmailHtml(params: {
  ownerFirstName: string;
  sitterFirstName: string;
  sitTitle: string;
  daysSince: number;
  ctaUrl: string;
}): string {
  const greeting = params.ownerFirstName
    ? `Bonjour ${escapeHtml(params.ownerFirstName)},`
    : "Bonjour,";
  const sitter = escapeHtml(params.sitterFirstName || "Un gardien");
  const title = escapeHtml(params.sitTitle || "votre annonce");
  const days = params.daysSince;
  return `<!DOCTYPE html><html><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head>
<body style="margin:0;padding:0;background-color:#FAF9F6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background-color:#FAF9F6;padding:32px 16px">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;background-color:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.04)">
<tr><td style="padding:0;background:linear-gradient(135deg,#2C6E49 0%,#3a8a5d 100%);height:6px;line-height:6px;font-size:0">&nbsp;</td></tr>
<tr><td style="padding:32px 40px 8px;text-align:center;background-color:#ffffff">
<img src="https://guardiens.fr/logo-guardiens.png" alt="Guardiens" width="120" style="display:block;margin:0 auto;height:auto"/>
</td></tr>
<tr><td style="padding:24px 40px 8px">
<h1 style="margin:0 0 20px;font-size:22px;line-height:1.35;color:#1a1a1a;font-weight:700">${sitter} attend votre réponse</h1>
<p style="margin:0 0 14px;font-size:15px;line-height:1.7;color:#3a3a3a">${greeting}</p>
<p style="margin:0 0 14px;font-size:15px;line-height:1.7;color:#3a3a3a">${sitter} a candidaté à votre annonce «&nbsp;${title}&nbsp;» il y a ${days} jour${days > 1 ? "s" : ""}, et vous n'avez pas encore répondu.</p>
<p style="margin:0 0 14px;font-size:15px;line-height:1.7;color:#3a3a3a">Une réponse rapide, même brève, aide ${sitter} à s'organiser. Prenez un moment pour lui écrire.</p>
</td></tr>
<tr><td align="center" style="padding:16px 0 8px">
<a href="${escapeHtml(params.ctaUrl)}" style="display:inline-block;padding:14px 32px;background-color:#2C6E49;color:#ffffff;text-decoration:none;border-radius:10px;font-weight:600;font-size:16px;box-shadow:0 4px 12px rgba(44,110,73,0.25)">Voir la candidature</a>
</td></tr>
<tr><td style="padding:24px 40px 8px">
<p style="margin:0 0 4px;font-size:15px;line-height:1.7;color:#3a3a3a">À bientôt,</p>
<p style="margin:0 0 14px;font-size:15px;line-height:1.7;color:#3a3a3a">L'équipe Guardiens</p>
</td></tr>
<tr><td style="padding:20px 40px;border-top:1px solid #eee;background-color:#FAF9F6;text-align:center">
<p style="margin:0 0 6px;font-size:13px;color:#555;font-weight:600">Guardiens</p>
<p style="margin:0;font-size:12px;color:#888;line-height:1.6">L'entraide locale entre propriétaires et gardiens d'animaux.</p>
<p style="margin:14px 0 0;font-size:11px;color:#aaa">
<a href="https://guardiens.fr" style="color:#aaa;text-decoration:none">guardiens.fr</a>
&nbsp;·&nbsp;
<a href="https://guardiens.fr/unsubscribe" style="color:#aaa;text-decoration:underline">Se désinscrire</a>
</p>
</td></tr>
</table>
</td></tr></table>
</body></html>`;
}

async function sendReminderEmail(params: {
  serviceClient: ReturnType<typeof createClient>;
  resendKey: string;
  app: PendingApp;
  messageId: string;
  templateName: string;
}): Promise<{ ok: boolean; error?: string }> {
  const { serviceClient, resendKey, app, messageId, templateName } = params;
  const email = app.owner_email.trim().toLowerCase();

  // Dédup : si un log existe déjà pour ce message_id → skip
  const { data: existing } = await serviceClient
    .from("email_send_log")
    .select("id")
    .eq("message_id", messageId)
    .limit(1)
    .maybeSingle();
  if (existing) return { ok: false, error: "already_sent" };

  // Suppressed
  const { data: sup } = await serviceClient
    .from("suppressed_emails")
    .select("email")
    .eq("email", email)
    .maybeSingle();
  if (sup) return { ok: false, error: "suppressed" };

  // Opt-out product
  const { data: pref } = await serviceClient
    .from("email_preferences")
    .select("product_emails")
    .eq("user_id", app.owner_id)
    .maybeSingle();
  if (pref && (pref as { product_emails: boolean | null }).product_emails === false) {
    return { ok: false, error: "opted_out" };
  }

  const daysSince = Math.max(1, Math.floor(app.hours_since_created / 24));
  const ctaUrl = `https://guardiens.fr/dashboard/candidatures/${app.application_id}`;
  const subject = `${app.sitter_first_name || "Un gardien"} attend votre réponse sur Guardiens`;
  const html = buildEmailHtml({
    ownerFirstName: app.owner_first_name || "",
    sitterFirstName: app.sitter_first_name || "",
    sitTitle: app.sit_title,
    daysSince,
    ctaUrl,
  });

  const resp = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "Guardiens <bonjour@guardiens.fr>",
      to: [app.owner_email],
      subject,
      html,
    }),
  });

  const status = resp.ok ? "sent" : "failed";
  let resendId: string | null = null;
  let errorMessage: string | null = null;
  try {
    const j = await resp.json();
    if (resp.ok) resendId = j?.id ?? null;
    else errorMessage = JSON.stringify(j);
  } catch {
    if (!resp.ok) errorMessage = `HTTP ${resp.status}`;
  }

  await serviceClient.from("email_send_log").insert({
    message_id: messageId,
    template_name: templateName,
    recipient_email: app.owner_email,
    status,
    error_message: errorMessage,
    resend_id: resendId,
    metadata: {
      application_id: app.application_id,
      sit_id: app.sit_id,
      sitter_id: app.sitter_id,
      owner_id: app.owner_id,
      hours_since_created: app.hours_since_created,
    },
  });

  return resp.ok ? { ok: true } : { ok: false, error: errorMessage || "resend_error" };
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
        resendKey: RESEND_API_KEY,
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
        resendKey: RESEND_API_KEY,
        app,
        messageId: `pending-app-${app.application_id}`,
        templateName: "pending_application_reminder",
      });
      if (result.ok) emailsSent += 1;
      else emailsSkipped += 1;
    }

    return new Response(
      JSON.stringify({
        mode,
        detected: pending.length,
        signals_inserted: signalsInserted,
        signals_skipped: signalsSkipped,
        emails_sent: emailsSent,
        emails_skipped: emailsSkipped,
        errors,
        generated_at: new Date().toISOString(),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("[nudge-owner-pending-application]", err);
    return new Response(
      JSON.stringify({ error: String((err as Error)?.message ?? err) }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
