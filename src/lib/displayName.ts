/**
 * Prénom public d'un membre.
 *
 * Certains membres saisissent leur nom complet dans le champ prénom,
 * par exemple « Heiarii FAUA ». Sur les surfaces publiques on n'affiche
 * que le premier mot, qui est le prénom réel. Un prénom composé relié
 * par un tiret ou une apostrophe reste un seul mot, par exemple
 * « Jean-Baptiste » ou « Marie-Claire ». Seul un espace sépare le
 * prénom du reste.
 *
 * Les données en base ne sont jamais réécrites, seul l'affichage change.
 */
export function publicFirstName(value: string | null | undefined): string {
  if (!value) return "";
  const trimmed = value.trim();
  if (!trimmed) return "";
  const [first] = trimmed.split(/\s+/, 1);
  return first ?? "";
}
