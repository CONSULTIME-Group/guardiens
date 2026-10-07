// Lot L2 : une photo du logement se gère à un seul endroit, la Galerie du
// profil propriétaire. Question détectée par motifs, réponse et action fixes.

export const HOME_PHOTO_PATH = "/owner-profile?section=gallery";
export const HOME_PHOTO_ACTION = { label: "Ouvrir ma Galerie", path: HOME_PHOTO_PATH, reason: "galerie_logement" };
export const HOME_PHOTO_ANSWER =
  "Les photos de votre logement se gèrent à un seul endroit : Mon profil propriétaire, rubrique Galerie. " +
  "Vous pouvez y ajouter, remplacer ou supprimer chaque photo avec le bouton de suppression. " +
  "Si la photo supprimée servait de couverture à votre annonce, la photo suivante de la Galerie la remplace.";

const norm = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, " ").trim();

const PHOTO = /\b(photos?|images?|clich[e]s?)\b/;
const ACTION = /\b(supprim|retir|enlev|effac|chang|remplac|modifi|ajout|mettre|met|ajoute|charg|telecharg|trouv)/;
const HOME = /\b(maison|logement|appartement|appart|chalet|jardin|domicile|chez moi|propriete|galerie|annonce)\b/;
const NOT_HOME = /\b(profil|avatar|portrait|chien|chat|animal|animaux|cheval|visage)\b/;

/** Vrai pour « supprimer la photo de ma maison », faux pour une photo de profil ou d'animal. */
export function detectHomePhotoQuestion(message: string): boolean {
  const q = norm(message || "");
  if (!PHOTO.test(q) || !ACTION.test(q)) return false;
  if (!HOME.test(q)) return false;
  if (NOT_HOME.test(q) && !/\b(maison|logement|appartement|jardin)\b/.test(q)) return false;
  return true;
}
