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

      const resp = await fetch(`${SUPABASE_URL}/functions/v1/send-transactional-email`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          apikey: SUPABASE_SERVICE_ROLE_KEY,
        },
        body: JSON.stringify({
          templateName: "affinity-onboarding-nudge",
          recipientEmail: u.email,
          idempotencyKey: messageId,
          templateData: {
            firstName: u.first_name || "",
            hours: u.hours_since_started,
          },
          metadata: { user_id: u.profile_id, hours_since_started: u.hours_since_started },
        }),
      });
      if (!resp.ok) {
        console.error("[nudge-affinity-onboarding] send failed", resp.status, await resp.text());
      }
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
