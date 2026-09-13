/**
 * Recommandation de photos au moment de publier une annonce.
 *
 * Recommandation forte, jamais un blocage : le propriétaire peut toujours
 * publier en l'état. Mesure du 13/09/2026 : sur 125 logements, 66 n'ont aucune
 * photo, une obligation dure dépublierait la moitié des annonces en ligne.
 *
 * Les textes sont fixés au mot près, formulation affirmative, vouvoiement,
 * aucune promesse de résultat (aucune mesure ne permet de l'écrire).
 */

/** En dessous de trois photos, la confirmation s'affiche. */
export const PUBLISH_PHOTO_PROMPT_THRESHOLD = 3;

/** Longueur minimale pour considérer les alentours comme décrits. */
export const REGION_HIGHLIGHTS_MIN_LENGTH = 30;

export const PUBLISH_PHOTO_PROMPT_BODY =
  "Les gardiens choisissent une maison où ils arrivent à se projeter. Trois photos y suffisent : la pièce de vie, une chambre, et les alentours où ils se promèneront. Ce dernier point pèse lourd, ils viennent aussi pour l'endroit.";

export const PUBLISH_PHOTO_PROMPT_SURROUNDINGS =
  "Vous pouvez aussi décrire les alentours en deux lignes, les balades, le village, ce qu'on voit depuis la maison.";

export const PUBLISH_PHOTO_PROMPT_ADD_LABEL = "Ajouter des photos";
export const PUBLISH_PHOTO_PROMPT_ANYWAY_LABEL = "Publier ainsi";

/** Chemin de l'étape photos du logement. */
export const PUBLISH_PHOTO_PROMPT_HREF = "/owner-profile?section=housing";

export function countPropertyPhotos(photos: unknown): number {
  if (!Array.isArray(photos)) return 0;
  return photos.filter((p) => typeof p === "string" && p.trim() !== "").length;
}

export function shouldPromptPublishPhotos(photoCount: number): boolean {
  return photoCount < PUBLISH_PHOTO_PROMPT_THRESHOLD;
}

export function publishPhotoPromptTitle(photoCount: number): string {
  if (photoCount <= 0) return "Votre annonce part sans photo";
  if (photoCount === 1) return "Votre annonce part avec une seule photo";
  return "Votre annonce part avec deux photos";
}

/** Le second paragraphe ne sert que si les alentours restent à décrire. */
export function shouldShowSurroundingsParagraph(regionHighlights: unknown): boolean {
  if (typeof regionHighlights !== "string") return true;
  return regionHighlights.trim().length < REGION_HIGHLIGHTS_MIN_LENGTH;
}
