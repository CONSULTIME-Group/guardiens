/**
 * Titres de pages (lot SEO-META1, 04/11/2026).
 *
 * PageMeta retire puis réapplique le suffixe " | Guardiens" (12 caractères).
 * Les fonctions ci-dessous produisent donc le titre SANS suffixe, dimensionné
 * pour que le titre final tienne en TITLE_MAX caractères.
 *
 * Mesure du 04/11/2026 sur le plan du site (773 URL, Googlebot) : 14 annonces
 * sur 18 portaient un titre coupé en plein mot et sans ville, 4 un double espace.
 * Cause : le titre complet « {titre} à {ville}, Guardiens » était coupé à
 * 57 caractères, ce qui sacrifiait la ville.
 */

export const TITLE_MAX = 60;
export const TITLE_SUFFIX = " | Guardiens";
/** Longueur maximale du titre avant le suffixe " | Guardiens". */
export const TITLE_BODY_MAX = TITLE_MAX - TITLE_SUFFIX.length;
/** Plancher laissé au titre de l'annonce quand le nom de la ville est très long. */
const MIN_TITLE_CHARS = 12;

const TRAILING_STOPWORDS = new Set([
  "a", "à", "au", "aux", "avec", "de", "des", "du", "d", "en", "et", "la", "le", "les",
  "l", "ou", "par", "pour", "sur", "un", "une", "dans", "mon", "ma", "mes", "ce", "cet",
  "cette", "ses", "son", "sa", "chez", "sans",
]);

/** Espaces multiples, insécables et de bord ramenés à un espace simple. */
export function collapseSpaces(value: string | null | undefined): string {
  return (value ?? "").replace(/[\s ]+/g, " ").trim();
}

/**
 * Titre saisi par un membre, nettoyé sans le réécrire : espaces doublés,
 * espace avant une virgule ou un point (« Aïko , mon border collie »),
 * espaces collés aux parenthèses (« (Provence verte ) »).
 */
export function tidyTitle(value: string | null | undefined): string {
  return collapseSpaces(value)
    .replace(/\s+([,.])/g, "$1")
    .replace(/\(\s+/g, "(")
    .replace(/\s+\)/g, ")");
}

/** Mots qui restent en minuscule dans un nom de commune, sauf en tête. */
const CITY_SMALL_WORDS = new Set([
  "de", "du", "des", "le", "la", "les", "et", "en", "sur", "sous", "lès", "lez", "aux", "au", "à",
]);

/**
 * Nom de commune saisi librement, remis en casse usuelle (lot SEO-META2) :
 * « barjols » → « Barjols », « PLECHATEL » → « Plechatel »,
 * « Vabres l'abbaye » → « Vabres l'Abbaye », « Vallon pont d’arc » → « Vallon Pont d’Arc ».
 * Seule la casse change : ni trait d'union ajouté, ni accent, ni mot retiré.
 */
