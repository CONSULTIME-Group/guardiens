/**
 * Lot A8 : un envoi manuel de digest ne contourne les garde-fous du cron
 * (anti-doublon 24 h, réservation inter-canaux, verrou) que s'il vise UN
 * membre explicite. Sans identifiant, le manuel se comporte comme le cron.
 */
export function digestBypassesGuards(manual: boolean | undefined, targetId: string | undefined | null): boolean {
  return !!manual && typeof targetId === "string" && targetId.trim().length > 0
}
