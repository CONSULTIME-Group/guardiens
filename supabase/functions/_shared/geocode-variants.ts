/**
 * Variantes de requête pour le géocodage.
 *
 * Constat : "Hauteur de Taravao" (Polynésie française) ne renvoie rien chez
 * Nominatim, alors que "Taravao" est connu et déjà en cache. On produit donc
 * des variantes en retirant les mots de tête un par un, et on accepte le
 * rattachement à la France pour les territoires d'outre-mer.
 *
 * Copie stricte de
 * src/lib/geocodeVariants.ts (les fonctions Edge ne
 * peuvent pas importer src/). Toute modification doit être reportée.
 */

/** Mots vides qui ne peuvent pas commencer une variante utile. */
const STOP_WORDS = new Set(["de", "du", "des", "la", "le", "les", "l", "d", "aux", "au"]);

const isStopWord = (word: string) =>
  STOP_WORDS.has(
    word
      .toLowerCase()
      .replace(/['’]$/, "")
      .replace(/[^a-zà-ÿ]/gi, ""),
  );

/**
 * Produit les variantes de nom de ville, de la plus complète à la plus courte.
 * Un nom d'un seul mot (y compris composé par tirets, "Saint-Denis") n'est
 * jamais découpé.
 */
export function cityQueryVariants(city: string): string[] {
  const base = (city || "").replace(/\s+/g, " ").trim();
  if (!base) return [];
  const words = base.split(" ");
  const out: string[] = [base];
  for (let i = 1; i < words.length; i++) {
    const rest = words.slice(i);
    if (isStopWord(rest[0])) continue;
    const candidate = rest.join(" ");
    if (candidate.length >= 3 && !out.includes(candidate)) out.push(candidate);
  }
  return out;
}

/** Codes pays des territoires français d'outre-mer. */
export const OVERSEAS_COUNTRY_CODES = [
  "PF", "NC", "RE", "GP", "MQ", "GF", "YT", "PM", "WF", "BL", "MF",
];

export function isOverseasCountry(country?: string | null): boolean {
  const code = (country || "").trim().toUpperCase();
  return OVERSEAS_COUNTRY_CODES.includes(code);
}

/**
 * Variantes de pays : pour l'outre-mer, le cache comme Nominatim rattachent
 * souvent la commune à la France.
 */
export function countryQueryVariants(country?: string | null): (string | undefined)[] {
  const raw = (country || "").trim();
  if (!raw) return [undefined];
  if (isOverseasCountry(raw)) return [raw, "France", "FR"];
  return [raw];
}
