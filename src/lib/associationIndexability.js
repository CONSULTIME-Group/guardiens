/**
 * Règle unique d'indexabilité d'une fiche association.
 *
 * Partagée par :
 *  - scripts/generate-sitemap.mjs (inclusion dans le sitemap)
 *  - src/pages/AssociationDetail.tsx (meta robots)
 *
 * Une fiche entre dans l'index quand elle porte une présentation rédigée
 * d'au moins 150 caractères. En dessous, la page reste consultable et suivie
 * en liens, elle sort simplement de l'index.
 */

export const ASSOCIATION_MIN_DESCRIPTION_LENGTH = 150;

/**
 * @param {{ description?: string | null }} association
 * @returns {boolean}
 */
export function isAssociationIndexable(association) {
  if (!association) return false;
  const description = (association.description || "").trim();
  return description.length >= ASSOCIATION_MIN_DESCRIPTION_LENGTH;
}
