/**
 * Tokenise les `custom_skills` (savoir-faire libres) saisis par les membres.
 *
 * En base, un même entry peut contenir :
 *  - un mot-clé pur : "Couture"
 *  - une liste séparée : "Couture, Bricolage / Yoga; Informatique"
 *  - une phrase entière : "Je peux promener un chien et arroser les plantes."
 *
 * Pour générer des pastilles utiles, on découpe sur les séparateurs courants
 * (virgule, point-virgule, slash, pipe, puce, tiret entouré d'espaces, retour
 * ligne, « et »/« & ») puis on garde uniquement les tokens courts et propres.
 *
 * Règles de validité d'une pastille :
 *  - 2 à 22 caractères après trim
 *  - pas de ponctuation de phrase (. ! ?) — restes de phrase = bruit
 *  - dédupliqué insensible à la casse
 *  - capitalisation cosmétique (1ʳᵉ lettre en majuscule)
 */

const SEPARATORS = /\s*(?:,|;|\/|\||·|•|\n|\r|\bet\b|&|—|–| - )\s*/gi;

const MIN_LEN = 2;
const MAX_LEN = 22;

const STOP_PREFIXES = [
  "je peux ", "je sais ", "je propose ", "je fais ",
  "je suis ", "je m'occupe ", "je m occupe ",
];

const stripStopPrefix = (s: string): string => {
  const lower = s.toLowerCase();
  for (const p of STOP_PREFIXES) {
    if (lower.startsWith(p)) return s.slice(p.length);
  }
  return s;
};

const cleanToken = (raw: string): string => {
  return raw
    .trim()
    .replace(/^[-–—•·*\s]+/, "")     // puces & tirets de début
    .replace(/[.!?…]+$/, "")          // ponctuation finale
    .trim();
};

const capitalize = (s: string): string =>
  s.length === 0 ? s : s.charAt(0).toUpperCase() + s.slice(1);

const isValid = (s: string): boolean => {
  if (s.length < MIN_LEN || s.length > MAX_LEN) return false;
  if (/[.!?]/.test(s)) return false;
  return true;
};

/**
 * @param raw Liste brute (peut contenir des phrases entières).
 * @returns Liste de pastilles courtes, dédupliquées, capitalisées.
 */
export const tokenizeSkillPhrases = (raw: (string | null | undefined)[] | null | undefined): string[] => {
  if (!raw || raw.length === 0) return [];
  const seen = new Set<string>();
  const out: string[] = [];

  for (const entry of raw) {
    if (!entry || typeof entry !== "string") continue;
    const stripped = stripStopPrefix(entry.trim());
    const parts = stripped.split(SEPARATORS);
    for (const part of parts) {
      const cleaned = cleanToken(part);
      if (!isValid(cleaned)) continue;
      const key = cleaned.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(capitalize(cleaned));
    }
  }
  return out;
};
