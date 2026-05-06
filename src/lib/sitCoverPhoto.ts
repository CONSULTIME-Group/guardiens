/**
 * Résolution de la photo de couverture d'une annonce.
 *
 * Cascade :
 *   sit.cover_photo_url
 *   → property.cover_photo_url
 *   → property.photos[0]
 *   → ownerGallery[0]   (fallback automatique quand l'hôte n'a plus de photos sur la fiche logement)
 *   → null
 *
 * Tolérant aux deux formes de jointure Supabase :
 * - sit.properties (pluriel, jointure standard)
 * - sit.property (singulier, alias éventuel)
 */
type PropertyLike = {
  cover_photo_url?: string | null;
  photos?: string[] | null;
} | null | undefined;

type SitLike = {
  cover_photo_url?: string | null;
  properties?: PropertyLike;
  property?: PropertyLike;
} | null | undefined;

type OwnerGalleryLike =
  | string[]
  | Array<{ photo_url?: string | null }>
  | null
  | undefined;

function firstOwnerGalleryPhoto(gallery: OwnerGalleryLike): string | null {
  if (!Array.isArray(gallery) || gallery.length === 0) return null;
  for (const item of gallery) {
    if (typeof item === "string") {
      if (item.trim()) return item;
    } else if (item && typeof item.photo_url === "string" && item.photo_url.trim()) {
      return item.photo_url;
    }
  }
  return null;
}

export function resolveSitCoverPhoto(
  sit: SitLike,
  fallbackProperty?: PropertyLike,
  ownerGallery?: OwnerGalleryLike
): string | null {
  if (sit?.cover_photo_url && sit.cover_photo_url.trim()) return sit.cover_photo_url;
  const prop = sit?.properties || sit?.property || fallbackProperty;
  return resolvePropertyCover(prop, ownerGallery);
}

export function resolvePropertyCover(
  property: PropertyLike,
  ownerGallery?: OwnerGalleryLike
): string | null {
  if (property) {
    if (property.cover_photo_url && property.cover_photo_url.trim()) {
      return property.cover_photo_url;
    }
    if (Array.isArray(property.photos) && property.photos.length > 0) {
      const first = property.photos.find((p) => typeof p === "string" && p.trim());
      if (first) return first;
    }
  }
  return firstOwnerGalleryPhoto(ownerGallery);
}
