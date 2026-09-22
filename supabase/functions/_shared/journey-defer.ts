// Report borné d'une étape de nurturing.
//
// Une étape peut être reportée quand sa condition d'envoi n'est pas remplie,
// par exemple aucune annonce ouverte à portée du gardien. Le parcours reste
// alors actif, ce qui occupe le créneau de parcours unique et empêche une
// autre séquence, reactivation-d30 notamment, de prendre la main.
//
// Décision du 22/09/2026 : au delà de 21 jours après l'échéance de l'étape,
// le parcours sort sans envoi, avec un motif explicite.

export const MAX_DEFERRAL_DAYS = 21;

export type DeferReason = "no_open_sit_nearby" | "no_coordinates";

export interface DeferDecision {
  /** true : on sort le parcours, false : on reporte simplement. */
  expired: boolean;
  /** Motif écrit dans journey_step_log. */
  logReason: string;
  /** Motif écrit dans user_journeys.exit_reason, uniquement si expired. */
  exitReason: string | null;
}

/**
 * @param dueAtMs échéance calculée de l'étape (date à laquelle elle aurait dû partir)
 * @param nowMs   instant courant
 */
export function deferDecision(
  reason: DeferReason,
  dueAtMs: number,
  nowMs: number,
): DeferDecision {
  const elapsedDays = (nowMs - dueAtMs) / 86400_000;
  const expired = elapsedDays > MAX_DEFERRAL_DAYS;
  return {
    expired,
    logReason: `skipped_${reason}`,
    exitReason: expired ? `${reason}_expired` : null,
  };
}
