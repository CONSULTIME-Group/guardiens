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
  // « vous » : lieu connu par la position, sans nom de ville.
  const place = city === "vous" ? "chez vous" : city;
  return count === 1
    ? `1 personne prête à aider à moins de 30 km de ${place}`
    : `${count} personnes prêtes à aider à moins de 30 km de ${place}`;
}

/** Sans lieu connu : les premiers besoins visibles, le reste replié. */
export const NEEDS_SHOWN_WITHOUT_PLACE = 3;

/**
 * Lot E11 (12/10/2026) : sous ce nombre de besoins proches, les besoins plus
 * loin s'affichent d'emblée, sous un titre. Avec 0 besoin à 30 km de Lyon et
 * 12 ouverts ailleurs, le seul lien replié rendait la liste invisible.
 */
export const FAR_NEEDS_OPEN_BELOW = 3;

/** Les besoins plus loin s'affichent-ils d'emblée ? */
export function farNeedsOpenByDefault(hasPlace: boolean, nearCount: number): boolean {
  return hasPlace && nearCount < FAR_NEEDS_OPEN_BELOW;
}

/** Titre de la section quand les besoins plus loin sont affichés d'emblée. */
export function farNeedsHeading(count: number): string {
  return count === 1 ? "Ailleurs en France, 1 besoin ouvert" : `Ailleurs en France, ${count} besoins ouverts`;
}

/** Libellé du bouton qui déplie les besoins lointains (ou les autres besoins, sans lieu). */
export function farNeedsLabel(count: number, hasPlace: boolean): string {
  if (hasPlace) return `Plus loin : ${count === 1 ? "1 besoin ouvert" : `${count} besoins ouverts`} ailleurs en France`;
  return count === 1 ? "Voir 1 autre besoin ouvert en France" : `Voir les ${count} autres besoins ouverts en France`;
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
