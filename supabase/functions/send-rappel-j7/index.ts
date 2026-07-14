import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { startCronRun } from "../_shared/cron-run-log.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(SUPABASE_URL, SERVICE_KEY);
  const run = await startCronRun("send-rappel-j7");

  try {
    const in7 = new Date();
    in7.setDate(in7.getDate() + 7);
    const targetDate = in7.toISOString().split("T")[0];

    const { data: sits } = await supabase
      .from("sits")
      .select("id, title, start_date, user_id")
      .eq("status", "confirmed")
      .eq("reminder_j7_sent", false)
      .eq("start_date", targetDate);

    let sent = 0;

    for (const sit of sits || []) {
      const { data: apps } = await supabase
        .from("applications")
        .select("sitter_id")
        .eq("sit_id", sit.id)
        .eq("status", "accepted");
      const sitterId = apps?.[0]?.sitter_id ?? null;

      const { data: ownerProfile } = await supabase
        .from("profiles").select("first_name, email").eq("id", sit.user_id).maybeSingle();
      const sitterProfile = sitterId
        ? (await supabase.from("profiles").select("first_name, email").eq("id", sitterId).maybeSingle()).data
        : null;

      const startDateFr = new Date(sit.start_date).toLocaleDateString("fr-FR", {
        day: "numeric", month: "long", year: "numeric",
      });

      const invokeSend = async (payload: Record<string, unknown>) => {
        const res = await fetch(`${SUPABASE_URL}/functions/v1/send-transactional-email`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${SERVICE_KEY}`,
          },
          body: JSON.stringify(payload),
        });
        if (res.ok) sent++;
        else console.error("[rappel-j7] send failed", res.status, await res.text().catch(() => ""));
      };

      if (ownerProfile?.email) {
        await invokeSend({
          templateName: "sit-reminder-j7",
          recipientEmail: ownerProfile.email,
          idempotencyKey: `sit-reminder-j7-owner-${sit.id}`,
          templateData: {
            firstName: ownerProfile.first_name || "",
            role: "owner",
            counterpartFirstName: sitterProfile?.first_name || "",
            sitTitle: sit.title,
            startDateFr,
            sitId: sit.id,
          },
        });
      }

      if (sitterProfile?.email) {
        await invokeSend({
          templateName: "sit-reminder-j7",
          recipientEmail: sitterProfile.email,
          idempotencyKey: `sit-reminder-j7-sitter-${sit.id}`,
          templateData: {
            firstName: sitterProfile.first_name || "",
            role: "sitter",
            counterpartFirstName: ownerProfile?.first_name || "",
            sitTitle: sit.title,
            startDateFr,
            sitId: sit.id,
          },
        });
      }

      await supabase.from("sits").update({ reminder_j7_sent: true }).eq("id", sit.id);
    }

    await run.finish("success", { sent });
    return new Response(JSON.stringify({ sent }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    await run.fail(e);
    throw e;
  }
});
