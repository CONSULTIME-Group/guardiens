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

/** Lot L6 : retour au récit après une réponse à une candidature (B-07). */
export const REPLIED_PARAM = "reponse";

/** Prénom affichable dans la confirmation : un mot, lettres, apostrophes et traits d'union, 40 caractères au plus. */
export function noticeFirstName(raw: string | null | undefined): string | null {
  const word = (raw ?? "").trim().split(/\s+/)[0] ?? "";
  const clean = word.replace(/[^\p{L}'’-]/gu, "").slice(0, 40);
  return clean || null;
}

/**
 * Lot L8 : retour au récit après une candidature envoyée depuis l'annonce
 * (arène v2, B-12). Sur téléphone, l'accueil raconte « Votre mot est chez
 * Laurence » avec la frise sur Réponse ; sur ordinateur, le gardien reste
 * sur l'annonce comme avant.
 */
export const APPLIED_PARAM = "candidature";

export function afterApplyTarget(o: { firstName: string | null; phone: boolean }): string | null {
  if (!o.phone) return null;
  const name = noticeFirstName(o.firstName);
  return name ? `/dashboard?${APPLIED_PARAM}=${encodeURIComponent(name)}` : `/dashboard?${APPLIED_PARAM}=1`;
}

export function afterReplyTarget(o: { sitId: string; firstName: string | null; phone: boolean }): string {
  if (!o.phone) return `/sits/${o.sitId}#candidatures`;
  const name = noticeFirstName(o.firstName);
  return name ? `/dashboard?${REPLIED_PARAM}=${encodeURIComponent(name)}` : "/dashboard";
}
