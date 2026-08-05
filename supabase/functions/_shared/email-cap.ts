// Pure helpers for email frequency cap & quiet hours.
// Extracted from send-transactional-email so the behaviour can be unit-tested.
//
// DOCTRINE (02/08/2026)
// ---------------------
// Un email declenche par l'action directe d'un autre membre identifie (nouveau
// message, nouvelle candidature, reponse) n'est jamais du spam et ne doit jamais
// etre plafonne. Le plafond de frequence protege l'utilisateur du marketing, pas
// de ses interlocuteurs.
//
// Regles effectives :
//   - transactional          : AUCUN plafond de frequence. Seules les heures
//                              calmes s'appliquent, on ne reveille personne la nuit.
//   - product/digest/alert   : 1 / 24h et 3 / 7 jours, cumul toutes categories
//                              non transactionnelles confondues. Aucun plafond
//                              global supplementaire.
//   - categorie absente ou inconnue : traitee comme 'product', donc plafonnee.
//     Seule la valeur explicite 'transactional' donne droit a l'exemption.
//
// Correctif du Lot 6 (26/07/2026), dont le comportement decrit ici est caduc :
// ce lot appliquait 1 / heure et 3 / 24h aux emails transactionnels, sur des
// compteurs non filtres par categorie. Un digest consommait donc le quota d'un
// message humain, et 44% des tentatives d'envoi du 31/07 ont ete differees,
// certaines notifications jusqu'a 48h.

// Conservees pour compatibilite d'import uniquement : ces deux plafonds
// globaux, toutes categories confondues, NE SONT PLUS APPLIQUES par
// `decideDeferral`. Ils croisaient les compteurs entre categories et bloquaient
// des emails declenches par une action humaine. Ne pas les reintroduire dans la
// logique de decision.
export const CAP_PER_HOUR = 1
export const CAP_PER_DAY = 3
export const CAP_NON_TX_PER_DAY = 1
export const CAP_NON_TX_PER_WEEK = 3
export const QUIET_START_HOUR = 22 // inclusive (Europe/Paris)
export const QUIET_END_HOUR = 8 //   exclusive (Europe/Paris)

// Templates that BYPASS cap + quiet hours.
export const BYPASS_TEMPLATES = new Set<string>([
  'identity-verified',
  'identity-rejected',
  'relance-piece-identite',
  'dispute-resolved',
  'report-resolved',
  'cancellation-by-owner',
  'cancellation-by-sitter',
  'cancellation-review-published',
  'cancellation-response-published',
  'sit-confirmed',
  // Pendant strict de 'sit-confirmed' : l'un annonce la garde confirmee au
  // proprietaire, l'autre au gardien accepte. Un gardien accepte doit etre
  // prevenu immediatement, jamais differe.
  'application-accepted',
  'contact-reply',
])

// ---------------------------------------------------------------------------
// ETAPE 2 (05/08/2026) : derogation totale de file pour les deux gabarits
// declenches par l'action directe d'un membre identifie.
//
// Ni plafond de categorie, ni file de report. La seule garde qui subsiste est
// celle des heures calmes, qui repousse au prochain 08h00 Paris sans jamais
// pouvoir annuler (voir resolveDeferral, ou l'exemption est evaluee AVANT tout
// calcul de TTL, donc `decideOverTtl` est inatteignable pour ces gabarits).
export const NO_QUEUE_TEMPLATES = new Set<string>([
  'new-message',
  'new-application',
])

// Plafond propre a la categorie 'alert'.
//
// Justification du chiffre : ces envois sont demandes par la personne
// elle-meme (zones d'alerte, recap gardien quotidien) et sont par construction
// au plus un par jour et par source. Le plafond journalier de 1 est donc la
// cadence nominale, il ne coupe rien de legitime. Le plafond hebdomadaire de 7
// est exactement 7 x 1 : il laisse passer un envoi chaque jour de la semaine,
// et ne bloque que les rafales anormales (deux sources qui tirent le meme
// jour, boucle de relance). Sous l'ancien regime, ces gabarits partageaient le
// quota 3 / 7 jours des emails produit, ce qui condamnait 4 jours sur 7 alors
// meme que la personne avait explicitement demande a les recevoir.
export const CAP_ALERT_PER_DAY = 1
export const CAP_ALERT_PER_WEEK = 7

// ---------------------------------------------------------------------------
// ETAPE 1 (05/08/2026) : TTL de report par gabarit et par motif.
//
// Constat : la file de report appliquait une TTL fixe de 36 h, alors qu'un
// plafond hebdomadaire reprogramme a J+7. Les deux constantes se contredisent,
// l'abandon etait arithmetique et silencieux.
//
// Regle : la TTL est desormais portee par le gabarit, module par le motif de
// report. Et surtout, on n'enfile plus jamais un report qui depasse deja la
// TTL : on tranche immediatement entre envoyer et annuler.
// ---------------------------------------------------------------------------

