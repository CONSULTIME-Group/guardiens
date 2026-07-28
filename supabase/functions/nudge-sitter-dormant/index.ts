/**
 * nudge-sitter-dormant
 *
 * Cron hebdomadaire (lundi 11h UTC) : détecte les gardiens inscrits depuis
 * plus de 30 jours, profil ≥ 60 %, identité vérifiée, ZÉRO candidature envoyée.
 * Insère un signal admin (warning + metadata.nature='nurturing') et envoie un
 * email de nurturing au gardien (une fois par semaine max via message_id
 * `dormant-sitter-<sid>-<YYYYWW>`).
 *
 * Respecte : feature flag admin_signals_active, suppressed_emails,
 * email_preferences.product_emails.
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { startCronRun } from "../_shared/cron-run-log.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface DormantSitter {
  sitter_id: string;
  sitter_first_name: string | null;
  sitter_email: string | null;
  days_since_signup: number;
  profile_completion: number | null;
}


/** ISO week number (1-53). */
function isoWeek(d: Date): { year: number; week: number } {
  const date = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const dayNum = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const week = Math.ceil((((date.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return { year: date.getUTCFullYear(), week };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  const run = await startCronRun("nudge-sitter-dormant");
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
      return new Response(
        JSON.stringify({ skipped: "admin_signals_active is off" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const { data, error } = await service.rpc("detect_dormant_sitters");
    if (error) throw error;
    const sitters: DormantSitter[] = (data as DormantSitter[]) ?? [];

    const now = new Date();
    const { year, week } = isoWeek(now);
    const weekTag = `${year}${String(week).padStart(2, "0")}`;

    let signalsInserted = 0;
    let signalsSkipped = 0;
    let emailsSent = 0;
    let emailsDeferred = 0;
    let emailsSkipped = 0;
    const errors: Array<{ sitter_id: string; error: string }> = [];

    for (const s of sitters) {
      // Signal admin
      const { error: insErr } = await service.from("admin_signals").insert({
        signal_type: "dormant_sitter",
        severity: "warning",
        entity_type: "profile",
        entity_id: s.sitter_id,
        metadata: {
          nature: "nurturing",
          first_name: s.sitter_first_name,
          email: s.sitter_email,
          days_since_signup: s.days_since_signup,
          profile_completion: s.profile_completion,
        },
      });
      if (insErr) {
        if (insErr.code === "23505" || insErr.message?.includes("idx_admin_signals_idempotent")) {
          signalsSkipped += 1;
        } else {
          errors.push({ sitter_id: s.sitter_id, error: insErr.message });
          continue;
        }
      } else {
        signalsInserted += 1;
      }

      // Email hebdomadaire
      if (!RESEND_API_KEY || !s.sitter_email) {
        emailsSkipped += 1;
        continue;
      }
      const email = s.sitter_email.trim().toLowerCase();
      const messageId = `dormant-sitter-${s.sitter_id}-${weekTag}`;

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
        .eq("user_id", s.sitter_id)
        .maybeSingle();
      if (pref && (pref as { product_emails: boolean | null }).product_emails === false) {
        emailsSkipped += 1;
        continue;
      }

      // Envoi via send-transactional-email : cap, suppression, opt-out categorie,
      // en-tetes List-Unsubscribe et pied de page tokenise centralises.
      const resp = await fetch(`${SUPABASE_URL}/functions/v1/send-transactional-email`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          apikey: SUPABASE_SERVICE_ROLE_KEY,
        },
        body: JSON.stringify({
          templateName: "dormant-sitter-nudge",
          recipientEmail: s.sitter_email,
          idempotencyKey: messageId,
          templateData: {
            firstName: s.sitter_first_name || "",
            days: s.days_since_signup,
          },
          logMetadata: { sitter_id: s.sitter_id, days_since_signup: s.days_since_signup },
        }),
      });
      if (!resp.ok) {
        console.error("[nudge-sitter-dormant] send failed", resp.status, await resp.text());
        emailsSkipped += 1;
        continue;
      }
      // Un HTTP 200 ne signifie pas envoye : le sender repond 200 avec
      // deferred:true quand il diffère et skipped:true quand il deduplique.
      const outcome = (await resp.json().catch(() => null)) as Record<string, unknown> | null;
      if (outcome?.deferred) emailsDeferred += 1;
      else if (outcome?.skipped) emailsSkipped += 1;
      else emailsSent += 1;
    }

    await run.finish(errors.length > 0 ? "partial" : "success", {
      detected: sitters.length,
      signals_inserted: signalsInserted,
      signals_skipped: signalsSkipped,
      emails_sent: emailsSent,
      emails_deferred: emailsDeferred,
      emails_skipped: emailsSkipped,
      errors_count: errors.length,
    });
    return new Response(
      JSON.stringify({
        detected: sitters.length,
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
    console.error("[nudge-sitter-dormant]", err);
    await run.fail(err);
    return new Response(
      JSON.stringify({ error: String((err as Error)?.message ?? err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
