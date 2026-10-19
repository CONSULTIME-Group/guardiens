/**
 * Lot P2 (arène du 19/10/2026) : présence du propriétaire, lue sur
 * profiles.last_seen_at. Au-delà de 14 jours sans visite, l'admin affiche
 * « Propriétaire absent depuis X jours » pour diffuser seulement quand le
 * propriétaire est là pour répondre. Lecture seule, aucune action déclenchée.
 */
export const OWNER_ABSENT_AFTER_DAYS = 14;

const DAY_MS = 86_400_000;

/**
 * Nombre de jours pleins d'absence quand il dépasse 14, sinon null
 * (présent, ou date inconnue).
 */
export function ownerAbsentDays(lastSeenAt: string | null | undefined, now: number = Date.now()): number | null {
  if (!lastSeenAt) return null;
  const t = new Date(lastSeenAt).getTime();
  if (!Number.isFinite(t)) return null;
  const days = Math.floor((now - t) / DAY_MS);
  return days > OWNER_ABSENT_AFTER_DAYS ? days : null;
}

export function ownerAbsenceLabel(days: number): string {
  return `Propriétaire absent depuis ${days} jours`;
}
