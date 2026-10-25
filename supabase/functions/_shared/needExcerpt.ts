/**
 * Lot E13 (24/10/2026), partagé par le lot E18 (25/10/2026) : extrait lisible
 * de la description d'un besoin, pour la liste de l'Entraide, la fenêtre
 * « Je peux » et l'email aux aidants (même logique côté site et côté envoi).
 * Espaces regroupés, titre répété en tête retiré, coupe à un mot entier.
 * Le texte du membre reste tel qu'il l'a écrit. Module pur, sans dépendance.
 */
const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/\s+/g, " ").trim();

export const NEED_EXCERPT_MAX = 1200;

/** Lot E18 : deux lignes d'extrait dans l'email aux aidants. */
export const NEED_EXCERPT_EMAIL_MAX = 180;

export function needExcerpt(description: string | null | undefined, title?: string | null, max: number = NEED_EXCERPT_MAX): string | null {
  if (typeof description !== "string") return null;
  let text = description.replace(/\s+/g, " ").trim();
  if (!text) return null;
  const t = typeof title === "string" ? title.replace(/\s+/g, " ").trim() : "";
  if (t && norm(text).startsWith(norm(t)) && text.length > t.length) {
    text = text.slice(t.length).replace(/^[\s.,:;!?)]+/, "").trim();
  }
  if (!text) return null;
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  const lastSpace = cut.lastIndexOf(" ");
  return `${(lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut).trim()}…`;
}
