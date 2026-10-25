/**
 * Lot E18 (25/10/2026) : lexique unique des écrans d'entraide.
 * Source : supabase/functions/_shared/entraideCopy.ts, partagée avec les
 * envois (email aux aidants). Les écrans lisent ces libellés au lieu de les
 * réécrire : besoin, coup de main, Je peux, Choisir {prénom},
 * Merci, c'est pourvu, En retour, Le coup de main a eu lieu ?
 */
export {
  ENTRAIDE_COPY,
  ENTRAIDE_DURATION_LABELS,
  chooseLabel,
  distancePhrase,
  entraideDurationLabel,
  needHeadline,
  publishedReachLine,
  quotableNeedTitle,
} from "../../supabase/functions/_shared/entraideCopy.ts";
