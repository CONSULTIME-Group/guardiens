/**
 * Logique pure de la visionneuse du profil public (gardien et propriétaire).
 *
 * Règle produit (19/08/2026) : cliquer sur la photo de profil ouvre la
 * visionneuse SUR CETTE PHOTO. L'avatar devient la première image du jeu,
 * la galerie suit derrière. Cliquer sur la vignette k de la galerie ouvre
 * sur la vignette k (décalée de 1 quand l'avatar précède).
 *
 * Confidentialité : la galerie est réservée aux membres connectés (elle
 * n'est tout simplement pas chargée côté anonyme), donc un visiteur
 * déconnecté qui clique sur l'avatar ne voit que l'avatar.
 */

export interface ProfileLightboxItem {
  photo_url: string;
  caption: string | null;
  source?: string;
  kind: "avatar" | "gallery";
}

export interface GalleryPhotoLike {
  photo_url: string;
  caption?: string | null;
  source?: string;
}

/** Un avatar cliquable exige une vraie photo (jamais le placeholder). */
export function isRealAvatarUrl(url: string | null | undefined): boolean {
  return !!url && !url.includes("placeholder.svg");
}

/**
 * Construit le jeu d'images de la visionneuse : avatar en tête s'il existe,
 * puis les photos de galerie dans leur ordre d'affichage.
 */
export function buildProfileLightboxItems(
  avatarUrl: string | null | undefined,
  gallery: GalleryPhotoLike[],
): ProfileLightboxItem[] {
  const items: ProfileLightboxItem[] = [];
  if (isRealAvatarUrl(avatarUrl)) {
    items.push({ photo_url: avatarUrl as string, caption: null, kind: "avatar" });
  }
  for (const g of gallery) {
    items.push({
      photo_url: g.photo_url,
      caption: g.caption ?? null,
      source: g.source,
      kind: "gallery",
    });
  }
  return items;
}

/**
 * Index de la vignette `thumbnailIndex` dans le jeu de la visionneuse.
 * Décalée de 1 quand l'avatar occupe la première position.
 */
export function thumbnailLightboxIndex(thumbnailIndex: number, hasAvatar: boolean): number {
  return thumbnailIndex + (hasAvatar ? 1 : 0);
}

/** Navigation circulaire : précédent/suivant bouclent aux extrémités. */
export function wrapIndex(index: number, total: number): number {
  if (total <= 0) return 0;
  return ((index % total) + total) % total;
}
