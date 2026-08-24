/**
 * Accord en nombre pour les libellés « nombre + nom (+ adjectif) ».
 * Singulier pour 0 et 1, pluriel sinon. Règles de pluriel :
 * les mots en « al » prennent « aux » (guide local, guides locaux),
 * les mots terminés par s, x ou z restent invariables,
 * les autres prennent « s ». Chaque mot du libellé s'accorde
 * (ville couverte, villes couvertes). À réserver aux libellés
 * composés d'un nom suivi de ses adjectifs.
 */
const ENDS_AL = /al$/i;
const INVARIABLE = /[sxz]$/i;

export const pluralizeWord = (word: string, count: number): string => {
  if (count <= 1) return word;
  if (INVARIABLE.test(word)) return word;
  if (ENDS_AL.test(word)) return `${word.slice(0, -2)}aux`;
  return `${word}s`;
};

export const countLabel = (count: number, singularLabel: string): string =>
  `${count} ${singularLabel
    .split(" ")
    .map((word) => pluralizeWord(word, count))
    .join(" ")}`;
