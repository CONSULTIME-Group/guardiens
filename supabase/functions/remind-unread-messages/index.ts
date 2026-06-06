// Cron quotidien : rappel email pour les destinataires de messages non lus depuis ≥ 48h.
// Indépendant de send-message-reminders (qui couvre J+1 sit_application / J+2 sitter_inquiry).
// Tous contextes confondus. Un seul rappel par "fenêtre" : on resette unread_reminder_sent_at
// dès que la conv est entièrement lue (via trigger côté DB ultérieur, sinon on vérifie ici
// que reminder_sent_at < oldest_unread.created_at).
//
// Respect de la préférence notification_preferences.email_messages.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface UnreadConv {
  conversation_id: string;
  recipient_id: string;
  sender_id: string;
  unread_count: number;
  oldest_unread_at: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);

  const targetUserId = await readTargetUser(req);

  try {
    // 1) Aggréger par (conversation, destinataire) les messages non lus ≥ 48h
    //    et où aucun rappel n'a été envoyé pour cette fenêtre.
    const { data: rows, error } = await supabase.rpc(
      "admin_get_unread_reminder_candidates",
      { p_target_user: targetUserId ?? null },
    );

    if (error) {
      // RPC absent : fallback SQL direct via REST (PostgREST) via from() impossible ici (agg)
      // → on construit la requête via le client en récupérant tout et en filtrant.
      console.warn("RPC missing, falling back to inline query:", error.message);
      return await runInlineFallback(supabase, targetUserId, corsHeaders);
    }

    return await processCandidates(supabase, rows as UnreadConv[], corsHeaders);
  } catch (err) {
    console.error("remind-unread-messages error", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

async function readTargetUser(req: Request): Promise<string | null> {
  if (req.method !== "POST") return null;
  try {
    const body = await req.json();
    return typeof body?.targetUserId === "string" ? body.targetUserId : null;
  } catch {
    return null;
  }
}

async function runInlineFallback(
  supabase: ReturnType<typeof createClient>,
  targetUserId: string | null,
  corsHeaders: Record<string, string>,
) {
  // Récupère conversations potentiellement éligibles
  const since = new Date(Date.now() - 48 * 3600_000).toISOString();
  let q = supabase
    .from("conversations")
    .select(
      "id, owner_id, sitter_id, unread_reminder_sent_at, last_message_at, context_type, sit_id, small_mission_id",
    )
    .lte("last_message_at", since);
  if (targetUserId) {
    q = q.or(`owner_id.eq.${targetUserId},sitter_id.eq.${targetUserId}`);
  }
  const { data: convs, error: cErr } = await q;
  if (cErr) throw cErr;

  const candidates: UnreadConv[] = [];
  for (const c of convs ?? []) {
    const { data: unread } = await supabase
      .from("messages")
      .select("id, sender_id, created_at")
      .eq("conversation_id", (c as any).id)
      .is("read_at", null)
      .eq("is_system", false)
      .lte("created_at", since)
      .order("created_at", { ascending: true });

    if (!unread || unread.length === 0) continue;

    const ownerId = (c as any).owner_id as string;
    const sitterId = (c as any).sitter_id as string;
    const reminderSent = (c as any).unread_reminder_sent_at as string | null;

    // Identifier le destinataire des messages non lus = celui qui n'a PAS envoyé.
    // Si messages non lus envoyés par les deux côtés, on traite chaque sens.
    for (const recipientId of [ownerId, sitterId]) {
      if (targetUserId && recipientId !== targetUserId) continue;
      const incoming = unread.filter((m) => m.sender_id !== recipientId);
      if (incoming.length === 0) continue;
      const oldest = incoming[0].created_at;
      // Skip si rappel déjà envoyé après l'arrivée du plus vieux non lu
      if (reminderSent && new Date(reminderSent) >= new Date(oldest)) continue;
      candidates.push({
        conversation_id: (c as any).id,
        recipient_id: recipientId,
        sender_id: incoming[incoming.length - 1].sender_id,
        unread_count: incoming.length,
        oldest_unread_at: oldest,
      });
    }
  }

  return await processCandidates(supabase, candidates, corsHeaders);
}

async function processCandidates(
  supabase: ReturnType<typeof createClient>,
  candidates: UnreadConv[],
  corsHeaders: Record<string, string>,
) {
  // Aggréger par recipient (un seul email même si plusieurs convs)
  const perRecipient = new Map<
    string,
    { unread: number; convs: Set<string>; oldest: string; senderId: string; firstConvId: string }
  >();
  for (const c of candidates) {
    const cur = perRecipient.get(c.recipient_id);
    if (!cur) {
      perRecipient.set(c.recipient_id, {
        unread: c.unread_count,
        convs: new Set([c.conversation_id]),
        oldest: c.oldest_unread_at,
        senderId: c.sender_id,
        firstConvId: c.conversation_id,
      });
    } else {
      cur.unread += c.unread_count;
      cur.convs.add(c.conversation_id);
      if (new Date(c.oldest_unread_at) < new Date(cur.oldest)) cur.oldest = c.oldest_unread_at;
    }
  }

  const stats = { recipients: 0, sent: 0, skipped: 0, errors: 0 };

  for (const [recipientId, agg] of perRecipient.entries()) {
    stats.recipients++;

    const { data: recipient } = await supabase
      .from("profiles")
      .select("id, first_name, email")
      .eq("id", recipientId)
      .single();

    if (!recipient?.email) { stats.skipped++; continue; }

    const { data: prefs } = await supabase
      .from("notification_preferences")
      .select("email_messages")
      .eq("user_id", recipientId)
      .maybeSingle();
    if (prefs && (prefs as any).email_messages === false) { stats.skipped++; continue; }

    const { data: sender } = await supabase
      .from("profiles")
      .select("first_name")
      .eq("id", agg.senderId)
      .maybeSingle();

    const oldestDays = Math.max(
      2,
      Math.floor((Date.now() - new Date(agg.oldest).getTime()) / 86_400_000),
    );

    const { error: emailErr } = await supabase.functions.invoke("send-transactional-email", {
      body: {
        templateName: "unread-messages-reminder",
        recipientEmail: recipient.email,
        idempotencyKey: `unread-reminder-${recipientId}-${agg.oldest}`,
        templateData: {
          firstName: recipient.first_name ?? "",
          unreadCount: agg.unread,
          conversationsCount: agg.convs.size,
          oldestUnreadDays: oldestDays,
          topSenderFirstName: (sender as any)?.first_name ?? "",
          conversationUrl:
            agg.convs.size === 1
              ? `https://guardiens.fr/messages?c=${agg.firstConvId}`
              : "https://guardiens.fr/messages",
        },
      },
    });

    if (emailErr) {
      console.error("unread reminder email failed", recipientId, emailErr);
      stats.errors++;
      continue;
    }

    // Marque toutes les conv concernées
    await supabase
      .from("conversations")
      .update({ unread_reminder_sent_at: new Date().toISOString() })
      .in("id", Array.from(agg.convs));

    stats.sent++;
  }

  return new Response(JSON.stringify({ ok: true, ...stats }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
