/**
 * Centralised string normalisation utilities.
 *
 * Goal: garantir le MÊME comportement de comparaison/recherche/slugification
 * partout dans l'app — autocomplete, recherche, slugs SEO, comparaisons
 * insensibles aux accents et à la casse, etc.
 *
 * Règles communes : lower-case, suppression des diacritiques (NFD + strip
 * combining marks), trim. Les variantes ajoutent éventuellement la
 * suppression d'espaces ou la transformation en slug.
 */

/**
 * Normalise une chaîne pour comparaison/recherche : lower-case, sans accents,
 * trimmée. Utilise NFD pour décomposer les diacritiques puis les retire.
 *
 * Exemples :
 *   normalize("Rhône") === "rhone"
 *   normalize("  Île-de-France ") === "ile-de-france"
 *   normalize("Œuf") === "œuf" (NFD ne décompose pas Œ — voir normalizeStrict)
 */
export function normalize(input: string | null | undefined): string {
  if (!input) return "";
  return input
    .toString()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

/**
 * Variante qui gère aussi quelques caractères composés non décomposables
 * par NFD (œ, æ, ß, ø…) — utile pour les recherches très tolérantes.
 */
export function normalizeStrict(input: string | null | undefined): string {
  return normalize(input)
    .replace(/œ/g, "oe")
    .replace(/æ/g, "ae")
    .replace(/ß/g, "ss")
    .replace(/ø/g, "o")
    .replace(/ð/g, "d")
    .replace(/þ/g, "th");
}

/**
 * Normalise puis remplace toute séquence de caractères non alphanumériques
 * par un tiret unique. Utilisée pour générer des slugs URL/SEO stables.
 *
 * Exemple : slugify("Saint-Étienne / 42") === "saint-etienne-42"
 */
export function slugify(input: string | null | undefined): string {
  return normalizeStrict(input)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Compare deux chaînes en ignorant casse, accents et espaces de bordure.
 */
export function looseEquals(a: string | null | undefined, b: string | null | undefined): boolean {
  return normalize(a) === normalize(b);
}

/**
 * Vérifie qu'une chaîne contient une autre (en mode normalisé).
 */
export function looseIncludes(haystack: string | null | undefined, needle: string | null | undefined): boolean {
  const n = normalize(needle);
  if (!n) return true;
  return normalize(haystack).includes(n);
}
