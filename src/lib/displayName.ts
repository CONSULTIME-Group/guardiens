import { formatFirstName } from "./formatFirstName";
/**
 * Prénom public d'un membre.
 *
 * Un prénom composé est un prénom : « Jean Claude », « Marie Christine »,
 * « Anne Sophie », avec ou sans trait d'union, s'affichent entiers.
 *
 * Certains membres saisissent en revanche leur nom de famille dans le champ
 * prénom, par exemple « Heiarii FAUA » ou « A .KH.BARRO ». Quand la casse
 * permet de distinguer le prénom du nom, on retire les segments qui portent
 * une marque de nom de famille : capitales ou initiales collées.
 * Un champ saisi entièrement en capitales reste entier car sa casse ne permet
 * pas cette distinction.
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

  const hasNonSurnameWord = words.some((word) => !looksLikeSurname(word));
  const kept: string[] = [];
  for (const word of words) {
    if (hasNonSurnameWord && looksLikeSurname(word)) break;
    kept.push(word);
    if (kept.length === MAX_WORDS) break;
  }

  // Aucun mot retenu : le champ ne contient que des capitales ou des
  // initiales, on garde le premier mot plutôt que de renvoyer du vide.
  if (kept.length === 0) return words[0];
  return kept.join(" ");
}

/** Casse d'affichage d'un prénom, délègue à formatFirstName (règle unique). */
export function capitalizeFirstName(value: string | null | undefined): string {
  return formatFirstName(value);
}
