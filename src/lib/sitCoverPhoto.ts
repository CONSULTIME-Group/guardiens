/**
 * Résolution de la photo de couverture d'une annonce.
 *
 * Cascade : sit.cover_photo_url → property.cover_photo_url → property.photos[0] → null
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

export function resolveSitCoverPhoto(
  sit: SitLike,
  fallbackProperty?: PropertyLike
): string | null {
  if (!sit) return resolvePropertyCover(fallbackProperty);
  if (sit.cover_photo_url && sit.cover_photo_url.trim()) return sit.cover_photo_url;
  const prop = sit.properties || sit.property || fallbackProperty;
  return resolvePropertyCover(prop);
}

export function resolvePropertyCover(property: PropertyLike): string | null {
  if (!property) return null;
  if (property.cover_photo_url && property.cover_photo_url.trim()) {
    return property.cover_photo_url;
  }
  if (Array.isArray(property.photos) && property.photos.length > 0) {
    return property.photos[0];
  }
  return null;
}
