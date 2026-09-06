/**
 * Placement de la vitrine internationale (06/09/2026).
 * Tant que le nombre d'annonces hors France reste sous ce seuil, le
 * contenu vit dans la FAQ (une question dédiée) plutôt qu'en section de
 * page : un compteur à 1 mis en avant dessert la promesse. Au-dessus du
 * seuil, la section reprend sa place dans le corps de la page.
 */
export const INTERNATIONAL_SECTION_MIN = 5;

export const showInternationalSection = (count: number): boolean =>
  count >= INTERNATIONAL_SECTION_MIN;

export const showInternationalFaq = (count: number): boolean =>
  !showInternationalSection(count);
