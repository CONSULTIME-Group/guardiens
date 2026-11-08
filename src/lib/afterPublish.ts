/**
 * Lot L5 (08/11/2026, arène tableau de bord v2) : où revient le propriétaire
 * après une publication rapide. Sur téléphone, au récit de l'accueil (B-03),
 * qui dit « Votre annonce est en ligne » jusqu'au geste suivant ; sur
 * ordinateur, à la fiche comme avant (accueil ordinateur inchangé jusqu'au
 * 31/01/2027) ; arrivée v2 depuis l'inscription : aux affinités (lot 1).
 */
export const PUBLISHED_PARAM = "publiee";

export function isDesktopViewport(): boolean {
  try {
    return typeof window !== "undefined" && typeof window.matchMedia === "function"
      && window.matchMedia("(min-width: 1024px)").matches;
  } catch {
    return false;
  }
}

export function afterPublishTarget(o: { sitId: string; express: boolean; arrivalSignup: boolean; phone: boolean }): string {
  if (o.arrivalSignup) return `/arrivee/affinites?sit=${o.sitId}`;
  if (o.express && o.phone) return `/dashboard?${PUBLISHED_PARAM}=${encodeURIComponent(o.sitId)}`;
  return `/sits/${o.sitId}`;
}
