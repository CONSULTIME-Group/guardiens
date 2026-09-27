// Règle d'expiration d'une annonce publiée sans candidature acceptée
// (lot A2, 27/09/2026).
//
// Avant : expirée dès que start_date < aujourd'hui moins 2 jours. Quatre
// gardes longues ont ainsi disparu alors qu'il restait 18 à 31 jours à
// pourvoir. Désormais une annonce expire :
//  - quand sa date de début est dépassée de plus de 2 jours ET qu'il reste
//    7 jours ou moins avant sa date de fin (end_date <= aujourd'hui + 7) ;
//  - ou dès que sa date de fin est passée.
// Tant qu'il reste plus de 7 jours, elle reste publiée.
// Toutes les dates sont des chaînes ISO courtes (AAAA-MM-JJ) en UTC.

export const EXPIRY_START_GRACE_DAYS = 2;
export const EXPIRY_REMAINING_DAYS = 7;

export function addDaysIso(todayIso: string, days: number): string {
  const d = new Date(`${todayIso}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export type ExpiryReason = "end_passed" | "little_time_left";

/** Motif d'expiration, ou null si l'annonce reste publiée. */
export function publishedSitExpiryReason(
  startDate: string | null | undefined,
  endDate: string | null | undefined,
  todayIso: string,
): ExpiryReason | null {
  const start = (startDate || "").slice(0, 10);
  const end = (endDate || "").slice(0, 10);
  if (end && end < todayIso) return "end_passed";
  if (!start) return null;
  const graceLimit = addDaysIso(todayIso, -EXPIRY_START_GRACE_DAYS);
  if (start >= graceLimit) return null;
  // Sans date de fin, on garde l'ancienne règle (début dépassé de 2 jours).
  if (!end) return "little_time_left";
  return end <= addDaysIso(todayIso, EXPIRY_REMAINING_DAYS) ? "little_time_left" : null;
}

/** Clause `.or()` PostgREST miroir de publishedSitExpiryReason. */
export function expiryCandidatesOrClause(todayIso: string): string {
  const grace = addDaysIso(todayIso, -EXPIRY_START_GRACE_DAYS);
  const horizon = addDaysIso(todayIso, EXPIRY_REMAINING_DAYS);
  return `end_date.lt.${todayIso},and(start_date.lt.${grace},end_date.lte.${horizon}),and(start_date.lt.${grace},end_date.is.null)`;
}

/** Texte de la notification sit_expired, juste dans les deux cas. */
export function sitExpiredNotificationBody(title: string, reason: ExpiryReason): string {
  if (reason === "end_passed") {
    return `Les dates de votre annonce « ${title} » sont passées et aucun gardien n'a été retenu. Vous pouvez la republier avec de nouvelles dates, ou nous dire que vous avez trouvé une solution.`;
  }
  return `Votre annonce « ${title} » a commencé et il reste moins d'une semaine de garde, sans gardien retenu : elle n'est plus proposée aux gardiens. Vous pouvez la republier avec de nouvelles dates, ou nous dire que vous avez trouvé une solution.`;
}
