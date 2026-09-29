/**
 * Lot A11 : liste unique des catégories d'articles (13 en base le 29/09),
 * partagée par la liste et l'éditeur.
 */
export const ARTICLE_CATEGORIES: Record<string, string> = {
  guide_local: "Guide local",
  thematique: "Thématique",
  guide_race: "Guide race",
  conseil_proprio: "Conseil propriétaire",
  guide_pratique: "Guide pratique",
  vie_locale: "Vie locale",
  conseil_gardien: "Conseil gardien",
  guide_ville: "Guide de ville",
  ville: "Ville",
  saisonnier: "Saisonnier",
  guide_central: "Guide central",
  temoignage: "Témoignage",
  actualite: "Actualité",
};

/** Règle unique de méta description : 155 caractères au plus. */
export const META_DESCRIPTION_MAX = 155;

export type ArticleSaveAction = "draft" | "publish" | "unpublish";

/**
 * Statut de publication après une action de l'éditeur.
 * « Sauvegarder » garde le statut courant : un article publié reste publié.
 * Seul « Dépublier » repasse l'article en brouillon.
 */
export function nextPublishedState(action: ArticleSaveAction, currentlyPublished: boolean): boolean {
  if (action === "publish") return true;
  if (action === "unpublish") return false;
  return currentlyPublished;
}
