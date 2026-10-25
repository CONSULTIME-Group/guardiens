/**
 * Lot ADM11 (25/10/2026, demande de Jérémie) : sur /admin/listings, la photo de
 * couverture et la version en ligne d'une annonce s'ouvrent en un clic depuis la
 * ligne. La version en ligne est la page publique /annonces/:id, lisible pour
 * les statuts que get_public_sit sert à un visiteur.
 */
export const PUBLIC_SIT_STATUSES = ["published", "confirmed", "in_progress", "completed", "archived"] as const;

export function listingLiveUrl(listing: { id?: string | null; status?: string | null }): string | null {
  if (!listing.id || !listing.status) return null;
  return (PUBLIC_SIT_STATUSES as readonly string[]).includes(listing.status) ? `/annonces/${listing.id}` : null;
}
