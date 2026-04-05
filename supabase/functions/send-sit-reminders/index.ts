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
  const formatDate = (d: Date) => d.toISOString().split("T")[0];

  // ── Pre-garde reminders (J-7 and J-2) ──
  const in7days = new Date(now);
  in7days.setDate(in7days.getDate() + 7);
  const in2days = new Date(now);
  in2days.setDate(in2days.getDate() + 2);

  const { data: upcomingSits } = await supabase
    .from("sits")
    .select("id, title, start_date, end_date, user_id, status")
    .in("status", ["confirmed", "published"])
    .or(
      `start_date.eq.${formatDate(in7days)},start_date.eq.${formatDate(in2days)}`
    );

  let count = 0;

  for (const sit of upcomingSits || []) {
    const daysUntil = Math.round(
      (new Date(sit.start_date).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    );
    const reminderType = daysUntil <= 2 ? "reminder_48h" : "reminder_7days";
    const reminderText = daysUntil <= 2 ? "commence dans 48h" : "commence dans 7 jours";

    // Check if already sent
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

  // ── Post-garde review reminders (J+1 and J+5 after end_date) ──
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const fiveDaysAgo = new Date(now);
  fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5);

  const { data: completedSits } = await supabase
    .from("sits")
    .select("id, title, end_date, user_id, status")
    .in("status", ["completed", "confirmed"])
    .or(
      `end_date.eq.${formatDate(yesterday)},end_date.eq.${formatDate(fiveDaysAgo)}`
    );

  for (const sit of completedSits || []) {
    const daysSinceEnd = Math.round(
      (now.getTime() - new Date(sit.end_date).getTime()) / (1000 * 60 * 60 * 24)
    );
    const isJ1 = daysSinceEnd === 1;
    const isJ5 = daysSinceEnd === 5;
    if (!isJ1 && !isJ5) continue;

    const reminderType = isJ1 ? "review_reminder_j1" : "review_reminder_j5";

    // Get accepted sitter
    const { data: apps } = await supabase
      .from("applications")
      .select("sitter_id")
      .eq("sit_id", sit.id)
      .eq("status", "accepted");

    const sitterId = apps?.[0]?.sitter_id;
    const parties = [
      { userId: sit.user_id, role: "owner" },
      ...(sitterId ? [{ userId: sitterId, role: "sitter" }] : []),
    ];

    for (const party of parties) {
      // Check if review already submitted
      const { data: existingReview } = await supabase
        .from("reviews")
        .select("id")
        .eq("sit_id", sit.id)
        .eq("reviewer_id", party.userId)
        .limit(1);

      if (existingReview && existingReview.length > 0) continue;

      // Check if reminder already sent
      const { data: existingNotif } = await supabase
        .from("notifications")
        .select("id")
        .eq("user_id", party.userId)
        .eq("type", reminderType)
        .like("link", `%${sit.id}%`)
        .limit(1);

      if (existingNotif && existingNotif.length > 0) continue;

      const title = isJ1
        ? "Comment s'est passée la garde ?"
        : "N'oubliez pas votre avis !";
      const body = isJ1
        ? `La garde « ${sit.title} » est terminée. Partagez votre expérience en laissant un avis.`
        : `Vous n'avez pas encore laissé d'avis pour « ${sit.title} ». Votre retour aide toute la communauté.`;

      await supabase.from("notifications").insert({
        user_id: party.userId,
        type: reminderType,
        title,
        body,
        link: `/review/${sit.id}`,
      });
      count++;

      // Send transactional email for review reminders
      const templateName = isJ1 ? "review-reminder" : "review-reminder";
      try {
        await supabase.functions.invoke("send-transactional-email", {
          body: {
            template_name: templateName,
            recipient_user_id: party.userId,
            data: {
              sit_title: sit.title,
              sit_id: sit.id,
              is_relance: isJ5,
            },
            idempotency_key: `${reminderType}-${sit.id}-${party.userId}`,
            purpose: "transactional",
          },
        });
      } catch {
        // Email sending is best-effort, don't block on failure
      }
    }
  }

  return new Response(JSON.stringify({ processed: count }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
