import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { startCronRun } from "../_shared/cron-run-log.ts";


const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const GUIDE_MESSAGE =
  "Le guide de la maison est disponible. Vous y trouverez l'adresse exacte, les codes d'accès, les contacts utiles et toutes les consignes.";

const PHOTO_NUDGE_MESSAGE =
  "Une photo de temps en temps rassure beaucoup le propriétaire. Vous pouvez en envoyer directement dans cette conversation, avec le bouton en bas à gauche.";
const PHOTO_NUDGE_DEDUP = "%une photo de temps en temps rassure%";
const PHOTO_RECAP_DEDUP = "%vous avez partagé%pendant cette garde%";

function photoRecapMessage(count: number) {
  return count === 1
    ? "Vous avez partagé 1 photo pendant cette garde. Vous pouvez la garder dans votre galerie, elle restera rattachée à cette garde."
    : `Vous avez partagé ${count} photos pendant cette garde. Vous pouvez en garder dans votre galerie, elles resteront rattachées à cette garde.`;
}

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
    let guideMessagesBackfilled = 0;
    let photoNudgesPosted = 0;
    let photoRecapsPosted = 0;
    const errors: string[] = [];

    async function findConversation(sitId: string, sitterId: string) {
      const { data: conv } = await supabase
        .from("conversations")
        .select("id")
        .eq("sit_id", sitId)
        .eq("sitter_id", sitterId)
        .maybeSingle();
      return conv?.id ?? null;
    }

    async function alreadyPosted(conversationId: string, pattern: string) {
      const { data } = await supabase
        .from("messages")
        .select("id")
        .eq("conversation_id", conversationId)
        .eq("is_system", true)
        .ilike("content", pattern)
        .maybeSingle();
      return !!data;
    }

    async function postSystemMessage(conversationId: string, senderId: string, content: string) {
      await supabase.from("messages").insert({
        conversation_id: conversationId,
        sender_id: senderId,
        content,
        is_system: true,
      });
      await supabase
        .from("conversations")
        .update({ updated_at: new Date().toISOString() })
        .eq("id", conversationId);
    }

    // Nombre de photos envoyees par le gardien dans la conversation.
    async function countSitterPhotos(conversationId: string, sitterId: string) {
      const { count } = await supabase
        .from("messages")
        .select("id", { count: "exact", head: true })
        .eq("conversation_id", conversationId)
        .eq("sender_id", sitterId)
        .not("photo_url", "is", null);
      return count ?? 0;
    }

    // Recapitulatif de fin de garde : propose de conserver les photos partagees.
    async function postPhotoRecap(sit: { id: string; user_id: string }, sitterId: string) {
      const convId = await findConversation(sit.id, sitterId);
      if (!convId) return false;
      const photoCount = await countSitterPhotos(convId, sitterId);
      if (photoCount === 0) return false;
      if (await alreadyPosted(convId, PHOTO_RECAP_DEDUP)) return false;
      await postSystemMessage(convId, sit.user_id, photoRecapMessage(photoCount));
      return true;
    }


    // Poste le message systeme "guide disponible" si la conversation existe,
    // que le guide existe, et que le message n'a pas deja ete poste.
    async function postGuideMessage(sit: { id: string; user_id: string; property_id: string | null }, sitterId: string) {
      if (!sit.property_id) return false;
      const { data: guide } = await supabase
        .from("house_guides")
        .select("id")
        .eq("property_id", sit.property_id)
        .maybeSingle();
      if (!guide) return false;

      const { data: conv } = await supabase
        .from("conversations")
        .select("id")
        .eq("sit_id", sit.id)
        .eq("sitter_id", sitterId)
        .maybeSingle();
      if (!conv) return false;

      // Dedup : ne pas reinserer si un message identique existe deja.
      const { data: existing } = await supabase
        .from("messages")
        .select("id")
        .eq("conversation_id", conv.id)
        .eq("is_system", true)
        .ilike("content", "%le guide de la maison est disponible%")
        .maybeSingle();
      if (existing) return false;

      await supabase.from("messages").insert({
        conversation_id: conv.id,
        sender_id: sit.user_id,
        content: GUIDE_MESSAGE,
        is_system: true,
      });
      await supabase
        .from("conversations")
        .update({ updated_at: new Date().toISOString() })
        .eq("id", conv.id);
      return true;
    }

    // 1. Confirmed sits where start_date <= today -> in_progress
    const { data: toStart } = await supabase
      .from("sits")
      .select("id, title, user_id, start_date, property_id")
      .eq("status", "confirmed")
      .lte("start_date", today);

    for (const sit of toStart || []) {
      try {
        await supabase.from("sits").update({ status: "in_progress" as any }).eq("id", sit.id);

        // Notify owner
        await supabase.from("notifications").insert({
          user_id: sit.user_id,
          type: "sit_started",
          title: "Garde en cours",
          body: `Votre garde « ${sit.title} » a commencé aujourd'hui.`,
          link: `/sits/${sit.id}`,
        });

        // Notify accepted sitter(s) + message systeme "guide disponible"
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

          await postGuideMessage(sit, app.sitter_id);
        }
        transitioned++;
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        console.error("[auto-transition] start failed", sit.id, msg);
        errors.push(`start ${sit.id}: ${msg}`);
      }
    }

    // 2. In-progress sits where end_date < today -> completed
    const { data: toEnd } = await supabase
      .from("sits")
      .select("id, title, user_id, end_date")
      .eq("status", "in_progress")
      .lt("end_date", today);

    for (const sit of toEnd || []) {
      try {
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

          // Proposition de recuperation des photos partagees pendant la garde.
          try {
            const posted = await postPhotoRecap(sit, app.sitter_id);
            if (posted) photoRecapsPosted++;
          } catch (e) {
            const msg = e instanceof Error ? e.message : String(e);
            console.error("[auto-transition] photo recap failed", sit.id, msg);
            errors.push(`photo-recap ${sit.id}: ${msg}`);
          }
        }
        transitioned++;
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        console.error("[auto-transition] end failed", sit.id, msg);
        errors.push(`end ${sit.id}: ${msg}`);
      }
    }

    // 3. Passe de rattrapage idempotente : une garde peut avoir bascule en
    // 'in_progress' par un autre chemin, sans message systeme du guide.
    const { data: ongoing } = await supabase
      .from("sits")
      .select("id, title, user_id, property_id")
      .eq("status", "in_progress")
      .not("property_id", "is", null);

    for (const sit of ongoing || []) {
      try {
        const { data: apps } = await supabase
          .from("applications")
          .select("sitter_id")
          .eq("sit_id", sit.id)
          .eq("status", "accepted");

        for (const app of apps || []) {
          const posted = await postGuideMessage(sit, app.sitter_id);
          if (posted) guideMessagesBackfilled++;
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        console.error("[auto-transition] guide backfill failed", sit.id, msg);
        errors.push(`guide ${sit.id}: ${msg}`);
      }
    }

    await run.finish(errors.length > 0 ? "partial" : "success", {
      transitioned,
      guide_messages_backfilled: guideMessagesBackfilled,
      errors: errors.length,
      error_samples: errors.slice(0, 5),
    });
    return new Response(
      JSON.stringify({ transitioned, guide_messages_backfilled: guideMessagesBackfilled, errors: errors.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    await run.fail(e);
    throw e;
  }
});
