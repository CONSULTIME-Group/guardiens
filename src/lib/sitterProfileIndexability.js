/**
 * Règle unique d'indexabilité d'une fiche gardien `/gardiens/:id`.
 *
 * Politique posée le 20/07/2026, confirmée le 12/08/2026 : rouvrir le canal
 * SEO des profils sans exposer les fiches vides. Une fiche est indexable si
 * elle a une bio substantielle (au moins 80 caractères de texte libre) ET au
 * moins un signal de confiance (identité vérifiée OU au moins une photo de
 * galerie).
 *
 * Motif de la confirmation : sur 972 profils, 832 ont une motivation vide et
 * la longueur moyenne du texte libre est de 49 caractères. Seules les fiches
 * substantielles méritent l'index.
 *
 * Source de vérité unique, utilisée des deux côtés :
 *  - src/pages/PublicSitterProfile.tsx (meta robots via PageMeta) ;
 *  - scripts/generate-sitemap.mjs (inclusion dans public/sitemap.xml).
 *
 * Le composant passe des textes déjà nettoyés par sanitizeBioForPublic, le
 * script passe les textes bruts : le masquage des coordonnées ne change pas
 * l'ordre de grandeur de la longueur, la règle reste la même.
 *
 * Aucun `Disallow` ne doit être posé sur `/gardiens` : il empêcherait Google
 * de voir le `noindex` des fiches non éligibles, donc bloquerait leur
 * désindexation.
 */

/** Longueur minimale du texte libre (bio, à défaut motivation). */
export const MIN_SITTER_BIO_LENGTH = 80;

/**
 * @param {{ bio?: string | null, motivation?: string | null, identityVerified?: boolean | null, galleryCount?: number | null }} input
 * @returns {boolean}
 */
export function hasSubstantialSitterBio(input) {
  if (!input) return false;
  const text = input.bio || input.motivation || "";
  return text.length >= MIN_SITTER_BIO_LENGTH;
}

/**
 * @param {{ identityVerified?: boolean | null, galleryCount?: number | null }} input
 * @returns {boolean}
 */
export function hasSitterTrustSignal(input) {
  if (!input) return false;
  return !!input.identityVerified || (input.galleryCount || 0) >= 1;
}

/**
 * Règle complète : bio substantielle ET signal de confiance.
 * @param {{ bio?: string | null, motivation?: string | null, identityVerified?: boolean | null, galleryCount?: number | null }} input
 * @returns {boolean}
 */
export function isSitterProfileIndexable(input) {
  return hasSubstantialSitterBio(input) && hasSitterTrustSignal(input);
}
