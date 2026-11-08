/**
 * Lot PUB3 (recette du 08/11/2026) : « Retour » sur une page ouverte
 * directement (lien d'un email de relance, notification, favori) n'a aucune
 * page précédente dans le site. navigate(-1) sortait alors de Guardiens :
 * onglet vide, ou retour à la messagerie. React Router numérote les entrées
 * qu'il crée (history.state.idx) : 0 veut dire première page de l'onglet.
 */
export const BACK_FALLBACK_PATH = "/dashboard";

export function hasInAppHistory(state: unknown = typeof window !== "undefined" ? window.history.state : null): boolean {
  const idx = (state as { idx?: unknown } | null)?.idx;
  return typeof idx === "number" && idx > 0;
}
