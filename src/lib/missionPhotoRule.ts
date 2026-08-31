/**
 * Règle de la photo à la publication d'une entraide, source unique.
 *
 * Une offre d'aide n'exige aucune photo : la personne qui propose de promener
 * un chien le week-end n'a rien à photographier, et sa photo de profil illustre
 * déjà son offre. Exiger un envoi de fichier serait une marche gratuite,
 * imposée à la majorité du trafic.
 *
 * Pour une demande, la photo n'est attendue que si l'objet du coup de main se
 * montre (animal, jardin, pièce ou objet à réparer), car elle aide alors
 * réellement à comprendre. Partout ailleurs, elle reste facultative.
 */

/** Catégories dont l'objet se montre, donc photo attendue pour une demande. */
export const PHOTO_REQUIRED_NEED_CATEGORIES = ["animals", "garden", "house"] as const;

export function isPhotoRequiredByRule(
  missionType: "besoin" | "offre",
  category: string | null | undefined,
): boolean {
  if (missionType === "offre") return false;
  return (PHOTO_REQUIRED_NEED_CATEGORIES as readonly string[]).includes(category || "");
}
