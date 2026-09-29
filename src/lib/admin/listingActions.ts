// Lot A9 : règles des actions admin sur les annonces.

const HIDEABLE = new Set(["published", "draft"]);
const DELETABLE = new Set(["published", "draft", "archived", "expired"]);

/** « Masquer » : seulement une annonce en ligne ou un brouillon. */
export const canHideListing = (status: string | null | undefined) => !!status && HIDEABLE.has(status);

/** « Supprimer » : jamais une garde confirmée, en cours, terminée ou annulée. */
export const canDeleteListing = (status: string | null | undefined) => !!status && DELETABLE.has(status);

export function hideListingUpdate(currentStatus: string, adminId: string | null, now: string) {
  return {
    status: "cancelled",
    status_before_hidden: currentStatus,
    hidden_by: adminId,
    hidden_at: now,
    moderation_hidden_at: now,
    moderation_hidden_by: adminId,
  };
}

/** Statut rendu par « Remettre en ligne » : celui d'avant le masquage. */
export function restoredListingStatus(listing: { status_before_hidden?: string | null }): string {
  const prev = listing.status_before_hidden;
  return prev && HIDEABLE.has(prev) ? prev : "published";
}

export function restoreListingUpdate(listing: { status_before_hidden?: string | null }) {
  return {
    status: restoredListingStatus(listing),
    status_before_hidden: null,
    hidden_by: null,
    hidden_at: null,
    moderation_hidden_at: null,
    moderation_hidden_by: null,
  };
}

export interface DeleteCounts { applications: number; messages: number; reviews: number; badges: number }

const plural = (n: number, one: string, many: string) => `${n} ${n > 1 ? many : one}`;

export function deleteCountsSentence(c: DeleteCounts): string {
  return `Seront effacés : ${plural(c.applications, "candidature", "candidatures")}, ${plural(c.messages, "message", "messages")}, ${plural(c.reviews, "avis", "avis")} et ${plural(c.badges, "écusson", "écussons")}.`;
}
