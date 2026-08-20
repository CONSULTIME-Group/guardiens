/**
 * Règle de publication de la motivation gardien.
 * Sous le seuil, le texte reste enregistré en brouillon côté membre mais
 * n'apparaît pas sur la fiche publique.
 */

export const MOTIVATION_MIN_LENGTH = 50;

/** Motivation publiable : au moins 50 caractères utiles, sinon chaîne vide. */
export function publishableMotivation(raw: string | null | undefined): string {
  const v = (raw ?? "").trim();
  return v.length >= MOTIVATION_MIN_LENGTH ? v : "";
}
