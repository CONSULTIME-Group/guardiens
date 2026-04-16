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
  const d5ago = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
  const d6ago = new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

  const { data: sits } = await supabase
    .from("sits")
    .select("id, title, end_date, user_id")
    .eq("status", "completed")
    .eq("review_j1_sent", true)
    .eq("review_j5_sent", false)
    .gte("end_date", d6ago)
    .lte("end_date", d5ago);

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

    const parties = [
      { id: sit.user_id, profile: ownerProfile, isOwner: true },
      ...(sitterId && sitterProfile ? [{ id: sitterId, profile: sitterProfile, isOwner: false }] : []),
    ];

    for (const party of parties) {
      // Skip if already reviewed
      const { data: existingReview } = await supabase
        .from("reviews")
        .select("id")
        .eq("sit_id", sit.id)
        .eq("reviewer_id", party.id)
        .limit(1);

      if (existingReview && existingReview.length > 0) continue;

      const otherName = party.isOwner
        ? (sitterProfile?.first_name || "")
        : (ownerProfile?.first_name || "");

      if (party.profile?.email) {
        await supabase.functions.invoke("send-transactional-email", {
          body: {
            templateName: "review-reminder",
            recipientEmail: party.profile.email,
            idempotencyKey: `review-j5-${party.id}-${sit.id}`,
            templateData: {
              firstName: party.profile.first_name || "",
              sitTitle: sit.title || "",
              revieweeName: otherName,
              sitId: sit.id,
              isOwner: party.isOwner,
            },
          },
        });
        count++;
      }
    }

    await supabase.from("sits").update({ review_j5_sent: true }).eq("id", sit.id);
  }

  return new Response(JSON.stringify({ sent: count }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
