/**
 * Lot X3a (13/10/2026), constat A-08 : une garde terminée puis archivée
 * affichait « Garde introuvable. » sur /review/:id, et l'avis devenait
 * impossible (1 garde archivée le 16/08 sans aucun avis, base du 13/10).
 *
 * Côté écran : terminée, ou archivée avec une date de fin passée. La règle
 * serveur (sit_is_reviewable, migration X3a) exige en plus le passage par
 * « terminée » ; une garde annulée puis archivée y reste fermée.
 */

/** Jour local au format AAAA-MM-JJ. */
function localDay(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function isSitReviewable(
  sit: { status?: string | null; end_date?: string | null } | null | undefined,
  now: Date = new Date(),
): boolean {
  if (!sit) return false;
  if (sit.status === "completed") return true;
  if (sit.status !== "archived" || !sit.end_date) return false;
  return sit.end_date.slice(0, 10) < localDay(now);
}
