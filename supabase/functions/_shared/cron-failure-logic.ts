// Logique pure de l'alerte sur échecs consécutifs (sans Deno, testable).
export const CRON_FAILURE_SIGNAL = "cron_consecutive_failures";
export const CRON_FAILURE_THRESHOLD = 2;

/** Identifiant stable par edge (entity_id NOT NULL, index d'idempotence). */
export const CRON_ENTITY_IDS: Record<string, string> = {
  "notify-mission-wave": "00000000-0000-0000-0000-00000000a0e1",
};

/** Statuts du plus récent au plus ancien. Vrai si les N derniers sont des échecs. */
export function hasConsecutiveFailures(statuses: Array<string | null>, threshold = CRON_FAILURE_THRESHOLD): boolean {
  const done = statuses.filter((s): s is string => !!s);
  if (done.length < threshold) return false;
  return done.slice(0, threshold).every((s) => s === "failed");
}
