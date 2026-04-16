import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  const now = new Date();
  const h24ago = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString().split("T")[0];
  const h48ago = new Date(now.getTime() - 48 * 60 * 60 * 1000).toISOString().split("T")[0];

  const { data: sits } = await supabase
    .from("sits")
    .select("id, title, end_date, user_id, status")
    .in("status", ["confirmed", "completed"])
    .eq("review_j1_sent", false)
    .gte("end_date", h48ago)
    .lte("end_date", h24ago);

  let count = 0;

  for (const sit of sits || []) {
    const { data: apps } = await supabase
      .from("applications")
      .select("sitter_id")
      .eq("sit_id", sit.id)
      .eq("status", "accepted");

    const sitterId = apps?.[0]?.sitter_id;

    const { data: ownerProfile } = await supabase
      .from("profiles")
      .select("first_name, email")
      .eq("id", sit.user_id)
      .single();

    const sitterProfile = sitterId
      ? (await supabase.from("profiles").select("first_name, email").eq("id", sitterId).single()).data
      : null;

    // Transition to completed if still confirmed
    if (sit.status === "confirmed") {
      await supabase.from("sits").update({ status: "completed" }).eq("id", sit.id);
    }

    // Email owner via transactional email system
    if (ownerProfile?.email) {
      await supabase.functions.invoke("send-transactional-email", {
        body: {
          templateName: "review-reminder",
          recipientEmail: ownerProfile.email,
          idempotencyKey: `review-j1-owner-${sit.id}`,
          templateData: {
            firstName: ownerProfile.first_name || "",
            sitTitle: sit.title || "",
            revieweeName: sitterProfile?.first_name || "",
            sitId: sit.id,
            isOwner: true,
          },
        },
      });
      count++;
    }

    // Email sitter via transactional email system
    if (sitterProfile?.email) {
      await supabase.functions.invoke("send-transactional-email", {
        body: {
          templateName: "review-reminder",
          recipientEmail: sitterProfile.email,
          idempotencyKey: `review-j1-sitter-${sit.id}`,
          templateData: {
            firstName: sitterProfile.first_name || "",
            sitTitle: sit.title || "",
            revieweeName: ownerProfile?.first_name || "",
            sitId: sit.id,
            isOwner: false,
          },
        },
      });
      count++;
    }

    await supabase.from("sits").update({ review_j1_sent: true }).eq("id", sit.id);
  }

  return new Response(JSON.stringify({ sent: count }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
