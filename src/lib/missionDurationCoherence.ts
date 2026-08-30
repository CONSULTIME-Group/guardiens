/**
 * Cohérence entre la période annoncée et la durée déclarée.
 *
 * Mesuré : neuf publications sur vingt-six annonçaient « 1-2 heures » pour
 * 41 jours ou « week-end » pour 82 jours. Les deux valeurs s'affichent côte à
 * côte sur la fiche et décrédibilisent l'annonce.
 *
 * Le contrôle est explicite, jamais bloquant : on propose la durée cohérente.
 */

/** Nombre de jours maximum couvert par une durée déclarée, null si ouvert. */
export const DURATION_MAX_DAYS: Record<string, number | null> = {
  "1-2h": 1,
  half_day: 1,
  full_day: 1,
  weekend: 2,
  week: 7,
  several: null,
};

export const DURATION_LABEL: Record<string, string> = {
  "1-2h": "1-2 heures",
  half_day: "Demi-journée",
  full_day: "Journée",
  weekend: "Week-end",
  week: "Semaine",
  several: "Plusieurs jours",
};

/** Nombre de jours couverts par la période, bornes incluses. */
export function periodDays(
  start: string | null | undefined,
  end: string | null | undefined,
): number | null {
  if (!start || !end) return null;
  const s = new Date(start);
  const e = new Date(end);
  if (isNaN(s.getTime()) || isNaN(e.getTime())) return null;
  const diff = Math.round((e.getTime() - s.getTime()) / 86400000);
  if (diff < 0) return null;
  return diff + 1;
}

export interface DurationMismatch {
  days: number;
  declared: string;
  suggested: string;
  message: string;
}

/**
 * Retourne une incohérence explicable, ou null si la durée déclarée tient.
 */
export function durationMismatch(
  duration: string | null | undefined,
  start: string | null | undefined,
  end: string | null | undefined,
): DurationMismatch | null {
  if (!duration) return null;
  const days = periodDays(start, end);
  if (days == null) return null;
  const max = DURATION_MAX_DAYS[duration];
  if (max == null || days <= max) return null;
  const suggested = days <= 2 ? "weekend" : "several";
  if (suggested === duration) return null;
  return {
    days,
    declared: duration,
    suggested,
    message: `Votre période couvre ${days} jours, la durée déclarée est « ${DURATION_LABEL[duration] || duration} ». La durée cohérente serait « ${DURATION_LABEL[suggested]} ».`,
  };
}
