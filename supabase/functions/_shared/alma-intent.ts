// Lot J1 : intention « je cherche de l'aide », frustration et départ dans
// les messages adressés à Alma. Module pur, partagé par alma-chat (réponse)
// et par le détecteur du signal admin alma_frustration.

/** Minuscules, sans accents, apostrophes typographiques ramenées. */
export function normalizeAlmaText(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[\u2019\u2018]/g, "'")
    .toLowerCase();
}

export const HELP_PATTERNS: RegExp[] = [
  /je cherche (de l'|de l |)aide/,
  /cherche (au contraire )?(de l'|de l |)aide/,
  /besoin (de quelqu'un|d'aide|d'un coup de main|d'une aide)/,
  /je ne (pose|postule|candidate)/,
  /ne pose pas ma candidature/,
  /je ne suis pas (gardien|gardienne|pet.?sitter)/,
  /(garder|faire garder|soigner|nourrir|s'occuper de) (mes|mon|ma|nos) /,
  /quelqu'un pour (garder|soigner|nourrir|s'occuper)/,
  /qui (garde|gardera|pourrait garder|peut garder)/,
]

/** Équidés, troupeaux, animaux de ferme : besoins légitimes. */
export const LARGE_ANIMAL_PATTERN =
  /\b(chevaux|cheval|poneys?|anes?|mules?|equides?|juments?|troupeaux?|moutons?|brebis|chevres?|vaches?|cochons?|poules?|volailles?|alpagas?|lamas?)\b/

export const FRUSTRATION_PATTERNS: RegExp[] = [
  /\berreur\b/,
  /\binadapte/,
  /n'importe quoi/,
  /je ne comprends (pas|rien)/,
  /je comprends (pas|rien)/,
  /(ca|cela) ne marche pas/,
  /(ca|cela) marche pas/,
  /en rester la/,
  /je laisse tomber/,
  /\bras le bol\b/,
  /\bnul\b/,
]

export const LEAVING_PATTERNS: RegExp[] = [
  /en rester la/,
  /\btant pis\b/,
  /\bau revoir\b/,
  /je laisse tomber/,
  /\badieu\b/,
]

/** Au moins 6 lettres et plus de 70 % en majuscules. */
export function isShouting(raw: string): boolean {
  const letters = raw.replace(/[^A-Za-zÀ-ÖØ-öø-ÿ]/g, "");
  if (letters.length < 6) return false;
  const upper = letters.replace(/[^A-ZÀ-ÖØ-Þ]/g, "").length;
  return upper / letters.length > 0.7;
}

export interface AlmaIntent {
  helpSeeking: boolean
  frustration: boolean
  leaving: boolean
  largeAnimals: boolean
  /** Motifs reconnus, pour le journal admin. */
  matched: string[]
}

export function detectFrustration(raw: string): string[] {
  const t = normalizeAlmaText(raw)
  const out: string[] = []
  if (/!{3,}/.test(raw)) out.push("!!!")
  if (/\?{2,}/.test(raw)) out.push("??")
  if (isShouting(raw)) out.push("majuscules")
  for (const p of FRUSTRATION_PATTERNS) if (p.test(t)) out.push(p.source)
  for (const p of LEAVING_PATTERNS) if (p.test(t) && !out.includes(p.source)) out.push(p.source)
  return out
}

/**
 * Intention du message courant. L'aide recherchée se lit aussi dans les
 * messages précédents de la personne (elle l'a dit une fois, cela reste vrai).
 */
export function detectAlmaIntent(message: string, previousUserMessages: string[] = []): AlmaIntent {
  const t = normalizeAlmaText(message)
  const past = previousUserMessages.map(normalizeAlmaText)
  const helpNow = HELP_PATTERNS.some((p) => p.test(t))
  const helpBefore = past.some((m) => HELP_PATTERNS.some((p) => p.test(m)))
  const largeAnimals = LARGE_ANIMAL_PATTERN.test(t) || past.some((m) => LARGE_ANIMAL_PATTERN.test(m))
  const frustrationMatches = detectFrustration(message)
  const leaving = LEAVING_PATTERNS.some((p) => p.test(t))
  return {
    helpSeeking: helpNow || helpBefore || (largeAnimals && /\bj'ai\b/.test(t)),
    frustration: frustrationMatches.length > 0,
    leaving,
    largeAnimals,
    matched: frustrationMatches,
  }
}

export const HELP_PATHS = {
  entraide: "/petites-missions/creer",
  garde: "/sits/create",
  contact: "/contact",
} as const

/**
 * Réponse fixe, sans modèle, en cas de frustration ou de départ : aucune
 * blague, aucune anecdote, aucun fait culturel. Excuse, chemin, humains.
 */
export function almaDirectAnswer(intent: AlmaIntent): string | null {
  if (!intent.frustration && !intent.leaving) return null
  const humans = `Jérémie et Elisa vous répondent directement sur ${HELP_PATHS.contact}.`
  if (intent.helpSeeking) {
    const animals = intent.largeAnimals ? " Chevaux, poneys et animaux de ferme y ont toute leur place." : ""
    return `Pardon pour ce détour, vous êtes ici pour trouver de l'aide. Publiez votre demande : un coup de main sur ${HELP_PATHS.entraide}, ou une garde sur ${HELP_PATHS.garde}.${animals} ${humans}`
  }
  if (intent.frustration) {
    return `Pardon pour ce détour. Dites-moi en une phrase ce que vous cherchez et je vous donne le chemin direct. ${humans}`
  }
  return `Merci d'être passé. ${humans}`
}

/** Consigne système quand la personne cherche de l'aide, sans frustration. */
export function almaHelpDirective(intent: AlmaIntent): string | null {
  if (!intent.helpSeeking) return null
  const animals = intent.largeAnimals
    ? " Chevaux, poneys, troupeaux et animaux de ferme sont des besoins légitimes, en entraide comme en garde."
    : ""
  return `La personne cherche de l'aide, elle ne veut pas postuler comme gardien. Réponds en une ou deux phrases : oriente vers la publication avec les deux portes du site, une demande d'entraide sur ${HELP_PATHS.entraide} et une garde sur ${HELP_PATHS.garde}.${animals} Ne parle ni de score, ni de points de profil, ni de complétion. Aucune blague, aucune anecdote.`
}
