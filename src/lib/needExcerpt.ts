/**
 * Lot E13 (24/10/2026, retour de Jérémie sur téléphone) : extrait lisible de
 * la description d'un besoin, pour la liste de l'Entraide et la fenêtre
 * « Je peux ». Espaces regroupés, titre répété en tête retiré, longueur bornée.
 * Le texte du membre reste tel qu'il l'a écrit.
 */
const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/\s+/g, " ").trim();

export const NEED_EXCERPT_MAX = 1200;

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
