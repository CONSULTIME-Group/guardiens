/**
 * Règle de la photo à la publication d'une entraide, source unique.
 *
 * Une offre d'aide se présente toujours avec une image, quelle que soit la
 * catégorie : c'est la personne qui se rend visible. Pour une demande, la
 * photo n'est exigée que si l'objet du coup de main se montre (animal,
 * jardin, pièce ou objet à réparer). Partout ailleurs, elle reste facultative.
 */

/** Catégories dont l'objet se montre, donc photo attendue pour une demande. */
export const PHOTO_REQUIRED_NEED_CATEGORIES = ["animals", "garden", "house"] as const;

export function isPhotoRequiredByRule(
  missionType: "besoin" | "offre",
  category: string | null | undefined,
): boolean {
  if (missionType === "offre") return true;
  return (PHOTO_REQUIRED_NEED_CATEGORIES as readonly string[]).includes(category || "");
}
