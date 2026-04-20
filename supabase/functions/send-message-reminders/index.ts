// Cron quotidien : relance contextuelle pour conversations sans réponse.
// - sit_application : J+1, on relance le PROPRIÉTAIRE (candidature en attente)
// - sitter_inquiry  : J+2, on relance le GARDIEN (sondage proprio)
// - mission_help / owner_pitch / long_stay : aucune relance (tu te calmes)
// 1 relance max par conversation (champ reminder_sent_at).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ConversationRow {
  id: string;
  context_type: string | null;
  owner_id: string;
  sitter_id: string;
  last_message_at: string | null;
  reminder_sent_at: string | null;
  sit_id: string | null;
  small_mission_id: string | null;
  long_stay_id: string | null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);

  try {
    const now = Date.now();
    const j1 = new Date(now - 24 * 3600 * 1000).toISOString();
    const j2 = new Date(now - 48 * 3600 * 1000).toISOString();
    const j7 = new Date(now - 7 * 24 * 3600 * 1000).toISOString();

    // Fenêtre raisonnable : on prend les conversations dont le dernier message
    // a entre 24h (J+1) et 7 jours, pas encore relancées, et limitées aux 2 contextes utiles.
    const { data: convs, error } = await supabase
      .from("conversations")
      .select("id, context_type, owner_id, sitter_id, last_message_at, reminder_sent_at, sit_id, small_mission_id, long_stay_id")
      .in("context_type", ["sit_application", "sitter_inquiry"])
      .is("reminder_sent_at", null)
      .gte("last_message_at", j7)
      .lte("last_message_at", j1)
      .returns<ConversationRow[]>();

    if (error) throw error;

    const stats = { processed: 0, sent: 0, skipped: 0, errors: 0 };

    for (const conv of convs ?? []) {
      stats.processed++;

      // Vérif délai par contexte
      const lastMsgAt = conv.last_message_at ? new Date(conv.last_message_at).getTime() : 0;
      const ageMs = now - lastMsgAt;
      const ageHours = ageMs / 3600_000;

      if (conv.context_type === "sit_application" && ageHours < 24) { stats.skipped++; continue; }
      if (conv.context_type === "sitter_inquiry"  && ageHours < 48) { stats.skipped++; continue; }

      // Récupère le dernier message pour identifier l'expéditeur (relance le destinataire)
      const { data: lastMsg } = await supabase
        .from("messages")
        .select("sender_id")
        .eq("conversation_id", conv.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!lastMsg) { stats.skipped++; continue; }

      // Le destinataire de la relance = celui qui n'a pas envoyé le dernier message
      const recipientId = lastMsg.sender_id === conv.owner_id ? conv.sitter_id : conv.owner_id;
      const senderId = lastMsg.sender_id;

      // Pour sit_application : on ne relance QUE si le destinataire est le proprio
      // Pour sitter_inquiry : on ne relance QUE si le destinataire est le gardien
      const isOwnerRecipient = recipientId === conv.owner_id;
      if (conv.context_type === "sit_application" && !isOwnerRecipient) { stats.skipped++; continue; }
      if (conv.context_type === "sitter_inquiry"  &&  isOwnerRecipient) { stats.skipped++; continue; }

      // Récupère profils
      const { data: recipient } = await supabase
        .from("profiles")
        .select("id, first_name, email")
        .eq("id", recipientId)
        .single();

      const { data: sender } = await supabase
        .from("profiles")
        .select("id, first_name")
        .eq("id", senderId)
        .single();

      if (!recipient?.email) { stats.skipped++; continue; }

      // Vérif préférence email
      const { data: prefs } = await supabase
        .from("notification_preferences")
        .select("email_messages")
        .eq("user_id", recipientId)
        .maybeSingle();
      if (prefs && prefs.email_messages === false) { stats.skipped++; continue; }

      // Contexte enrichi
      let sitTitle: string | null = null;
      let sitCity: string | null = null;
      if (conv.sit_id) {
        const { data: sit } = await supabase
          .from("sits")
          .select("title, properties(city)")
          .eq("id", conv.sit_id)
          .maybeSingle();
        sitTitle = sit?.title ?? null;
        sitCity = (sit as any)?.properties?.city ?? null;
      }

      const subject = conv.context_type === "sit_application"
        ? `${sender?.first_name ?? "Un membre"} attend votre retour sur sa candidature`
        : `${sender?.first_name ?? "Un membre"} attend toujours votre réponse`;

      const intro = conv.context_type === "sit_application"
        ? `Vous avez reçu une candidature il y a 24h pour votre annonce${sitTitle ? ` « ${sitTitle} »` : ""}${sitCity ? ` à ${sitCity}` : ""}, et vous n'y avez pas encore répondu.`
        : `Vous avez reçu une demande de garde il y a 48h${sitCity ? ` à ${sitCity}` : ""}, et vous n'y avez pas encore répondu.`;

      // Envoi via edge function transactionnel
      const { error: emailErr } = await supabase.functions.invoke("send-transactional-email", {
        body: {
          templateName: "new-message",
          recipientEmail: recipient.email,
          idempotencyKey: `reminder-${conv.id}`,
          templateData: {
            firstName: recipient.first_name ?? "",
            senderName: sender?.first_name ?? "Un membre",
            messagePreview: intro,
            conversationUrl: `https://guardiens.fr/messages?c=${conv.id}`,
            isReminder: true,
          },
        },
      });

      if (emailErr) {
        console.error("reminder email failed", conv.id, emailErr);
        stats.errors++;
        continue;
      }

      // Marque la conv comme relancée
      await supabase
        .from("conversations")
        .update({ reminder_sent_at: new Date().toISOString() })
        .eq("id", conv.id);

      stats.sent++;
    }

    return new Response(JSON.stringify({ ok: true, ...stats }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("send-message-reminders error", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
