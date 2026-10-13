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

/** Veille d'un jour AAAA-MM-JJ, en UTC (même calcul que send-sit-reminders). */
export function previousUtcDay(day: string): string {
  const d = new Date(`${day.slice(0, 10)}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

/**
 * Lot Z : une seule notification in-app au lendemain d'une garde.
 * auto-transition-sits passait la garde en « terminée » vers 0 h (UTC) avec
 * « Garde terminée ! Pensez à laisser un avis », puis send-sit-reminders
 * écrivait à 6 h « Comment s'est passée la garde ? » vers le même /review,
 * aux deux mêmes personnes. Quand la date de fin est la veille, le rappel du
 * matin (J+1, propriétaire et gardien retenu) couvre la fin de garde :
 * auto-transition-sits n'écrit pas la sienne. Une garde close en retard
 * (date de fin plus ancienne, aucun rappel J+1 à venir) garde la notification
 * de fin. Les emails ne changent pas.
 */
export function completionNoticeCoveredByMorningReminder(
  endDate: string | null | undefined,
  todayUtc: string,
): boolean {
  if (!endDate) return false;
  return endDate.slice(0, 10) === previousUtcDay(todayUtc);
}

export function shouldSendPreSitReminder(
  sitStatus: string | null | undefined,
  acceptedSitterIds: ReadonlyArray<string | null | undefined> | null | undefined,
): boolean {
  if (!PRE_SIT_REMINDER_STATUSES.includes(String(sitStatus))) return false;
  return (acceptedSitterIds ?? []).some((id) => typeof id === "string" && id.length > 0);
}
