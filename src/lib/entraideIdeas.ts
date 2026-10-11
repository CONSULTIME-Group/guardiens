/**
 * Lot E4 (11/10/2026) : idées de la page Entraide et adresses qu'elles ouvrent.
 * Logique pure, testable sans rendu.
 */

export const ENTRAIDE_IDEAS = [
  { key: "potager", label: "Arroser le potager" },
  { key: "courses", label: "Faire les courses" },
  { key: "meuble", label: "Monter un meuble" },
  { key: "chien", label: "Promener le chien" },
  { key: "chat", label: "Nourrir le chat" },
  { key: "jeux", label: "Une partie de jeux de société" },
] as const;

export type EntraideIdeaKey = (typeof ENTRAIDE_IDEAS)[number]["key"];

/** Formulaire de besoin, titre prérempli ; un visiteur passe par l'inscription. */
export function needFormPath(isAuthenticated: boolean, title?: string | null): string {
  const form = title ? `/petites-missions/creer?titre=${encodeURIComponent(title)}` : "/petites-missions/creer";
  return isAuthenticated ? form : `/inscription?redirect=${encodeURIComponent(form)}`;
}

/** Phrase d'accroche : nombre de personnes prêtes à aider, autour d'une ville ou sur Guardiens. */
export function helpersCountLine(count: number, city: string | null): string | null {
  if (count <= 0) return null;
  const people = count === 1 ? "1 personne est prête" : `${count} personnes sont prêtes`;
  return city ? `Autour de ${city}, ${people} à donner un coup de main.` : `Sur Guardiens, ${people} à donner un coup de main.`;
}

/** Titre de la section des personnes. */
export function helpersSectionTitle(count: number, city: string | null): string {
  if (!city) return "Prêts à aider sur Guardiens";
  if (count <= 0) return `Prêts à aider autour de ${city}`;
  return count === 1
    ? `1 personne prête à aider à moins de 30 km de ${city}`
    : `${count} personnes prêtes à aider à moins de 30 km de ${city}`;
}

/** Bouton qui déplie la liste des personnes : tout le secteur d'un coup s'il est court, sinon par paliers. */
export const HELPERS_FIRST_SHOWN = 4;
export const HELPERS_SHOW_ALL_MAX = 100;
export function helpersMore(shown: number, nearCount: number, allCount: number, pageSize: number): { label: string; next: number } | null {
  if (shown >= allCount) return null;
  if (shown === HELPERS_FIRST_SHOWN && nearCount > shown && nearCount <= HELPERS_SHOW_ALL_MAX) {
    return { label: `Voir les ${nearCount} personnes`, next: nearCount };
  }
  return { label: `Voir ${Math.min(pageSize, allCount - shown)} de plus`, next: shown + pageSize };
}
