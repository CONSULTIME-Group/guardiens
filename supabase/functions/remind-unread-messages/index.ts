/**
 * remind-unread-messages
 *
 * Cron quotidien (16h UTC, 18h Paris été) : envoie un email de relance
 * au destinataire d'un message resté non lu depuis plus de 24 heures.
 *
 * Règles :
 *  - Un seul email par conversation ET par message déclencheur.
 *    Idempotence : `conversations.unread_reminder_sent_at` doit être <
 *    au created_at du dernier message unread.
 *  - Pas de relance si l'email `new-message` initial est parti il y a
 *    moins de 24h (déjà couvert par la fenêtre >24h + ceinture sur
 *    email_send_log en secours).
 *  - Messages système exclus.
 *  - Idempotency send : `unread-reminder-<message_id>`.
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { startCronRun } from "../_shared/cron-run-log.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const run = await startCronRun("remind-unread-messages");
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  let sent = 0;
  let skipped = 0;
  let failed = 0;

  try {
    // 1) Conversations candidates : dernier message unread, non-système,
    //    créé il y a >24h, pas encore relancé pour ce message.
    const { data: convs, error: convErr } = await supabase
      .from("conversations")
      .select("id, owner_id, sitter_id, sit_id, small_mission_id, context_type, unread_reminder_sent_at, last_message_at")
      .lt("last_message_at", cutoff);

    if (convErr) throw convErr;

    for (const conv of convs ?? []) {
      // Récupère le dernier message non-système de la conversation
      const { data: lastMsg } = await supabase
        .from("messages")
        .select("id, sender_id, content, created_at, read_at, is_system")
        .eq("conversation_id", conv.id)
        .eq("is_system", false)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!lastMsg || lastMsg.read_at || new Date(lastMsg.created_at) > new Date(cutoff)) {
        skipped++;
        continue;
      }

      // Déjà relancé pour ce message ?
      if (conv.unread_reminder_sent_at &&
          new Date(conv.unread_reminder_sent_at) >= new Date(lastMsg.created_at)) {
        skipped++;
        continue;
      }

      // Ceinture : new-message email pour ce message il y a <24h ?
      // (le champ email_send_log.message_id porte l'idempotency key)
      const { data: recentNewMsg } = await supabase
        .from("email_send_log")
        .select("id, created_at")
        .eq("template_name", "new-message")
        .in("status", ["sent", "pending"])
        .eq("message_id", `msg_${lastMsg.id}`)
        .gte("created_at", cutoff)
        .limit(1);

      if (recentNewMsg && recentNewMsg.length > 0) {
        skipped++;
        continue;
      }

      // Destinataire = l'autre partie
      const recipientId = lastMsg.sender_id === conv.owner_id ? conv.sitter_id : conv.owner_id;
      const recipientRole: "owner" | "sitter" = recipientId === conv.owner_id ? "owner" : "sitter";

      const [{ data: sender }, { data: recipient }] = await Promise.all([
        supabase.from("profiles").select("first_name").eq("id", lastMsg.sender_id).maybeSingle(),
        supabase.from("profiles").select("email, first_name").eq("id", recipientId).maybeSingle(),
      ]);

      if (!recipient?.email) { skipped++; continue; }

      // Construction du label contextuel
      let contextLabel: string | undefined;
      if (conv.sit_id) {
        const { data: sit } = await supabase
          .from("sits").select("title").eq("id", conv.sit_id).maybeSingle();
        if (sit?.title) {
          const possessive = recipientRole === "owner" ? "votre annonce" : "l'annonce";
          contextLabel = `${possessive} « ${sit.title} »`;
        }
      } else if (conv.small_mission_id) {
        const { data: m } = await supabase
          .from("small_missions").select("title").eq("id", conv.small_mission_id).maybeSingle();
        if (m?.title) {
          const possessive = recipientRole === "owner" ? "votre entraide" : "l'entraide";
          contextLabel = `${possessive} « ${m.title} »`;
        }
      }

      const { error: sendErr } = await supabase.functions.invoke("send-transactional-email", {
        body: {
          templateName: "unread-messages-reminder",
          recipientEmail: recipient.email,
          idempotencyKey: `unread-reminder-${lastMsg.id}`,
          templateData: {
            firstName: recipient.first_name ?? null,
            unreadCount: 1,
            conversationsCount: 1,
            oldestUnreadDays: Math.max(1, Math.floor((Date.now() - new Date(lastMsg.created_at).getTime()) / (24 * 3600 * 1000))),
            topSenderFirstName: sender?.first_name ?? "Un membre",
            conversationUrl: `https://guardiens.fr/messages?c=${conv.id}`,
            contextLabel: contextLabel ?? null,
          },
        },
      });

      if (sendErr) {
        failed++;
        console.error("send failed", { conv: conv.id, err: sendErr.message });
        continue;
      }

      await supabase
        .from("conversations")
        .update({ unread_reminder_sent_at: new Date().toISOString() })
        .eq("id", conv.id);
      sent++;
    }

    await run.finish("success", { sent, skipped, failed, scanned: convs?.length ?? 0 });
    return new Response(JSON.stringify({ success: true, sent, skipped, failed }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    await run.fail(e, { sent, skipped, failed });
    console.error("remind-unread-messages failed", e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
