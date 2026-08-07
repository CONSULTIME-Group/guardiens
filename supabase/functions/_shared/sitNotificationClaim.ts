// sitNotificationClaim
// -------------------------------------------------------------
// Garde d'idempotence partagée par les trois pipelines de notification
// d'annonces (send-alert-digest, send-nearby-daily-digest,
// send-sitter-daily-digest).
//
// Principe : un gardien ne reçoit au plus qu'une notification d'annonces par
// jour (date en heure de Paris), quel que soit le pipeline. Le premier
// pipeline qui a réellement du contenu à envoyer réserve le créneau via
// `claim_sit_notification`, les suivants s'effacent.
//
// Règles d'usage :
//  1. N'appeler `claimSitNotification` qu'APRÈS avoir établi qu'il y a du
//     contenu à envoyer, et AVANT l'envoi. Jamais de réservation à vide.
//  2. Un refus est un comportement nominal, pas une erreur : le gardien est
//     sauté, avec une trace mesurable (source détentrice du créneau).
//  3. En cas d'échec d'envoi en aval, appeler `releaseSitNotification` pour
//     ne pas priver le gardien de sa notification pour la journée.

export interface ClaimResult {
  granted: boolean;
  /** Source qui détient déjà le créneau quand la réservation est refusée. */
  heldBy?: string | null;
  /** Erreur technique éventuelle, la réservation est alors considérée refusée. */
  error?: string;
}

export async function claimSitNotification(
  supabase: any,
  userId: string,
  source: string,
  sitIds: string[] = [],
): Promise<ClaimResult> {
  const { data, error } = await supabase.rpc("claim_sit_notification", {
    _user_id: userId,
    _source: source,
    _sit_ids: sitIds,
  });

  if (error) {
    console.error("claim_sit_notification failed", source, userId, error.message ?? error);
    return { granted: false, error: String(error.message ?? error) };
  }

  if (data === true) return { granted: true };

  const { data: held } = await supabase
    .from("sit_notification_log")
    .select("source")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const heldBy = held?.source ?? null;
  // Trace volontairement non alarmante : c'est le fonctionnement nominal.
  console.log(
    JSON.stringify({
      event: "sit_notification_claim_skipped",
      source,
      user_id: userId,
      held_by: heldBy,
    }),
  );
  return { granted: false, heldBy };
}

export async function releaseSitNotification(
  supabase: any,
  userId: string,
  reason = "send_failed",
): Promise<void> {
  // Relâchement non destructif : la ligne reste, avec un état `released`, un
  // horodatage et un motif. Rien ne disparaît du journal.
  const { error } = await supabase.rpc("release_sit_notification", {
    _user_id: userId,
    _reason: reason,
  });
  if (error) {
    console.error("release_sit_notification failed", userId, error.message ?? error);
  }
}

export async function raiseClaimErrorSignal(
  supabase: any,
  source: string,
  claimErrorCount: number,
): Promise<void> {
  if (claimErrorCount <= 0) return;
  await raiseSignal(supabase, {
    signalType: "sit_notification_claim_error",
    key: `sit_notification_claim_error_${source}`,
    severity: "critical",
    metadata: {
      source,
      claim_error_count: claimErrorCount,
      title: `Échec du garde-fou anti-doublon, ${source}`,
    },
  });
}

// Seuils de bruit volontairement bas : une famine de créneau est invisible
// autrement. Un passage qui se voit refuser au moins 10 réservations avec un
// taux de refus d'au moins 50 pour cent est anormal, on le signale.
const REFUSAL_MIN_COUNT = 10;
const REFUSAL_MIN_RATE = 0.5;

/**
 * Enregistre le résultat des réservations d'un passage (obtenues, refusées,
 * détenteurs) et lève un signal admin au delà du seuil de refus.
 */
export async function reportClaimOutcome(
  supabase: any,
  source: string,
  granted: number,
  refused: number,
  heldBy: Record<string, number> = {},
): Promise<void> {
  if (granted <= 0 && refused <= 0) return;

  const { error } = await supabase.rpc("record_claim_outcome", {
    _source: source,
    _granted: granted,
    _refused: refused,
    _held_by: heldBy,
  });
  if (error) console.error("record_claim_outcome failed", source, error.message ?? error);

  const total = granted + refused;
  if (refused >= REFUSAL_MIN_COUNT && refused / total >= REFUSAL_MIN_RATE) {
    await raiseSignal(supabase, {
      signalType: "sit_notification_claim_starvation",
      key: `sit_notification_claim_starvation_${source}`,
      severity: "critical",
      metadata: {
        source,
        granted,
        refused,
        held_by: heldBy,
        title: `Famine de créneau de notification, ${source}`,
        detail: `${refused} réservations refusées sur ${total} sur un même passage.`,
      },
    });
  }
}

/**
 * Une ligne soldée faute de créneau est une perte de diffusion, jamais un
 * simple nettoyage : elle doit être bruyante.
 */
export async function raiseStaleClaimSignal(
  supabase: any,
  source: string,
  reason: string,
  rowIds: string[],
): Promise<void> {
  if (rowIds.length === 0) return;
  await raiseSignal(supabase, {
    signalType: "sit_notification_claim_blocked_stale",
    key: `sit_notification_claim_blocked_stale_${source}_${new Date().toISOString().slice(0, 10)}`,
    severity: "critical",
    metadata: {
      source,
      reason,
      row_count: rowIds.length,
      row_ids: rowIds.slice(0, 50),
      title: `Notifications soldées faute de créneau, ${source}`,
      detail: `${rowIds.length} lignes soldées en ${reason}, ces gardiens ne recevront jamais ces annonces.`,
    },
  });
}

async function raiseSignal(
  supabase: any,
  args: {
    signalType: string;
    key: string;
    severity: string;
    metadata: Record<string, unknown>;
  },
): Promise<void> {
  const entityId = await uuidFromString(args.key);
  const { data: existing, error: readError } = await supabase
    .from("admin_signals")
    .select("id")
    .eq("signal_type", args.signalType)
    .eq("entity_id", entityId)
    .is("resolved_at", null)
    .limit(1);

  if (readError) {
    console.error("admin signal lookup failed", args.signalType, readError);
    return;
  }
  if (existing && existing.length > 0) return;

  const { error } = await supabase.from("admin_signals").insert({
    signal_type: args.signalType,
    severity: args.severity,
    entity_type: "system",
    entity_id: entityId,
    metadata: args.metadata,
  });
  if (error && error.code !== "23505") {
    console.error("admin signal insert failed", args.signalType, error);
  }
}

async function uuidFromString(input: string): Promise<string> {
  const bytes = new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input)));
  const hex = Array.from(bytes.slice(0, 16)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
}
