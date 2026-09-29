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

// Lot J2-B : motifs resserrés. « erreur » ou « nul » dans une phrase neutre
// (« j'ai fait une erreur dans mes dates ») ne valent plus frustration, et
// « je ne comprends pas comment… » est une question, pas une colère.
export const FRUSTRATION_PATTERNS: RegExp[] = [
  /\b(c'est|quelle|encore une|grosse) erreur\b/,
  /\berreur\s*!/,
  /\binadapte/,
  /n'importe quoi/,
  /je (ne )?comprends (pas|rien)(?! (comment|pourquoi|ou|quand|quoi|si|ce qu))/,
  /(ca|cela) (ne )?marche (pas|jamais)/,
  /en rester la/,
  /je laisse tomber/,
  /\bras le bol\b/,
  /\b(c'est|trop|site|appli|vraiment) nul\b/,
  /j'en ai marre/,
]

// Départ réel (churn) : quitter le site, supprimer son compte, abandonner.
export const LEAVING_PATTERNS: RegExp[] = [
  /en rester la/,
  /je laisse tomber/,
  /\badieu\b/,
]

export const CHURN_PATTERNS: RegExp[] = [
  /supprim\w* (mon |le |un |de )?compte/,
  /(me )?desinscri(re|ption|vez)/,
  /fermer (mon|le) compte/,
  /quitter (le site|guardiens|la plateforme)/,
  /en rester la/,
  /je laisse tomber/,
  /\badieu\b/,
]

export const BUG_PATTERNS: RegExp[] = [
  /rien ne s'ouvre/,
  /ne s'(ouvre|affiche|enregistre|charge) (pas|plus)/,
  /(ne )?(fonctionne|marche) (pas|plus)/,
  /\bbug\w*/,
  /page blanche/,
  /je n'arrive pas a (ajouter|envoyer|publier|enregistrer|me connecter|valider|telecharger|mettre)/,
  /impossible d(e |')(ajouter|envoyer|publier|enregistrer|me connecter|valider)/,
  /je ne (le |la |les )?vois pas (apparaitre|dans)/,
  /(message|photo|annonce)s? (n'apparait|n'apparaissent) pas/,
]

/** « au revoir », « tant pis », « merci » seuls : départ poli, sans excuse ni signal. */
export function isPoliteGoodbye(raw: string): boolean {
  const t = normalizeAlmaText(raw).replace(/[.!,;\s]+/g, " ").trim()
  return /^(bon |ok |bah |alors )?(au revoir|tant pis|bonne (journee|soiree)|a bientot|merci( beaucoup| bien)?)( alma)?( merci| au revoir| bonne (journee|soiree))?$/.test(t)
}

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
  /** Lot J2-B : niveau 0 à 3 selon les motifs (filet de sécurité). */
  frustrationLevel: number
  bugSuspected: boolean
  churn: boolean
  politeGoodbye: boolean
  /** Une vraie question se lit dans le message : on y répond d'abord. */
  hasQuestion: boolean
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

/** Une question identifiable : point d'interrogation ou tournure interrogative. */
export function hasIdentifiableQuestion(raw: string): boolean {
  const t = normalizeAlmaText(raw)
  if (/\?/.test(raw)) return true
  return /\b(comment|pourquoi|ou|quand|quel|quelle|quels|est-ce|combien|que faut|je n'arrive pas|je ne trouve pas|je cherche|je voudrais|j'aimerais)\b/.test(t)
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
  const politeGoodbye = isPoliteGoodbye(message)
  return {
    helpSeeking: helpNow || helpBefore || (largeAnimals && /\bj'ai\b/.test(t)),
    frustration: frustrationMatches.length > 0,
    leaving,
    largeAnimals,
    matched: frustrationMatches,
    frustrationLevel: Math.min(3, frustrationMatches.length),
    bugSuspected: BUG_PATTERNS.some((p) => p.test(t)),
    churn: CHURN_PATTERNS.some((p) => p.test(t)),
    politeGoodbye,
    hasQuestion: hasIdentifiableQuestion(message),
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
  if (intent.politeGoodbye && !intent.frustration) return ALMA_GOODBYE_ANSWER
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

/** Lot J2-B : clôture chaleureuse d'un départ poli, sans excuse. */
export const ALMA_GOODBYE_ANSWER = "Avec plaisir. Je reste ici, dans le coin de l'écran, dès que vous en avez besoin."

/**
 * Lot J2-B : la réponse fixe ne sert plus qu'en secours. Départ poli seul,
 * ou frustration maximale sans aucune question à laquelle répondre.
 */
export function shouldAnswerDirectly(intent: AlmaIntent): boolean {
  if (intent.politeGoodbye && !intent.frustration) return true
  return intent.frustrationLevel >= 3 && !intent.hasQuestion
}

/** Consigne système quand la personne cherche de l'aide, sans frustration. */
export function almaHelpDirective(intent: AlmaIntent): string | null {
  if (!intent.helpSeeking) return null
  const animals = intent.largeAnimals
    ? " Chevaux, poneys, troupeaux et animaux de ferme sont des besoins légitimes, en entraide comme en garde."
    : ""
  return `La personne cherche de l'aide, elle ne veut pas postuler comme gardien. Réponds en une ou deux phrases : oriente vers la publication avec les deux portes du site, une demande d'entraide sur ${HELP_PATHS.entraide} et une garde sur ${HELP_PATHS.garde}.${animals} Ne parle ni de score, ni de points de profil, ni de complétion. Aucune blague, aucune anecdote.`
}
