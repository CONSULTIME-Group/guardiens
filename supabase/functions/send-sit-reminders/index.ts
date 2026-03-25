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

  const now = new Date();
  const in7days = new Date(now);
  in7days.setDate(in7days.getDate() + 7);
  const in2days = new Date(now);
  in2days.setDate(in2days.getDate() + 2);

  const formatDate = (d: Date) => d.toISOString().split("T")[0];

  // Find sits starting in exactly 7 days or 2 days
  const { data: sits } = await supabase
    .from("sits")
    .select("id, title, start_date, end_date, user_id, status")
    .in("status", ["confirmed", "published"])
    .or(
      `start_date.eq.${formatDate(in7days)},start_date.eq.${formatDate(in2days)}`
    );

  if (!sits || sits.length === 0) {
    return new Response(JSON.stringify({ processed: 0 }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let count = 0;

  for (const sit of sits) {
    const daysUntil =
      Math.round(
        (new Date(sit.start_date).getTime() - now.getTime()) /
          (1000 * 60 * 60 * 24)
      );
    const reminderType =
      daysUntil <= 2 ? "reminder_48h" : "reminder_7days";
    const reminderText =
      daysUntil <= 2
        ? "commence dans 48h"
        : "commence dans 7 jours";

    // Check if reminder already sent
    const { data: existing } = await supabase
      .from("notifications")
      .select("id")
      .eq("user_id", sit.user_id)
      .eq("type", reminderType)
      .like("link", `%${sit.id}%`)
      .limit(1);

    if (existing && existing.length > 0) continue;

    // Notify owner
    await supabase.from("notifications").insert({
      user_id: sit.user_id,
      type: reminderType,
      title: daysUntil <= 2 ? "Garde dans 48h !" : "Garde dans 7 jours",
      body: `Votre garde « ${sit.title} » ${reminderText}.`,
      link: `/sits/${sit.id}`,
    });
    count++;

    // Notify accepted sitter
    if (sit.status === "confirmed") {
      const { data: apps } = await supabase
        .from("applications")
        .select("sitter_id")
        .eq("sit_id", sit.id)
        .eq("status", "accepted");

      for (const app of apps || []) {
        const { data: existingSitter } = await supabase
          .from("notifications")
          .select("id")
          .eq("user_id", app.sitter_id)
          .eq("type", reminderType)
          .like("link", `%${sit.id}%`)
          .limit(1);

        if (existingSitter && existingSitter.length > 0) continue;

        await supabase.from("notifications").insert({
          user_id: app.sitter_id,
          type: reminderType,
          title: daysUntil <= 2 ? "Garde dans 48h !" : "Garde dans 7 jours",
          body: `Votre garde « ${sit.title} » ${reminderText}.`,
          link: `/sits/${sit.id}`,
        });
        count++;
      }
    }
  }

  return new Response(JSON.stringify({ processed: count }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
