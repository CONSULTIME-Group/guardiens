/**
 * Rapprochement race déclarée vers fiche éditoriale, ré-exportation.
 *
 * La source de vérité vit dans
 * `supabase/functions/_shared/breeds/breedFicheMatch.ts`, partagée entre le
 * client et les fonctions edge (rappel J-7 notamment, qui pousse au gardien
 * la fiche de la race de la garde à venir). Une seule implémentation : les
 * alias métier accumulés sur des saisies réelles ne peuvent pas diverger
 * entre l'app et les emails.
 */
export * from "../../supabase/functions/_shared/breeds/breedFicheMatch.ts";
