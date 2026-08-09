/**
 * help-during-sit
 *
 * Appelee par un utilisateur authentifie depuis le bouton « Besoin d'aide »
 * de la messagerie, pendant une garde en cours.
 *
 * - verifie que l'appelant est bien une des deux parties de la conversation
 * - verifie que la garde liee est en statut 'in_progress'
 * - insere le message dans la conversation comme un message normal de l'appelant
 * - envoie le template transactionnel help-during-sit a l'autre partie
 * - insere un signal admin (severity critical pour 'urgence', warning sinon)
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SITE_URL = "https://guardiens.fr";
const CATEGORIES = ["animal", "logement", "urgence"] as const;
type Category = typeof CATEGORIES[number];

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Unauthorized" }, 401);

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

    const anonClient = createClient(SUPABASE_URL, ANON_KEY);
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await anonClient.auth.getUser(token);
    if (authError || !user) return json({ error: "Unauthorized" }, 401);

    const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

    const body = await req.json().catch(() => null) as
      | { conversationId?: string; category?: string; message?: string }
      | null;

    const conversationId = body?.conversationId?.trim();
    const category = body?.category as Category | undefined;
    const message = (body?.message ?? "").trim();

    if (!conversationId || !category || !CATEGORIES.includes(category)) {
      return json({ error: "conversationId et category ('animal', 'logement', 'urgence') sont requis" }, 400);
    }
    if (message.length < 2) {
      return json({ error: "Le message est requis" }, 400);
    }
    if (message.length > 2000) {
      return json({ error: "Le message est trop long" }, 400);
    }

    const { data: conv, error: convErr } = await supabase
      .from("conversations")
      .select("id, owner_id, sitter_id, sit_id")
      .eq("id", conversationId)
      .maybeSingle();
    if (convErr) throw convErr;
    if (!conv) return json({ error: "Conversation introuvable" }, 404);

    if (conv.owner_id !== user.id && conv.sitter_id !== user.id) {
      return json({ error: "Forbidden" }, 403);
    }

    if (!conv.sit_id) {
      return json({ error: "Cette conversation n'est pas liee a une garde en cours" }, 400);
    }

    const { data: sit, error: sitErr } = await supabase
      .from("sits")
      .select("id, title, status, city")
      .eq("id", conv.sit_id)
      .maybeSingle();
    if (sitErr) throw sitErr;
    if (!sit || sit.status !== "in_progress") {
      return json({ error: "La garde n'est pas en cours" }, 400);
    }

    const recipientId = conv.owner_id === user.id ? conv.sitter_id : conv.owner_id;

    // Message normal de l'appelant, pas un message systeme.
    const { error: msgErr } = await supabase.from("messages").insert({
      conversation_id: conv.id,
      sender_id: user.id,
      content: message,
      is_system: false,
      metadata: { kind: "help_during_sit", category },
    });
    if (msgErr) throw msgErr;

    await supabase
      .from("conversations")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", conv.id);

    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, first_name, email")
      .in("id", [user.id, recipientId]);

    const senderProfile = (profiles ?? []).find((p: any) => p.id === user.id);
    const recipientProfile = (profiles ?? []).find((p: any) => p.id === recipientId);

    const isUrgent = category === "urgence";
    const excerpt = message.slice(0, 200);

    // Signal admin : critical pour l'urgence, warning pour les autres categories.
    const { error: signalErr } = await supabase.from("admin_signals").insert({
      signal_type: isUrgent ? "help_urgence" : "help_during_sit",
      severity: isUrgent ? "critical" : "warning",
      entity_type: "sit",
      entity_id: sit.id,
      metadata: {
        category,
        message_excerpt: excerpt,
        sender_id: user.id,
        recipient_id: recipientId,
        owner_id: conv.owner_id,
        sitter_id: conv.sitter_id,
        conversation_id: conv.id,
        sit_city: sit.city ?? null,
        sit_title: sit.title ?? null,
      },
    });
    if (signalErr && signalErr.code !== "23505") {
      console.error("[help-during-sit] signal insert failed", signalErr.message);
    }

    let emailSent = false;
    const recipientEmail = (recipientProfile?.email ?? "").trim().toLowerCase();
    if (recipientEmail) {
      const conversationHref = `${SITE_URL}/messages/${conv.id}`;
      const resp = await fetch(`${SUPABASE_URL}/functions/v1/send-transactional-email`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${SERVICE_KEY}`,
          apikey: SERVICE_KEY,
        },
        body: JSON.stringify({
          templateName: "help-during-sit",
          recipientEmail,
          idempotencyKey: `help-during-sit-${conv.id}-${Date.now()}`,
          templateData: {
            sitTitle: sit.title ?? "",
            senderName: senderProfile?.first_name ?? "",
            category,
            messageExcerpt: excerpt,
            conversationHref,
            ...(isUrgent ? { __urgent: true } : {}),
          },
          logMetadata: {
            conversation_id: conv.id,
            recipient_id: recipientId,
            sit_id: sit.id,
            category,
            urgent: isUrgent,
          },
        }),
      });
      if (resp.ok) {
        const payload = await resp.json().catch(() => null) as Record<string, unknown> | null;
        emailSent = !payload?.deferred && !payload?.skipped;
      } else {
        console.error("[help-during-sit] send failed", resp.status, await resp.text());
      }
    }

    return json({ ok: true, emailSent, urgent: isUrgent });
  } catch (err) {
    const e = err as Error;
    console.error("[help-during-sit]", e?.message ?? err, e?.stack);
    return json({ error: e?.message ?? String(err) }, 500);
  }
});
