// Trace persistante d'un échec d'envoi de relance d'avis.
//
// Motif (17/08/2026) : la moitié des emails review-reminder d'une garde n'est
// pas partie. send-transactional-email a répondu non-2xx, le cron s'est
// contenté d'un console.error (perdu avec la rétention des logs) puis a posé
// le drapeau de traitement. L'échec était invisible et définitif.
//
// Désormais, tout échec laisse deux traces lisibles depuis le back-office :
//   1. une ligne email_send_log au statut 'failed' (tableau de bord emails),
//   2. un signal admin ouvert (signal_type 'review_reminder_failed'), mis à
//      jour tant que l'échec se répète sur la même garde.
// Le drapeau de traitement restant à false, la garde est rejouée au run
// suivant : l'idempotence côté send-transactional-email empêche tout doublon
// pour la partie déjà envoyée.

// deno-lint-ignore no-explicit-any
export async function recordReviewSendFailure(
  supabase: any,
  failure: {
    edgeName: string;
    stage: "j1" | "j5" | "j10" | "j20";
    sitId: string;
    sitTitle?: string | null;
    party: "owner" | "sitter" | "unknown";
    recipientEmail?: string | null;
    idempotencyKey: string;
    httpStatus?: number;
    responseBody?: unknown;
  },
): Promise<void> {
  const detail =
    typeof failure.responseBody === "string"
      ? failure.responseBody
      : JSON.stringify(failure.responseBody ?? "");
  const errorMessage = (
    failure.httpStatus
      ? `send-transactional-email HTTP ${failure.httpStatus}: ${detail}`
      : `send-transactional-email injoignable: ${detail}`
  ).slice(0, 2000);

  const metadata = {
    idempotency_key: failure.idempotencyKey,
    sit_id: failure.sitId,
    stage: failure.stage,
    party: failure.party,
    source: failure.edgeName,
    reported_by_caller: true,
  };

  // 1. Tableau de bord emails : la ligne 'failed' rend l'échec visible et
  //    comptable. message_id frais : l'idempotence métier vit dans metadata.
  const { error: logErr } = await supabase.from("email_send_log").insert({
    message_id: crypto.randomUUID(),
    template_name: "review-reminder",
    recipient_email: failure.recipientEmail ?? "inconnu",
    status: "failed",
    error_message: errorMessage,
    metadata,
  });
  if (logErr) console.error("recordReviewSendFailure: email_send_log insert failed", logErr);

  // 2. Signal admin : un seul signal ouvert par garde, réouvert/actualisé à
  //    chaque échec pour garder le compte et le dernier motif.
  try {
    const { data: openSignal } = await supabase
      .from("admin_signals")
      .select("id, metadata")
      .eq("signal_type", "review_reminder_failed")
      .eq("entity_id", failure.sitId)
      .is("resolved_at", null)
      .maybeSingle();

    const previousAttempts =
      (openSignal?.metadata as { attempts?: number } | null)?.attempts ?? 0;
    const signalMetadata = {
      sit_title: failure.sitTitle ?? null,
      stage: failure.stage,
      party: failure.party,
      recipient_email: failure.recipientEmail ?? null,
      edge_name: failure.edgeName,
      last_error: errorMessage,
      attempts: previousAttempts + 1,
      last_detected_at: new Date().toISOString(),
    };

    if (openSignal?.id) {
      await supabase
        .from("admin_signals")
        .update({ metadata: signalMetadata, detected_at: new Date().toISOString() })
        .eq("id", openSignal.id);
    } else {
      await supabase.from("admin_signals").insert({
        signal_type: "review_reminder_failed",
        severity: "warning",
        entity_type: "sit",
        entity_id: failure.sitId,
        metadata: signalMetadata,
      });
    }
  } catch (signalErr) {
    console.error("recordReviewSendFailure: admin_signals upsert failed", signalErr);
  }
}