export function formatCityName(value: string | null | undefined): string {
  const text = collapseSpaces(value);
  if (!text) return "";
  const cap = (w: string) => (w ? w.charAt(0).toUpperCase() + w.slice(1) : w);
  let first = true;
  return text
    .toLowerCase()
    .split(/(\s|-|,)/)
    .map((part) => {
      if (!part || part === " " || part === "-" || part === ",") return part;
      const isFirst = first;
      first = false;
      // Élision : l', d', qu' devant le nom (« l'abbaye » → « l'Abbaye »).
      const elided = part.match(/^(l|d|qu)(['’])(.+)$/);
      if (elided) return `${isFirst ? cap(elided[1]) : elided[1]}${elided[2]}${cap(elided[3])}`;
      if (!isFirst && CITY_SMALL_WORDS.has(part)) return part;
      return cap(part);
    })
    .join("");
}

function stripAccents(value: string): string {
  return value.normalize("NFD").replace(/[̀-ͯ]/g, "");
}

/** Vrai si `text` contient déjà `city` (casse et accents ignorés), comme mot ou groupe de mots entier. */
export function mentionsCity(text: string, city: string): boolean {
  const c = stripAccents(collapseSpaces(city)).toLowerCase();
  if (!c) return false;
  const t = stripAccents(collapseSpaces(text)).toLowerCase();
  const escaped = c.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(^|[^\\p{L}\\p{N}])${escaped}($|[^\\p{L}\\p{N}])`, "u").test(t);
}

/**
 * Coupe `value` à `max` caractères au dernier mot entier, retire les mots
 * de liaison ou chiffres isolés qui termineraient la phrase, puis ajoute « … ».
 * Une valeur qui tient déjà est renvoyée telle quelle.
 */
export function truncateAtWord(value: string, max: number): string {
  const text = collapseSpaces(value);
  if (text.length <= max) return text;
  const room = Math.max(1, max - 1); // place du « … »
  let cut = text.slice(0, room + 1);
  // Si le caractère qui suit la coupe n'est pas un espace, on est au milieu d'un mot.
  if (text[room] !== " ") {
    const lastSpace = cut.lastIndexOf(" ");
    cut = lastSpace > 0 ? cut.slice(0, lastSpace) : text.slice(0, room);
  } else {
    cut = text.slice(0, room);
  }

  // Parenthèse ouverte et non fermée par la coupe : on retire l'aparté entier.
  // Sans suite après la parenthèse fermante, rien n'est perdu, donc pas de « … ».
  let asideDropped = false;
  let endsAfterAside = false;
  const open = cut.lastIndexOf("(");
  if (open >= 0 && open > cut.lastIndexOf(")")) {
    const before = cut.slice(0, open).trimEnd();
    if (before.length >= 8) {
      const close = text.indexOf(")", open);
      endsAfterAside = close >= 0 && text.slice(close + 1).trim() === "";
      cut = before;
      asideDropped = true;
    } else {
      cut = cut.slice(0, open) + cut.slice(open + 1);
    }
  }

  const words = cut.split(" ").filter(Boolean);
  const keepUntilStop = [...words];
  while (
    keepUntilStop.length > 1 &&
    (TRAILING_STOPWORDS.has(keepUntilStop[keepUntilStop.length - 1].toLowerCase()) ||
      /^\d+$/.test(keepUntilStop[keepUntilStop.length - 1]))
  ) {
    keepUntilStop.pop();
  }
  let out = keepUntilStop.join(" ");
  // Un résultat trop court n'aide personne : repli sur la coupe au mot sans nettoyage.
  if (out.length < 8) out = words.join(" ");
  out = out.replace(/[\s,;:.\-\u2013\u2014]+$/u, "");
  return asideDropped && endsAfterAside ? out : `${out}…`;
}

/**
 * Titre d'une annonce de garde, sans le suffixe " | Guardiens".
 *  - forme cible : « {titre} à {ville} »
 *  - la ville n'est pas répétée si le titre la contient déjà
 *  - seule la partie {titre} est raccourcie, jamais la ville
 */
export function buildSitTitle(title: string | null | undefined, city: string | null | undefined): string {
  const base = tidyTitle(title) || "Garde de maison et animaux";
  const place = formatCityName(city);
  if (!place) return truncateAtWord(base, TITLE_BODY_MAX);
  if (mentionsCity(base, place)) {
    // La ville est dans le titre : on le garde tel quel tant que la ville survit à la coupe.
    const whole = truncateAtWord(base, TITLE_BODY_MAX);
    if (mentionsCity(whole, place)) return whole;
    // Sinon la coupe a mangé la ville : on la remet en fin de titre.
  }
  const tail = ` à ${place}`;
  const room = Math.max(MIN_TITLE_CHARS, TITLE_BODY_MAX - tail.length);
  return `${truncateAtWord(base, room)}${tail}`;
}

const VOWEL_START = /^[aeiouyàâäéèêëîïôöùûüœæ]/i;
/** Noms de race commençant par un h muet. Tout autre h est traité comme aspiré (Husky : « de Husky »). */
const MUTE_H_PREFIXES = ["hispano", "hawaï", "hawai"];

/** « de » devant consonne ou h aspiré, « d' » devant voyelle ou h muet. */
export function elideDe(word: string): string {
  const w = collapseSpaces(word);
  if (!w) return "de";
  const lower = w.toLowerCase();
  const muteH = lower.startsWith("h") && MUTE_H_PREFIXES.some((p) => lower.startsWith(p));
  return VOWEL_START.test(w) || muteH ? `d'${w}` : `de ${w}`;
}

/**
 * Titre d'une fiche de race, suffixe « | Guardiens » compris (lot SEO-META2).
 * Gabarit complet quand il tient en 60 caractères, sinon on retire
 * « : conseils gardien », puis « à domicile ». Le nom de la race n'est jamais coupé.
 */
export function buildBreedTitle(breedName: string): string {
  const head = `Garde ${elideDe(breedName)}`;
  const candidates = [
    `${head} à domicile : conseils gardien${TITLE_SUFFIX}`,
    `${head} à domicile${TITLE_SUFFIX}`,
  ];
  return candidates.find((c) => c.length <= TITLE_MAX) ?? `${head}${TITLE_SUFFIX}`;
}

/**
 * Titre d'une fiche d'entraide (besoin ou projet), sans le suffixe « | Guardiens »
 * (lot SEO-META2). Forme complète « {titre} · Coup de main à {ville} » quand elle
 * tient, sinon la forme des annonces « {titre} à {ville} », où seul le titre est coupé.
 */
export function buildMissionTitle(
  title: string | null | undefined,
  city: string | null | undefined,
  opts: { label?: string; separator?: string } = {},
): string {
  const label = opts.label ?? "Coup de main";
  const separator = opts.separator ?? " · ";
  const base = tidyTitle(title);
  const place = formatCityName(city) || "France";
  if (!base) return `${label} à ${place}`;
  const full = `${base}${separator}${label} à ${place}`;
  if (full.length <= TITLE_BODY_MAX) return full;
  return buildSitTitle(base, place);
}
