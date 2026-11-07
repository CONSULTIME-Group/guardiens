/**
 * Pages où la pastille repliée d'Alma ne s'affiche pas.
 *
 * - /dashboard : Alma vit dans la colonne de droite (lots D1 et D2).
 * - /sits/create, tous parcours (lot PUB2, 07/11/2026) : sur téléphone, la
 *   pastille fixe se pose exactement sur la barre « Enregistrer & quitter /
 *   Suivant » du formulaire (mesuré à 360 x 664 et 390 x 664 : pastille
 *   y 520 à 564, bouton y 528 à 576), le bouton n'est plus touchable. Le
 *   formulaire garde son encart Alma « Décrire en une phrase ». Le parcours
 *   express (lot N7) était déjà concerné.
 */
export function isAlmaPillHiddenOn(pathname: string): boolean {
  return pathname === "/dashboard" || pathname === "/sits/create";
}
