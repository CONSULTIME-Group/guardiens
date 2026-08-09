/**
 * remind-unread-messages
 *
 * Cron quotidien (16h UTC, 18h Paris été) : envoie une relance email au
 * destinataire quand il reste au moins un message non lu dans le fil,
 * plus récent que son propre dernier message envoyé (« la balle est
 * dans son camp et il ne l'a pas vue »).
 *
 * Règles :
 *  - Fenêtre : message déclencheur créé entre 24h et 96h.
 *  - Idempotence par conversation via `unread_reminder_sent_at` :
 *    on ne renvoie que si un nouveau message non lu est arrivé APRÈS
 *    la dernière relance.
 *  - Idempotency send : `unread-reminder-<conv>-<message_id>`.
 *  - Messages système exclus. Quiet hours / anti-spam gérés par
 *    send-transactional-email.
 */
import { recordDeliveryFailure } from "../_shared/delivery-failure.ts";
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

  const now = Date.now();
  const cutoff24 = new Date(now - 24 * 60 * 60 * 1000).toISOString();
  const cutoff96 = new Date(now - 96 * 60 * 60 * 1000).toISOString();
  const SEND_CAP = 200;
  let sent = 0;
  let skipped = 0;
  let failed = 0;
  let capReached = false;

  try {
    // 1) Conversations candidates (dernier message dans la fenêtre 24-96h).
    const { data: convs, error: convErr } = await supabase
      .from("conversations")
      .select("id, owner_id, sitter_id, sit_id, small_mission_id, context_type, unread_reminder_sent_at, last_message_at")
      .lt("last_message_at", cutoff24)
      .gt("last_message_at", cutoff96);

    if (convErr) throw convErr;

    for (const conv of convs ?? []) {
      if (sent >= SEND_CAP) { capReached = true; break; }

      // 2) Trouve le message non lu le plus récent, non-système,
      //    envoyé par l'AUTRE partie (owner ↔ sitter), dans la fenêtre.
      const { data: unreadMsgs } = await supabase
        .from("messages")
        .select("id, sender_id, content, created_at")
        .eq("conversation_id", conv.id)
        .eq("is_system", false)
        .is("read_at", null)
        .gte("created_at", cutoff96)
        .lte("created_at", cutoff24)
        .order("created_at", { ascending: false })
        .limit(5);

      const triggerMsg = (unreadMsgs ?? []).find(
        (m) => m.sender_id === conv.owner_id || m.sender_id === conv.sitter_id,
      );
      if (!triggerMsg) { skipped++; continue; }

      const recipientId = triggerMsg.sender_id === conv.owner_id ? conv.sitter_id : conv.owner_id;
      const recipientRole: "owner" | "sitter" = recipientId === conv.owner_id ? "owner" : "sitter";

      // 3) Le destinataire a-t-il répondu APRÈS ce message ? Alors la
      //    balle n'est plus dans son camp → skip.
      const { count: laterReplies } = await supabase
        .from("messages")
        .select("id", { count: "exact", head: true })
        .eq("conversation_id", conv.id)
        .eq("sender_id", recipientId)
        .eq("is_system", false)
        .gt("created_at", triggerMsg.created_at);
      if ((laterReplies ?? 0) > 0) { skipped++; continue; }

      // 4) Idempotence : ne renvoie que si un message non lu est arrivé
      //    APRÈS la dernière relance de cette conversation.
      if (
        conv.unread_reminder_sent_at &&
        new Date(conv.unread_reminder_sent_at) >= new Date(triggerMsg.created_at)
      ) {
        skipped++;
        continue;
      }

      // 5) Candidatures : ne pas relancer le proprio si la candidature
      //    n'est plus en pending/viewed (déjà décidée).
      if (conv.context_type === "sit_application" && conv.sit_id && recipientRole === "owner") {
        const { data: app } = await supabase
          .from("applications")
          .select("status")
          .eq("sit_id", conv.sit_id)
          .eq("sitter_id", triggerMsg.sender_id)
          .in("status", ["pending", "viewed"])
          .maybeSingle();
        if (!app) { skipped++; continue; }
      }

      // 6) Ceinture : new-message email pour CE message envoyé il y a <24h ?
      const { data: recentNewMsg } = await supabase
        .from("email_send_log")
        .select("id, created_at")
        .eq("template_name", "new-message")
        .in("status", ["sent", "pending"])
        .eq("message_id", `msg_${triggerMsg.id}`)
        .gte("created_at", cutoff24)
        .limit(1);

      if (recentNewMsg && recentNewMsg.length > 0) {
        skipped++;
        continue;
      }

      const [{ data: sender }, { data: recipient }, { data: recipientAccount }] = await Promise.all([
        supabase.from("profiles").select("first_name").eq("id", triggerMsg.sender_id).maybeSingle(),
        supabase.from("profiles").select("email, first_name").eq("id", recipientId).maybeSingle(),
        supabase.from("profiles").select("account_status").eq("id", recipientId).maybeSingle(),
      ]);

      if (!recipient?.email) { skipped++; continue; }
      if (recipientAccount?.account_status && recipientAccount.account_status !== "active") {
        skipped++; continue;
      }

      // Label contextuel
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

      const rawPreview = (triggerMsg.content ?? "").trim().replace(/\s+/g, " ");
      const messagePreview = rawPreview.length > 220
        ? rawPreview.slice(0, 217) + "…"
        : rawPreview;

      const _steRes = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/send-transactional-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}` },
        body: JSON.stringify({
          templateName: "unread-messages-reminder",
          recipientEmail: recipient.email,
          idempotencyKey: `unread-reminder-${conv.id}-${triggerMsg.id}`,
          templateData: {
            firstName: recipient.first_name ?? null,
            unreadCount: 1,
            conversationsCount: 1,
            oldestUnreadDays: Math.max(1, Math.floor((Date.now() - new Date(triggerMsg.created_at).getTime()) / (24 * 3600 * 1000))),
            topSenderFirstName: sender?.first_name ?? "Un membre",
            conversationUrl: `https://guardiens.fr/messages/${conv.id}`,
            contextLabel: contextLabel ?? null,
            messagePreview: messagePreview || null,
          },
        }),
      });
      const _steTxt1 = _steRes.ok ? '' : await _steRes.text().catch(() => '');
      if (!_steRes.ok) console.error('send-transactional-email failed', _steRes.status, _steTxt1);
      const sendErr = _steRes.ok ? null : new Error(`send-transactional-email ${_steRes.status}: ${_steTxt1}`);

      if (sendErr) {
        failed++;
        console.error("send failed", { conv: conv.id, err: sendErr.message });
        // Trace persistante obligatoire : sans elle, un cron qui echoue en
        // boucle reste invisible.
        await recordDeliveryFailure(supabase, {
          templateName: "unread-messages-reminder",
          recipientEmail: recipient.email,
          recipientId,
          conversationId: conv.id,
          entityType: "conversation",
          entityId: conv.id,
          source: "remind-unread-messages",
          errorMessage: sendErr.message,
        });
        continue;
      }

      await supabase
        .from("conversations")
        .update({ unread_reminder_sent_at: new Date().toISOString() })
        .eq("id", conv.id);
      sent++;
    }

    await run.finish("success", { sent, skipped, failed, scanned: convs?.length ?? 0, capReached });
    if (capReached) console.warn("remind-unread-messages: SEND_CAP atteint", { cap: SEND_CAP });
    return new Response(JSON.stringify({ success: true, sent, skipped, failed, capReached }), {
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
