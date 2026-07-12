/**
 * nudge-affinity-onboarding
 *
 * Cron quotidien (18h UTC) : détecte les utilisateurs ayant émis
 * `affinity_onboarding_started` sans `affinity_onboarding_completed` depuis
 * plus de 24 heures. Insère un signal admin + envoie un email de rappel
 * (une seule fois par user, message_id `affinity-stale-<user_id>`).
 *
 * Avant le balayage principal, auto-résout les signaux affinity_onboarding_stale
 * ouverts dont l'utilisateur a désormais un event `affinity_onboarding_completed`
 * (les triggers BDD ne pouvant pas écouter analytics_events).
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { startCronRun } from "../_shared/cron-run-log.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface StaleUser {
  profile_id: string;
  first_name: string | null;
  email: string | null;
  hours_since_started: number;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function buildEmailHtml(params: { firstName: string; hours: number; ctaUrl: string }): string {
  const greeting = params.firstName
    ? `Bonjour ${escapeHtml(params.firstName)},`
    : "Bonjour,";
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
<h1 style="margin:0 0 20px;font-size:22px;line-height:1.35;color:#1a1a1a;font-weight:700">Il ne vous reste que quelques étapes</h1>
<p style="margin:0 0 14px;font-size:15px;line-height:1.7;color:#3a3a3a">${greeting}</p>
<p style="margin:0 0 14px;font-size:15px;line-height:1.7;color:#3a3a3a">Vous avez commencé à compléter votre profil d'affinité il y a ${params.hours} heures. Il ne vous reste que quelques étapes pour activer votre score de compatibilité.</p>
</td></tr>
<tr><td align="center" style="padding:16px 0 8px">
<a href="${escapeHtml(params.ctaUrl)}" style="display:inline-block;padding:14px 32px;background-color:#2C6E49;color:#ffffff;text-decoration:none;border-radius:10px;font-weight:600;font-size:16px;box-shadow:0 4px 12px rgba(44,110,73,0.25)">Reprendre</a>
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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  const run = await startCronRun("nudge-affinity-onboarding");
  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    const service = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { data: flag } = await service
      .from("feature_flags")
      .select("enabled")
      .eq("key", "admin_signals_active")
      .maybeSingle();
    if (!flag?.enabled) {
      await run.finish("success", { skipped: "flag_off" });
      return new Response(
        JSON.stringify({ skipped: "admin_signals_active is off" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // ── Auto-résolution : users qui ont maintenant complété ─────────────
    let autoResolved = 0;
    const { data: openSignals } = await service
      .from("admin_signals")
      .select("id, entity_id")
      .eq("signal_type", "affinity_onboarding_stale")
      .is("resolved_at", null);
    const openList = (openSignals as Array<{ id: string; entity_id: string }> | null) ?? [];
    if (openList.length > 0) {
      const userIds = Array.from(new Set(openList.map((s) => s.entity_id)));
      const { data: completedRows } = await service
        .from("analytics_events")
        .select("user_id")
        .eq("event_type", "affinity_onboarding_completed")
        .in("user_id", userIds);
      const completedSet = new Set(
        ((completedRows as Array<{ user_id: string | null }> | null) ?? [])
          .map((r) => r.user_id)
          .filter((v): v is string => !!v),
      );
      const toResolve = openList.filter((s) => completedSet.has(s.entity_id));
      if (toResolve.length > 0) {
        const { error } = await service
          .from("admin_signals")
          .update({
            resolved_at: new Date().toISOString(),
            action_taken: "auto_resolved_onboarding_completed",
          })
          .in("id", toResolve.map((s) => s.id));
        if (!error) autoResolved = toResolve.length;
      }
    }

    // ── Détection ────────────────────────────────────────────────────────
    const { data, error } = await service.rpc("detect_affinity_stale");
    if (error) throw error;
    const users: StaleUser[] = (data as StaleUser[]) ?? [];

    let signalsInserted = 0;
    let signalsSkipped = 0;
    let emailsSent = 0;
    let emailsSkipped = 0;
    const errors: Array<{ profile_id: string; error: string }> = [];

    for (const u of users) {
      const { error: insErr } = await service.from("admin_signals").insert({
        signal_type: "affinity_onboarding_stale",
        severity: "warning",
        entity_type: "profile",
        entity_id: u.profile_id,
        metadata: {
          first_name: u.first_name,
          email: u.email,
          hours_since_started: u.hours_since_started,
        },
      });
      if (insErr) {
        if (insErr.code === "23505" || insErr.message?.includes("idx_admin_signals_idempotent")) {
          signalsSkipped += 1;
        } else {
          errors.push({ profile_id: u.profile_id, error: insErr.message });
          continue;
        }
      } else {
        signalsInserted += 1;
      }

      // Email one-shot
      if (!RESEND_API_KEY || !u.email) { emailsSkipped += 1; continue; }
      const email = u.email.trim().toLowerCase();
      const messageId = `affinity-stale-${u.profile_id}`;

      const { data: dup } = await service
        .from("email_send_log")
        .select("id")
        .eq("message_id", messageId)
        .limit(1)
        .maybeSingle();
      if (dup) { emailsSkipped += 1; continue; }

      const { data: sup } = await service
        .from("suppressed_emails")
        .select("email")
        .eq("email", email)
        .maybeSingle();
      if (sup) { emailsSkipped += 1; continue; }

      const { data: pref } = await service
        .from("email_preferences")
        .select("product_emails")
        .eq("user_id", u.profile_id)
        .maybeSingle();
      if (pref && (pref as { product_emails: boolean | null }).product_emails === false) {
        emailsSkipped += 1;
        continue;
      }

      const html = buildEmailHtml({
        firstName: u.first_name || "",
        hours: u.hours_since_started,
        ctaUrl: "https://guardiens.fr/onboarding/affinity",
      });

      const resp = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "Guardiens <bonjour@guardiens.fr>",
          to: [u.email],
          subject: "Il ne vous reste que quelques étapes",
          html,
        }),
      });
      const status = resp.ok ? "sent" : "failed";
      let resendId: string | null = null;
      let errMsg: string | null = null;
      try {
        const j = await resp.json();
        if (resp.ok) resendId = j?.id ?? null;
        else errMsg = JSON.stringify(j);
      } catch {
        if (!resp.ok) errMsg = `HTTP ${resp.status}`;
      }
      await service.from("email_send_log").insert({
        message_id: messageId,
        template_name: "affinity_onboarding_stale_nudge",
        recipient_email: u.email,
        status,
        error_message: errMsg,
        resend_id: resendId,
        metadata: { user_id: u.profile_id, hours_since_started: u.hours_since_started },
      });
      if (resp.ok) emailsSent += 1;
      else emailsSkipped += 1;
    }

    await run.finish(errors.length > 0 ? "partial" : "success", {
      detected: users.length,
      auto_resolved: autoResolved,
      signals_inserted: signalsInserted,
      signals_skipped: signalsSkipped,
      emails_sent: emailsSent,
      emails_skipped: emailsSkipped,
      errors_count: errors.length,
    });
    return new Response(
      JSON.stringify({
        detected: users.length,
        auto_resolved: autoResolved,
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
    console.error("[nudge-affinity-onboarding]", err);
    await run.fail(err);
    return new Response(
      JSON.stringify({ error: String((err as Error)?.message ?? err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
