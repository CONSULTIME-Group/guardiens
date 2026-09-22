// Prénom affiché dans les emails, source unique.
//
// Appliqué à TOUT templateData par send-transactional-email avant le rendu et
// avant le calcul du sujet : tous les templates transactionnels et de
// nurturing en bénéficient sans modification individuelle.
//
// Deux traitements, dans cet ordre :
//   1. publicFirstName : retire les segments qui portent une marque de nom de
//      famille (capitales, initiales collées), même règle que src/lib/displayName.ts.
//   2. capitalizeFirstName : première lettre de chaque mot en majuscule, y
//      compris après un trait d'union ou une apostrophe. « jeremie » devient
//      « Jeremie », « jean-claude » devient « Jean-Claude ».
//
// Les données en base ne sont jamais réécrites, seul l'affichage change.

const MAX_WORDS = 3;

function looksLikeSurname(word: string): boolean {
  if (word.includes(".")) return true;
  const letters = word.replace(/[^\p{L}]/gu, "");
  if (letters.length < 2) return false;
  return letters === letters.toLocaleUpperCase("fr-FR")
    && letters !== letters.toLocaleLowerCase("fr-FR");
}

export function publicFirstName(value: unknown): unknown {
  if (typeof value !== "string") return value;
  const words = value.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "";
  const hasNonSurnameWord = words.some((word) => !looksLikeSurname(word));
  const kept: string[] = [];
  for (const word of words) {
    if (hasNonSurnameWord && looksLikeSurname(word)) break;
    kept.push(word);
    if (kept.length === MAX_WORDS) break;
  }
  return (kept.length ? kept : [words[0]]).join(" ");
}

/**
 * Capitalise chaque mot. Un prénom déjà saisi tout en capitales est laissé
 * tel quel : sa casse est une saisie du membre, pas une erreur d'affichage.
 */
export function capitalizeFirstName(value: unknown): unknown {
  if (typeof value !== "string") return value;
  if (value.trim().length === 0) return value;
  const letters = value.replace(/[^\p{L}]/gu, "");
  const isAllCaps = letters.length >= 2
    && letters === letters.toLocaleUpperCase("fr-FR")
    && letters !== letters.toLocaleLowerCase("fr-FR");
  if (isAllCaps) return value;
  return value.replace(
    /(^|[\s\-'’])(\p{L})/gu,
    (_m, sep: string, letter: string) => sep + letter.toLocaleUpperCase("fr-FR"),
  );
}

/**
 * Vrai pour firstName, sitterFirstName, ownerFirstName, first_name,
 * sitter_first_name. La règle historique ne couvrait que les clés en
 * camelCase composées : « firstName », la clé la plus utilisée, échappait au
 * nettoyage.
 */
export function isFirstNameKey(key: string): boolean {
  return /^firstName$/.test(key)
    || /FirstName$/.test(key)
    || /(^|_)first_name$/.test(key);
}

export function normalizeEmailFirstNames(
  templateData: Record<string, unknown>,
): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(templateData).map(([key, value]) => [
      key,
      isFirstNameKey(key) ? capitalizeFirstName(publicFirstName(value)) : value,
    ]),
  );
}
