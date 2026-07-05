// send-sit-draft-reminder
// Envoie un email J+1 aux owners ayant un sit en status='draft' créé la veille
// et jamais publié. Anti-doublon via email_send_log (template_name + recipient).
// Déclenchement : cron quotidien 10h Europe/Paris (à planifier via pg_cron).

import { createClient } from "npm:@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const TEMPLATE = "sit-draft-reminder";
const TOTAL_FIELDS = 8;

function countRemaining(sit: Record<string, any>): number {
  const filled = [
    sit.title,
    sit.start_date,
    sit.end_date,
    sit.specific_expectations,
    Array.isArray(sit.environments) && sit.environments.length > 0,
    sit.city,
    sit.owner_message,
    sit.daily_routine,
  ].filter((v) => (typeof v === "string" ? v.trim().length > 0 : !!v)).length;
  return Math.max(0, TOTAL_FIELDS - filled);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const now = Date.now();
  const minDate = new Date(now - 2 * 24 * 60 * 60 * 1000).toISOString();
  const maxDate = new Date(now - 24 * 60 * 60 * 1000).toISOString();

  // Récupérer les drafts créés entre J-2 et J-1
  const { data: drafts, error } = await supabase
    .from("sits")
    .select("id, user_id, title, start_date, end_date, specific_expectations, environments, city, owner_message, daily_routine, created_at")
    .eq("status", "draft")
    .gte("created_at", minDate)
    .lt("created_at", maxDate);

  if (error) {
    console.error("[sit-draft-reminder] fetch drafts failed", error);
    return new Response(JSON.stringify({ error: "fetch_failed" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (!drafts || drafts.length === 0) {
    return new Response(JSON.stringify({ ok: true, sent: 0, skipped: 0 }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let sent = 0;
  let skipped = 0;
  const errors: Array<{ sit_id: string; reason: string }> = [];

  for (const draft of drafts) {
    try {
      // Vérifier : owner n'a jamais publié
      const { count: publishedCount } = await supabase
        .from("sits")
        .select("id", { count: "exact", head: true })
        .eq("user_id", draft.user_id)
        .in("status", ["published", "confirmed", "completed"]);
      if ((publishedCount ?? 0) > 0) {
        skipped++;
        continue;
      }

      // Charger le profil
      const { data: profile } = await supabase
        .from("profiles")
        .select("email, first_name")
        .eq("id", draft.user_id)
        .maybeSingle();
      if (!profile?.email) {
        skipped++;
        continue;
      }

      // Anti-doublon : 1 envoi max par sit
      const { count: alreadySent } = await supabase
        .from("email_send_log")
        .select("id", { count: "exact", head: true })
        .eq("template_name", TEMPLATE)
        .eq("recipient_email", profile.email);
      if ((alreadySent ?? 0) > 0) {
        skipped++;
        continue;
      }

      // Respect des préférences email
      const { data: prefs } = await supabase
        .from("email_preferences")
        .select("marketing_enabled, transactional_enabled")
        .eq("user_id", draft.user_id)
        .maybeSingle();
      if (prefs && (prefs as any).transactional_enabled === false) {
        skipped++;
        continue;
      }

      const fieldsRemaining = countRemaining(draft as Record<string, any>);
      const resumeUrl = `https://guardiens.fr/sits/create?resume=${draft.id}`;

      const { error: sendErr } = await supabase.functions.invoke("send-transactional-email", {
        body: {
          templateName: TEMPLATE,
          recipientEmail: profile.email,
          idempotencyKey: `sit-draft-reminder-${draft.id}`,
          templateData: {
            firstName: profile.first_name || "",
            sitId: draft.id,
            fieldsRemaining,
            nearbySittersCount: 0,
            resumeUrl,
          },
        },
      });
      if (sendErr) {
        errors.push({ sit_id: draft.id, reason: sendErr.message });
        continue;
      }
      sent++;
    } catch (e: any) {
      errors.push({ sit_id: draft.id, reason: e?.message ?? "unknown" });
    }
  }

  return new Response(
    JSON.stringify({ ok: true, sent, skipped, total: drafts.length, errors }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});