/** TTL par defaut, en heures, pour un report en file. */
export const DEFAULT_DEFERRED_TTL_HOURS = 36

/**
 * TTL specifique par gabarit, en heures. Un gabarit date (recap du jour,
 * alerte annonce) perd sa valeur en quelques heures, il ne sert a rien de le
 * garder trois jours en file. A l'inverse, une notification declenchee par un
 * membre garde sa valeur plus longtemps.
 */
export const TEMPLATE_TTL_HOURS: Record<string, number> = {
  // Contenu date : perime le lendemain.
  'sitter-daily-digest': 20,
  'nearby-daily-digest': 20,
  'mission-daily-digest': 20,
  'alert-digest': 20,
  'nearby-sit-alert': 20,
  // Declenche par un membre identifie : garde sa valeur, on laisse du mou.
  'new-message': 48,
  'new-application': 48,
  'mission-response': 48,
  'question-answer-received': 48,
}

/**
 * Les heures calmes ne peuvent jamais repousser de plus de 10 h. Une TTL de
 * 12 h suffit pour ce motif, quel que soit le gabarit ; au dela, c'est qu'autre
 * chose bloque.
 */
export const QUIET_HOURS_TTL_HOURS = 12

export function getDeferralTtlHours(
  templateName: string,
  reason?: string,
): number {
  const base = TEMPLATE_TTL_HOURS[templateName] ?? DEFAULT_DEFERRED_TTL_HOURS
  if (reason === 'quiet_hours') return Math.min(base, QUIET_HOURS_TTL_HOURS)
  return base
}

export type OverTtlAction = 'send_now' | 'cancel'

/**
 * Que faire quand le report calcule depasse deja la TTL du gabarit ?
 *
 * - Contenu date (digest, alerte annonce) : `cancel`. L'envoyer en retard, c'est
 *   envoyer une information fausse.
 * - Tout le reste : `send_now`. Le plafond de frequence protege des relances
 *   marketing, il n'a pas vocation a detruire un email legitime. Mieux vaut un
 *   email de trop qu'une notification jamais delivree.
 *
 * Les heures calmes ne declenchent jamais ce cas (report < 10 h), mais si cela
 * arrivait, on annule plutot que de reveiller quelqu'un.
 */
export const DATED_TEMPLATES = new Set<string>([
  'sitter-daily-digest',
  'nearby-daily-digest',
  'mission-daily-digest',
  'mutual-aid-weekly-digest',
  'alert-digest',
  'nearby-sit-alert',
  'analysis-requests-digest',
])

export function decideOverTtl(input: {
  templateName: string
  reason?: string
}): OverTtlAction {
  if (input.reason === 'quiet_hours') return 'cancel'
  if (DATED_TEMPLATES.has(input.templateName)) return 'cancel'
  return 'send_now'
}

/**
 * Decision complete d'enfilement : etant donne un report calcule et la date de
 * premiere mise en file, dit s'il faut enfiler, envoyer tout de suite, ou
 * annuler. Aucun report depassant la TTL ne doit plus etre enfile.
 */
export function resolveDeferral(input: {
  templateName: string
  reason: string
  scheduledFor: Date
  firstEnqueuedAt: Date
}): { action: 'enqueue' } | { action: OverTtlAction; ttlDeadline: Date } {
  const ttlHours = getDeferralTtlHours(input.templateName, input.reason)
  const ttlDeadline = new Date(input.firstEnqueuedAt.getTime() + ttlHours * 3600_000)
  if (input.scheduledFor.getTime() <= ttlDeadline.getTime()) {
    return { action: 'enqueue' }
  }
  return {
    action: decideOverTtl({ templateName: input.templateName, reason: input.reason }),
    ttlDeadline,
  }
}

export function getParisParts(d: Date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Paris',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
  }).formatToParts(d)
  const get = (t: string) => parts.find((p) => p.type === t)!.value
  return {
    year: parseInt(get('year'), 10),
    month: parseInt(get('month'), 10),
    day: parseInt(get('day'), 10),
    hour: parseInt(get('hour'), 10),
    minute: parseInt(get('minute'), 10),
  }
}

export function isQuietAt(d: Date = new Date()): boolean {
  const { hour } = getParisParts(d)
  return hour >= QUIET_START_HOUR || hour < QUIET_END_HOUR
}

