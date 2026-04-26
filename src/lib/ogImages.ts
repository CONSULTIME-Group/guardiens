/**
 * Sélection stable d'une image OG par hash de l'identifiant de l'annonce.
 *
 * - Toujours la même image pour un sit donné (bon pour les caches Facebook/LinkedIn).
 * - Répartition uniforme sur les 5 visuels grâce à un hash simple (FNV-1a 32 bits).
 * - 5 photos chaleureuses + bande typographique « Guardiens — La confiance entre gens du coin ».
 */

const OG_SIT_IMAGES = [
  "/og/og-sit-1.jpg",
  "/og/og-sit-2.jpg",
  "/og/og-sit-3.jpg",
  "/og/og-sit-4.jpg",
  "/og/og-sit-5.jpg",
] as const;

/** Hash FNV-1a 32 bits — déterministe, rapide, sans dépendance. */
const fnv1a32 = (s: string): number => {
  let hash = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    hash ^= s.charCodeAt(i);
    hash = (hash * 0x01000193) >>> 0;
  }
  return hash >>> 0;
};

/**
 * Renvoie le chemin relatif de l'image OG pour un sit donné.
 * @param sitId UUID de l'annonce (ou tout identifiant stable)
 * @returns chemin relatif type `/og/og-sit-3.jpg`
 */
export const getOgImageForSit = (sitId: string | null | undefined): string => {
  if (!sitId) return OG_SIT_IMAGES[0];
  const idx = fnv1a32(sitId) % OG_SIT_IMAGES.length;
  return OG_SIT_IMAGES[idx];
};

/**
 * Renvoie l'URL absolue de l'image OG (requise par Facebook/LinkedIn).
 * @param sitId UUID de l'annonce
 * @param origin origine du site (ex: `https://guardiens.fr`)
 */
export const getOgImageAbsoluteUrl = (sitId: string | null | undefined, origin?: string): string => {
  const path = getOgImageForSit(sitId);
  const base =
    origin ||
    (typeof window !== "undefined" ? window.location.origin : "https://guardiens.fr");
  return `${base}${path}`;
};

export const OG_SIT_IMAGES_LIST = OG_SIT_IMAGES;
