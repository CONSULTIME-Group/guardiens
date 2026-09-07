/**
 * Prénom public d'un membre.
 *
 * Un prénom composé est un prénom : « Jean Claude », « Marie Christine »,
 * « Anne Sophie », avec ou sans trait d'union, s'affichent entiers.
 *
 * Certains membres saisissent en revanche leur nom de famille dans le champ
 * prénom, par exemple « Heiarii FAUA » ou « A .KH.BARRO ». On retire donc
 * uniquement les segments qui portent une marque de nom de famille :
 *   - un mot entièrement en capitales (au moins deux lettres),
 *   - un mot contenant un point (initiales collées).
 * Tout le reste est conservé, dans la limite de trois mots.
 *
 * Les données en base ne sont jamais réécrites, seul l'affichage change.
 */
const MAX_WORDS = 3;

function looksLikeSurname(word: string): boolean {
  if (word.includes(".")) return true;
  const letters = word.replace(/[^\p{L}]/gu, "");
  if (letters.length < 2) return false;
  return letters === letters.toLocaleUpperCase("fr-FR")
    && letters !== letters.toLocaleLowerCase("fr-FR");
}

export function publicFirstName(value: string | null | undefined): string {
  if (!value) return "";
  const words = value.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "";

  const kept: string[] = [];
  for (const word of words) {
    if (looksLikeSurname(word)) break;
    kept.push(word);
    if (kept.length === MAX_WORDS) break;
  }

  // Aucun mot retenu : le champ ne contient que des capitales ou des
  // initiales, on garde le premier mot plutôt que de renvoyer du vide.
  if (kept.length === 0) return words[0];
  return kept.join(" ");
}

/**
 * Capitalise chaque mot d'un prénom, y compris les prénoms composés reliés
 * par un espace ou un trait d'union. « JEAN CLAUDE » devient « Jean Claude ».
 */
export function capitalizeFirstName(value: string | null | undefined): string {
  if (!value) return "";
  return value
    .toLocaleLowerCase("fr-FR")
    .replace(/(^|[\s\-'’])(\p{L})/gu, (_m, sep: string, letter: string) =>
      sep + letter.toLocaleUpperCase("fr-FR"));
}
