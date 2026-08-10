/**
 * close-orphan-applications
 *
 * Solde les candidatures restées en attente (pending, viewed, discussing) sur
 * une annonce annulée, archivée ou expirée depuis plus de 24 heures. Le délai
 * de grâce laisse le temps d'une annulation faite par erreur.
 *
 * Notification in-app uniquement par défaut. L'envoi email est piloté par le
 * drapeau de configuration `close_orphan_emails` dans public.feature_flags,
 * activable sans redéploiement.
 *
 * Cron quotidien. Appel réservé au service role.
 */
import { createClient } from "npm:@supabase/supabase-js@2.45.0";
import { startCronRun, describeError, type CronRun } from "../_shared/cron-run-log.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const TEMPLATE = "application-closed-listing-withdrawn";
const GRACE_HOURS = 24;
const EMAIL_FLAG_KEY = "close_orphan_emails";

interface ClosedApp {
  application_id: string;
  sit_id: string;
  sit_title: string | null;
  sit_status: string | null;
  sitter_id: string;
  sitter_first_name: string | null;
  sitter_email: string | null;
  owner_first_name: string | null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const token = req.headers.get("Authorization")?.replace("Bearer ", "") ?? "";
  if (token !== SERVICE_KEY) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let run: CronRun | null = null;
  try {
    run = await startCronRun("close-orphan-applications");
    const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

    // Drapeau de configuration : envoi email désactivé par défaut.
    const { data: flag } = await supabase
      .from("feature_flags")
      .select("enabled")
      .eq("key", EMAIL_FLAG_KEY)
      .maybeSingle();
    const emailsEnabled = (flag as { enabled?: boolean } | null)?.enabled === true;

    const { data, error } = await supabase.rpc("close_orphan_applications", {
      p_grace_hours: GRACE_HOURS,
    });
    if (error) throw error;
    const closed: ClosedApp[] = (data as ClosedApp[]) ?? [];

    let notificationsSent = 0;
    let emailsSent = 0;
    let emailsFailed = 0;
    const errors: Array<{ application_id: string; error: string }> = [];

    for (const app of closed) {
      // 1. Notification in-app, message neutre, lien vers les gardes ouvertes.
      const { error: notifError } = await supabase.from("notifications").insert({
        user_id: app.sitter_id,
        type: "application_closed",
        title: "Candidature clôturée",
        body: app.sit_title
          ? `L'annonce « ${app.sit_title} » n'est plus active. Votre candidature a été clôturée. D'autres gardes sont ouvertes.`
          : "Cette annonce n'est plus active. Votre candidature a été clôturée. D'autres gardes sont ouvertes.",
        link: "/search",
      });
      if (notifError) {
        errors.push({
          application_id: app.application_id,
          error: `notify_failed: ${describeError(notifError)}`,
        });
        console.error("[close-orphan-applications] notify failed", describeError(notifError));
      } else {
        notificationsSent += 1;
      }

      // 2. Email, uniquement si le drapeau de configuration est actif.
      if (!emailsEnabled || !app.sitter_email) continue;

      const { data: sit } = await supabase
        .from("sits")
        .select("city")
        .eq("id", app.sit_id)
        .maybeSingle();

      const resp = await fetch(`${SUPABASE_URL}/functions/v1/send-transactional-email`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${SERVICE_KEY}`,
          apikey: SERVICE_KEY,
        },
        body: JSON.stringify({
          templateName: TEMPLATE,
          recipientEmail: app.sitter_email.trim().toLowerCase(),
          idempotencyKey: `application-closed-${app.application_id}`,
          templateData: {
            sitterFirstName: app.sitter_first_name || "",
            sitTitle: app.sit_title || "",
            sitCity: (sit as { city?: string } | null)?.city || "",
            sitStatus: app.sit_status || "cancelled",
          },
          logMetadata: {
            application_id: app.application_id,
            sit_id: app.sit_id,
            sitter_id: app.sitter_id,
            sit_status: app.sit_status,
            source: "close-orphan-applications",
          },
        }),
      });
      if (!resp.ok) {
        emailsFailed += 1;
        const body = await resp.text().catch(() => "");
        errors.push({ application_id: app.application_id, error: `send_failed_${resp.status}` });
        console.error("[close-orphan-applications] send failed", resp.status, body);
        continue;
      }
      emailsSent += 1;
    }

    const summary = {
      closed: closed.length,
      notifications_sent: notificationsSent,
      emails_enabled: emailsEnabled,
      emails_sent: emailsSent,
      emails_failed: emailsFailed,
      errors_count: errors.length,
    };
    if (run) await run.finish(errors.length > 0 ? "partial" : "success", summary);

    return new Response(JSON.stringify({ ok: true, ...summary, errors }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[close-orphan-applications]", err);
    if (run) await run.fail(err);
    return new Response(JSON.stringify({ error: describeError(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
