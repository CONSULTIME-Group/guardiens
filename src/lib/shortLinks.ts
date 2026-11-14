/**
 * Lot SRC3 (14/11/2026) : liens courts des réseaux sociaux.
 *
 * guardiens.fr/ig, /tiktok, /yt et /fb redirigent vers l'accueil avec les
 * paramètres UTM du canal. Les paramètres déjà présents dans l'URL courte
 * (par exemple ?utm_campaign=story) l'emportent sur ceux de la table : la
 * campagne d'une publication précise reste modifiable sans nouveau lot.
 */

export interface ShortLink {
  utm_source: string;
  utm_medium: string;
  utm_campaign: string;
}

export const SHORT_LINKS: Readonly<Record<string, ShortLink>> = {
  ig: { utm_source: "instagram", utm_medium: "social", utm_campaign: "bio" },
  tiktok: { utm_source: "tiktok", utm_medium: "social", utm_campaign: "bio" },
  yt: { utm_source: "youtube", utm_medium: "video", utm_campaign: "bio" },
  fb: { utm_source: "facebook", utm_medium: "social", utm_campaign: "bio" },
};

/** Destination d'un lien court : accueil, UTM du canal, paramètres reçus prioritaires. */
export function buildShortLinkTarget(slug: string, search: string, hash = ""): string | null {
  const link = SHORT_LINKS[slug.toLowerCase()];
  if (!link) return null;
  const params = new URLSearchParams(search);
  for (const [key, value] of Object.entries(link)) {
    if (!params.get(key)) params.set(key, value);
  }
  return `/?${params.toString()}${hash}`;
}
