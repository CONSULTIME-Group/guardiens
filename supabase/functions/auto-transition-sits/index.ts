import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { startCronRun } from "../_shared/cron-run-log.ts";


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

  // Restrict to service-role callers (pg_cron / pg_net only).
  const token = req.headers.get("Authorization")?.replace("Bearer ", "");
  if (token !== serviceKey) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(supabaseUrl, serviceKey);
  const run = await startCronRun("auto-transition-sits");

  try {
    const today = new Date().toISOString().split("T")[0];
    let transitioned = 0;

    // 1. Confirmed sits where start_date <= today → in_progress

  const { data: toStart } = await supabase
    .from("sits")
    .select("id, title, user_id, start_date, property_id")
    .eq("status", "confirmed")
    .lte("start_date", today);

  for (const sit of toStart || []) {
    await supabase.from("sits").update({ status: "in_progress" as any }).eq("id", sit.id);

    // Notify owner
    await supabase.from("notifications").insert({
      user_id: sit.user_id,
      type: "sit_started",
      title: "Garde en cours",
      body: `Votre garde « ${sit.title} » a commencé aujourd'hui.`,
      link: `/sits/${sit.id}`,
    });

    // Guide de la maison : disponible désormais (accès RLS ouvert à start_date).
    let guideAvailable = false;
    if (sit.property_id) {
      const { data: guide } = await supabase
        .from("house_guides")
        .select("id")
        .eq("property_id", sit.property_id)
        .maybeSingle();
      guideAvailable = !!guide;
    }

    // Notify accepted sitter(s) + message système "guide disponible" dans la conversation
    const { data: apps } = await supabase
      .from("applications")
      .select("sitter_id")
      .eq("sit_id", sit.id)
      .eq("status", "accepted");

    for (const app of apps || []) {
      await supabase.from("notifications").insert({
        user_id: app.sitter_id,
        type: "sit_started",
        title: "Garde en cours",
        body: `La garde « ${sit.title} » commence aujourd'hui. Bonne garde !`,
        link: `/sits/${sit.id}`,
      });

      if (guideAvailable) {
        const { data: conv } = await supabase
          .from("conversations")
          .select("id")
          .eq("sit_id", sit.id)
          .eq("sitter_id", app.sitter_id)
          .maybeSingle();
        if (conv) {
          // Dédup : ne pas réinsérer si un message identique existe déjà.
          const { data: existing } = await supabase
            .from("messages")
            .select("id")
            .eq("conversation_id", conv.id)
            .eq("is_system", true)
            .ilike("content", "%le guide de la maison est disponible%")
            .maybeSingle();
          if (!existing) {
            await supabase.from("messages").insert({
              conversation_id: conv.id,
              sender_id: sit.user_id,
              content: "Le guide de la maison est disponible. Vous y trouverez l'adresse exacte, les codes d'accès, les contacts utiles et toutes les consignes.",
              is_system: true,
            });
            await supabase
              .from("conversations")
              .update({ updated_at: new Date().toISOString() })
              .eq("id", conv.id);
          }
        }
      }
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

    await run.finish("success", { transitioned });
    return new Response(JSON.stringify({ transitioned }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    await run.fail(e);
    throw e;
  }
});

