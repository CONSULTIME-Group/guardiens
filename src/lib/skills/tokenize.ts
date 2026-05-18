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

/**
 * Bornes par défaut de longueur d'une pastille « savoir-faire ».
 *  - `SKILL_TOKEN_MIN_LEN` : 2 caractères (évite les fragments « a », « j' »).
 *  - `SKILL_TOKEN_MAX_LEN` : 22 caractères (au-delà = phrase, pas un mot-clé).
 *
 * Override possible via le paramètre `maxLen` de `tokenizeSkillPhrases`
 * pour ajuster localement (ex. carte profil 28, vignette compacte 18).
 */
export const SKILL_TOKEN_MIN_LEN = 2;
export const SKILL_TOKEN_MAX_LEN = 22;

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

const isValid = (s: string, minLen: number, maxLen: number): boolean => {
  if (s.length < minLen || s.length > maxLen) return false;
  if (/[.!?]/.test(s)) return false;
  return true;
};

/**
 * Clé canonique pour comparer deux pastilles « savoir-faire » :
 *  - trim
 *  - collapse espaces internes
 *  - bascule en minuscules
 *  - retrait des diacritiques (é→e, ç→c, etc.)
 *
 * Permet de dédupliquer « Couture », « couture », « COUTURE  »,
 * « Cuisiné » vs « cuisine », etc.
 */
export const normalizeSkillKey = (s: string | null | undefined): string => {
  if (!s) return "";
  return s
    .trim()
    .replace(/\s+/g, " ")
    .toLocaleLowerCase("fr")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
};

export interface TokenizeOptions {
  /** Longueur min (incluse). Défaut : `SKILL_TOKEN_MIN_LEN` (2). */
  minLen?: number;
  /** Longueur max (incluse). Défaut : `SKILL_TOKEN_MAX_LEN` (22). */
  maxLen?: number;
}

/**
 * @param raw Liste brute (peut contenir des phrases entières).
 * @param options Bornes de longueur configurables.
 * @returns Liste de pastilles courtes, dédupliquées, capitalisées.
 */
export const tokenizeSkillPhrases = (
  raw: (string | null | undefined)[] | null | undefined,
  options: TokenizeOptions = {},
): string[] => {
  if (!raw || raw.length === 0) return [];
  const minLen = options.minLen ?? SKILL_TOKEN_MIN_LEN;
  const maxLen = options.maxLen ?? SKILL_TOKEN_MAX_LEN;
  const seen = new Set<string>();
  const out: string[] = [];

  for (const entry of raw) {
    if (!entry || typeof entry !== "string") continue;
    const stripped = stripStopPrefix(entry.trim());
    const parts = stripped.split(SEPARATORS);
    for (const part of parts) {
      const cleaned = cleanToken(stripStopPrefix(part).replace(/\s+/g, " "));
      if (!isValid(cleaned, minLen, maxLen)) continue;
      const key = normalizeSkillKey(cleaned);
      if (!key || seen.has(key)) continue;
      seen.add(key);
      out.push(capitalize(cleaned));
    }
  }
  return out;
};

/**
 * Déduplique une liste d'objets « chip » par label normalisé.
 * Garde la 1ʳᵉ occurrence — passez les chips prioritaires en premier
 * (ex. custom avant category).
 */
export const dedupeChipsByLabel = <T extends { label: string }>(chips: T[]): T[] => {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const chip of chips) {
    const key = normalizeSkillKey(chip.label);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(chip);
  }
  return out;
};

