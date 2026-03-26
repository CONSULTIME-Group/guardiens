import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceKey);

  const today = new Date().toISOString().split("T")[0];
  let transitioned = 0;

  // 1. Confirmed sits where start_date <= today → in_progress
  const { data: toStart } = await supabase
    .from("sits")
    .select("id, title, user_id, start_date")
    .eq("status", "confirmed")
    .lte("start_date", today);

  for (const sit of toStart || []) {
    await supabase.from("sits").update({ status: "in_progress" as any }).eq("id", sit.id);

    // Notify owner
    await supabase.from("notifications").insert({
      user_id: sit.user_id,
      type: "sit_started",
      title: "Garde en cours !",
      body: `Votre garde « ${sit.title} » a commencé aujourd'hui.`,
      link: `/sits/${sit.id}`,
    });

    // Notify accepted sitter
    const { data: apps } = await supabase
      .from("applications")
      .select("sitter_id")
      .eq("sit_id", sit.id)
      .eq("status", "accepted");

    for (const app of apps || []) {
      await supabase.from("notifications").insert({
        user_id: app.sitter_id,
        type: "sit_started",
        title: "Garde en cours !",
        body: `La garde « ${sit.title} » commence aujourd'hui. Bonne garde !`,
        link: `/sits/${sit.id}`,
      });
    }
    transitioned++;
  }

  // 2. In-progress sits where end_date < today → completed
  const { data: toEnd } = await supabase
    .from("sits")
    .select("id, title, user_id, end_date")
    .eq("status", "in_progress")
    .lt("end_date", today);

  for (const sit of toEnd || []) {
    await supabase.from("sits").update({ status: "completed" as any }).eq("id", sit.id);

    // Notify owner
    await supabase.from("notifications").insert({
      user_id: sit.user_id,
      type: "sit_completed",
      title: "Garde terminée !",
      body: `Votre garde « ${sit.title} » est terminée. Pensez à laisser un avis !`,
      link: `/review/${sit.id}`,
    });

    // Notify accepted sitter
    const { data: apps } = await supabase
      .from("applications")
      .select("sitter_id")
      .eq("sit_id", sit.id)
      .eq("status", "accepted");

    for (const app of apps || []) {
      await supabase.from("notifications").insert({
        user_id: app.sitter_id,
        type: "sit_completed",
        title: "Garde terminée !",
        body: `La garde « ${sit.title} » est terminée. Pensez à laisser un avis !`,
        link: `/review/${sit.id}`,
      });
    }
    transitioned++;
  }

  return new Response(JSON.stringify({ transitioned }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
