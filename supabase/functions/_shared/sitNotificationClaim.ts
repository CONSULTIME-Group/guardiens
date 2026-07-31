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
): Promise<void> {
  const { error } = await supabase.rpc("release_sit_notification", {
    _user_id: userId,
  });
  if (error) {
    console.error("release_sit_notification failed", userId, error.message ?? error);
  }
}
