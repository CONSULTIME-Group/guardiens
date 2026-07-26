/**
 * delivery-failure.ts
 *
 * Trace persistante et visible d'un echec d'envoi de notification.
 *
 * Regle imposee : une notification qui echoue ne doit JAMAIS disparaitre dans
 * un console.error. Trois pannes silencieuses (suppressed_emails, statuts
 * refuses par contrainte, 3 442 emails perdus) sont nees de ce motif.
 *
 * Chaque echec laisse donc deux traces lisibles depuis le back-office :
 *   1. une ligne `email_send_log` au statut `failed` avec le motif reel
 *   2. un `admin_signals` de type `notification_delivery_failed`
 * Et au dela de 10 echecs sur 24 heures, un signal de synthese
 * `notification_delivery_failed_burst`.
 */

export interface DeliveryFailureInput {
  templateName: string;
  recipientEmail?: string | null;
  recipientId?: string | null;
  conversationId?: string | null;
  entityType?: string;
  entityId?: string | null;
  source: string;
  errorMessage: string;
  extra?: Record<string, unknown>;
}

const BURST_THRESHOLD = 10;

// deno-lint-ignore no-explicit-any
export async function recordDeliveryFailure(supabase: any, input: DeliveryFailureInput): Promise<void> {
  const metadata = {
    conversation_id: input.conversationId ?? null,
    recipient_id: input.recipientId ?? null,
    source: input.source,
    ...(input.extra ?? {}),
  };

  const { error: logErr } = await supabase.from("email_send_log").insert({
    message_id: `failed_${input.source}_${input.entityId ?? crypto.randomUUID()}`,
    template_name: input.templateName,
    recipient_email: input.recipientEmail ?? "unknown",
    status: "failed",
    error_message: input.errorMessage.slice(0, 2000),
    metadata,
  });
  if (logErr) console.error("recordDeliveryFailure: email_send_log insert failed", logErr);

  const entityId = input.conversationId ?? input.entityId ?? input.recipientId;
  if (entityId) {
    const { error: sigErr } = await supabase.from("admin_signals").insert({
      signal_type: "notification_delivery_failed",
      severity: "warning",
      entity_type: input.entityType ?? (input.conversationId ? "conversation" : "profile"),
      entity_id: entityId,
      metadata: {
        ...metadata,
        template_name: input.templateName,
        recipient_email: input.recipientEmail ?? null,
        error: input.errorMessage.slice(0, 2000),
      },
    });
    // 23505 = un signal non resolu existe deja pour cette entite, c'est le
    // comportement attendu de l'index d'idempotence.
    if (sigErr && sigErr.code !== "23505") {
      console.error("recordDeliveryFailure: admin_signals insert failed", sigErr);
    }
  }

  await maybeRaiseBurstSignal(supabase);
}

// deno-lint-ignore no-explicit-any
async function maybeRaiseBurstSignal(supabase: any): Promise<void> {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { count, error } = await supabase
    .from("admin_signals")
    .select("id", { count: "exact", head: true })
    .eq("signal_type", "notification_delivery_failed")
    .gte("detected_at", since);
  if (error) {
    console.error("recordDeliveryFailure: burst count failed", error);
    return;
  }
  if ((count ?? 0) <= BURST_THRESHOLD) return;

  // entity_id stable sur la journee : un seul signal de synthese par jour,
  // garanti par l'index d'idempotence (signal_type, entity_id).
  const dayKey = new Date().toISOString().slice(0, 10);
  const entityId = await uuidFromString(`notification_delivery_failed_burst_${dayKey}`);
  const { error: insErr } = await supabase.from("admin_signals").insert({
    signal_type: "notification_delivery_failed_burst",
    severity: "critical",
    entity_type: "system",
    entity_id: entityId,
    metadata: { failures_24h: count, threshold: BURST_THRESHOLD, day: dayKey },
  });
  if (insErr && insErr.code !== "23505") {
    console.error("recordDeliveryFailure: burst signal insert failed", insErr);
  }
}

async function uuidFromString(input: string): Promise<string> {
  const bytes = new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input)));
  const hex = Array.from(bytes.slice(0, 16)).map((b) => b.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
}
