/**
 * Lot X3a (13/10/2026), constat A-08 : une garde terminée puis archivée
 * affichait « Garde introuvable. » sur /review/:id, et l'avis devenait
 * impossible (1 garde archivée le 16/08 sans aucun avis, base du 13/10).
 *
 * Côté écran : terminée, ou archivée avec une date de fin passée. La règle
 * serveur (sit_is_reviewable, migration X3a) exige en plus le passage par
 * « terminée » ; une garde annulée puis archivée y reste fermée.
 */

/**
 * Lot Z : règle réelle de publication d'un avis de garde. auto_publish_reviews
 * publie les deux avis dès que le second est déposé ; publish_stale_reviews
 * publie un avis resté seul 14 jours après son dépôt.
 */
export const REVIEW_STALE_DAYS = 14;
export const REVIEW_PUBLICATION_RULE =
  `Votre avis est publié dès que l'autre partie a déposé le sien, ou au plus tard ${REVIEW_STALE_DAYS} jours après votre dépôt.`;

/**
 * Lot Z : conversation de la garde entre les deux parties évaluées. Un
 * propriétaire a une conversation par candidat sur la même annonce : filtrer
 * sur l'un ou l'autre participant renvoyait plusieurs lignes et maybeSingle
 * échouait. On cible le couple exact propriétaire, gardien retenu.
 */
export function reviewConversationPair(input: {
  isOwnerReview: boolean;
  userId: string;
  revieweeId: string;
}): { owner_id: string; sitter_id: string } {
  return input.isOwnerReview
    ? { owner_id: input.userId, sitter_id: input.revieweeId }
    : { owner_id: input.revieweeId, sitter_id: input.userId };
}

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
