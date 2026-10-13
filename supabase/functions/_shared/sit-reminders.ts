/**
 * Lot X3a (13/10/2026), constat A-06 : « Votre garde commence dans 48h » et
 * « dans 7 jours » partaient aussi vers des annonces publiées sans gardien
 * retenu (14 rappels 48 h et 8 rappels 7 jours vers des annonces aujourd'hui
 * expirées, base du 13/10/2026). Un rappel avant la garde ne part que pour une
 * garde confirmée avec un gardien retenu.
 *
 * Module pur (aucune dépendance Deno) : importé par send-sit-reminders et par
 * src/__tests__/x3a/.
 */

/** Statuts d'annonce lus par les rappels avant la garde. */
export const PRE_SIT_REMINDER_STATUSES: readonly string[] = ["confirmed"];

export function shouldSendPreSitReminder(
  sitStatus: string | null | undefined,
  acceptedSitterIds: ReadonlyArray<string | null | undefined> | null | undefined,
): boolean {
  if (!PRE_SIT_REMINDER_STATUSES.includes(String(sitStatus))) return false;
  return (acceptedSitterIds ?? []).some((id) => typeof id === "string" && id.length > 0);
}