// Returns the next Date (UTC) at which Europe/Paris reaches QUIET_END_HOUR (08:00).
export function nextQuietEndFrom(now: Date = new Date()): Date {
  const p = getParisParts(now)
  let targetY = p.year, targetM = p.month, targetD = p.day
  if (p.hour >= QUIET_END_HOUR) {
    const tmp = new Date(Date.UTC(p.year, p.month - 1, p.day) + 24 * 3600_000)
    targetY = tmp.getUTCFullYear()
    targetM = tmp.getUTCMonth() + 1
    targetD = tmp.getUTCDate()
  }
  for (const offsetH of [1, 2]) {
    const candidate = new Date(Date.UTC(targetY, targetM - 1, targetD, QUIET_END_HOUR - offsetH, 0, 0))
    const cp = getParisParts(candidate)
    if (cp.year === targetY && cp.month === targetM && cp.day === targetD && cp.hour === QUIET_END_HOUR && cp.minute === 0) {
      return candidate
    }
  }
  return new Date(now.getTime() + 3600_000)
}

export type DeferDecision =
  | { action: 'send' }
  | {
      action: 'defer'
      reason:
        | 'quiet_hours'
        | 'frequency_cap_day'
        | 'frequency_cap_hour'
        | 'frequency_cap_category_day'
        | 'frequency_cap_category_week'
      scheduledFor: Date
    }

export interface DeferInput {
  now: Date
  templateName: string
  isUrgent?: boolean
  /**
   * Categorie de l'email. Seule la valeur explicite 'transactional' exempte de
   * plafond. Absente ou inconnue = traitee comme 'product', donc plafonnee.
   */
  category?: 'transactional' | 'product' | 'digest' | 'alert'
  /** ISO timestamps of `sent` emails to this recipient in the last hour, ascending. */
  hourSentAt: string[]
  /** ISO timestamps of `sent` emails to this recipient in the last 24h, ascending. */
  daySentAt: string[]
  /** ISO timestamps of `sent` NON transactional emails in the last 24h, ascending. */
  nonTxDaySentAt?: string[]
  /** ISO timestamps of `sent` NON transactional emails in the last 7 days, ascending. */
  nonTxWeekSentAt?: string[]
}

/**
 * Pure decision: should this email be sent now, or deferred?
 * Order of precedence:
 *  1. Bypass templates / urgent -> send.
 *  2. Quiet hours (22:00-08:00 Europe/Paris) -> defer to next 08:00 Paris.
 *  3. Categorie transactionnelle -> send, sans aucun plafond de frequence.
 *  4. Categorie non transactionnelle : 3 / 7 jours puis 1 / 24h.
 *  5. Otherwise -> send.
 */
export function decideDeferral(input: DeferInput): DeferDecision {
  const {
    now, templateName, isUrgent, category,
    nonTxDaySentAt = [], nonTxWeekSentAt = [],
  } = input

  // Categorie effective. Regle de securite : seule la valeur explicite
  // 'transactional' donne droit a l'exemption de plafond. Toute categorie
  // absente ou inconnue retombe sur 'product', donc plafonnee.
  const KNOWN = ['transactional', 'product', 'digest', 'alert'] as const
  const effectiveCategory: 'transactional' | 'product' | 'digest' | 'alert' =
    (KNOWN as readonly string[]).includes(category as string)
      ? (category as 'transactional' | 'product' | 'digest' | 'alert')
      : 'product'
  if (!(KNOWN as readonly string[]).includes(category as string)) {
    console.warn(
      `[email-cap] Template "${templateName}" sans categorie connue (recu: ${String(category)}). ` +
      `Traite comme 'product' et donc plafonne. Categoriser ce template.`,
    )
  }

  if (BYPASS_TEMPLATES.has(templateName) || isUrgent) {
    return { action: 'send' }
  }

  // Heures calmes : elles s'appliquent a toutes les categories, y compris
  // transactionnelle. Volontaire, on ne reveille personne la nuit.
  if (isQuietAt(now)) {
    return { action: 'defer', reason: 'quiet_hours', scheduledFor: nextQuietEndFrom(now) }
  }

  if (effectiveCategory === 'transactional') {
    return { action: 'send' }
  }

  if (nonTxWeekSentAt.length >= CAP_NON_TX_PER_WEEK) {
    const oldest = new Date(nonTxWeekSentAt[0])
    return {
      action: 'defer',
      reason: 'frequency_cap_category_week',
      scheduledFor: new Date(oldest.getTime() + 7 * 86400_000 + 30_000),
    }
  }

  if (nonTxDaySentAt.length >= CAP_NON_TX_PER_DAY) {
    const oldest = new Date(nonTxDaySentAt[0])
    return {
      action: 'defer',
      reason: 'frequency_cap_category_day',
      scheduledFor: new Date(oldest.getTime() + 86400_000 + 30_000),
    }
  }

  return { action: 'send' }
}
