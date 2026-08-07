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
// Regles effectives (mises a jour le 07/08/2026) :
//   - transactional          : AUCUN plafond de frequence, et depuis le
//                              07/08/2026 AUCUNE heure calme. Un message
//                              humain part immediatement, y compris la nuit.
//                              Les gabarits de NO_QUEUE_TEMPLATES suivent la
//                              meme regle.
//   - heures calmes           : appliquees uniquement a 'product', 'digest' et
//                              'alert'.
//   - alert                  : compteurs propres (voir CAP_ALERT_*).
//   - nearby-sit-alert       : compteurs propres au gabarit (voir CAP_NEARBY_SIT_*).
//   - digest                 : compteurs propres a la categorie (voir CAP_DIGEST_*).
//   - product                : 1 / 24h et 3 / 7 jours, sur les compteurs
//                              CAP_NON_TX_*, qui ne concernent plus que 'product'.
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
// Plafonds de la seule categorie 'product' depuis le 07/08/2026. Les digests,
// les alertes et 'nearby-sit-alert' ont chacun leurs compteurs propres.
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
// Ni plafond de categorie, ni file de report, ni heures calmes depuis le
// 07/08/2026 : ces gabarits partent immediatement. Constat qui a motive le
// correctif : une reponse ecrite a 22h14 n'est partie qu'a 08h02 le lendemain,
// dix heures de retard sur une reponse humaine directe.
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
// CORRECTIF (06/08/2026) : compteur propre a l'alerte de nouvelle annonce.
//
// Constat verifie en base : depuis le 03/08, plus aucun 'nearby-sit-alert'
// n'est parti, alors que des annonces ont ete publiees les 03 et 04. Le quota
// 'alert' de 1 par jour etait partage par trois gabarits, et il etait
// systematiquement consomme au petit matin par 'sitter-daily-digest' (cron 5h
// UTC) ou par 'alert-digest' (trois fois par jour). L'alerte etait ensuite
// reportee a oldest plus 24 h, au dela de sa TTL de 20 h, donc detruite.
//
// Regle : 'nearby-sit-alert' sort du quota partage et compte sur lui seul.
// Justification du chiffre : la plateforme a publie 16 annonces en 30 jours
// sur la France entiere, et un gardien n'est alerte que sur ses zones. Le
// risque de rafale est nul en pratique. Un plafond de 3 par jour et 10 par
// semaine ne coupe que les boucles anormales, il ne coupe aucun envoi
// legitime.
export const CAP_NEARBY_SIT_PER_DAY = 3
export const CAP_NEARBY_SIT_PER_WEEK = 10

/**
 * Gabarits d'alerte de nouvelle annonce, comptes sur leur propre quota. Ils ne
 * consomment plus le quota de la categorie 'alert', et reciproquement les
 * recapitulatifs ne consomment plus le leur : une alerte declenchee par un
 * evenement reel prime toujours sur un recapitulatif automatique.
 */
export const NEARBY_SIT_ALERT_TEMPLATES = new Set<string>(['nearby-sit-alert'])

/**
 * Report maximal, en heures, pour une alerte de nouvelle annonce. Strictement
 * inferieur a sa TTL (20 h) avec la marge du jitter appelant (15 min max),
 * afin qu'aucun chemin de plafond ne puisse produire un report deja perime,
 * ce qui ramenerait l'annulation silencieuse par une autre porte.
 */
export const NEARBY_SIT_MAX_DEFER_HOURS = 18

// ---------------------------------------------------------------------------
// CORRECTIF (07/08/2026) : compteur propre a la categorie 'digest'.
//
// Constat verifie en base : environ 190 emails detruits entre le 02 et le
// 06/08. Les digests tiraient sur le quota 'product' de 1 par jour et 3 par
// semaine, partage par plus de vingt gabarits. Or quatre gabarits sont en
// categorie 'digest' ('sitter-daily-digest', 'nearby-daily-digest',
// 'mission-daily-digest', 'mutual-aid-weekly-digest'), dont trois quotidiens :
// un digest quotidien demande 7 envois par semaine contre un plafond de 3,
// c'est arithmetiquement impossible.
//
// Regle : la categorie 'digest' sort du cumul 'product' et compte sur elle
// seule. Justification du chiffre, meme raisonnement que pour
// CAP_NEARBY_SIT_PER_DAY : trois digests quotidiens au plus, donc un plafond de
// 2 par jour et 10 par semaine ne coupe aucun envoi legitime, il ne coupe que
// les boucles anormales.
export const CAP_DIGEST_PER_DAY = 2
export const CAP_DIGEST_PER_WEEK = 10

/**
 * Report maximal, en heures, pour un email de categorie 'digest'. Les digests
 * ont une TTL de 20 h et figurent dans DATED_TEMPLATES : un report au dela de
 * la TTL les detruit. Le plafond de 18 h, avec la marge du jitter appelant,
 * garantit qu'aucun chemin de plafond ne produit un report deja perime.
 */
export const DIGEST_MAX_DEFER_HOURS = 18




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
  // ETAPE 2 : garde placee AVANT tout calcul de TTL. Un gabarit en derogation
  // ne peut donc jamais atteindre `decideOverTtl`, quel que soit le motif, et
  // ne peut jamais etre annule. Il est simplement enfile et reparti.
  if (NO_QUEUE_TEMPLATES.has(input.templateName)) {
    return { action: 'enqueue' }
  }
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
  /**
   * ISO timestamps of `sent` emails de categorie 'alert' sur 24h, ascendant,
   * HORS alertes de nouvelle annonce (celles-ci ont leur propre compteur).
   */
  alertDaySentAt?: string[]
  /** Idem sur 7 jours, hors alertes de nouvelle annonce. */
  alertWeekSentAt?: string[]
  /** ISO timestamps of `sent` 'nearby-sit-alert' sur 24h, ascendant. */
  nearbySitDaySentAt?: string[]
  /** ISO timestamps of `sent` 'nearby-sit-alert' sur 7 jours, ascendant. */
  nearbySitWeekSentAt?: string[]
  /** ISO timestamps of `sent` emails de categorie 'digest' sur 24h, ascendant. */
  digestDaySentAt?: string[]
  /** Idem sur 7 jours. */
  digestWeekSentAt?: string[]

}


/**
 * Pure decision: should this email be sent now, or deferred?
 * Order of precedence:
 *  1. Bypass templates / urgent -> send.
 *  2. NO_QUEUE_TEMPLATES -> send, sans plafond ni heures calmes.
 *  3. Categorie transactionnelle -> send, sans plafond ni heures calmes.
 *  4. Heures calmes (22:00-08:00 Europe/Paris), pour 'product', 'digest' et
 *     'alert' seulement -> report au prochain 08:00 Paris.
 *  5. Compteurs propres par categorie ou par gabarit.
 *  6. Otherwise -> send.
 */
export function decideDeferral(input: DeferInput): DeferDecision {
  const {
    now, templateName, isUrgent, category,
    nonTxDaySentAt = [], nonTxWeekSentAt = [],
    alertDaySentAt = [], alertWeekSentAt = [],
    nearbySitDaySentAt = [], nearbySitWeekSentAt = [],
    digestDaySentAt = [], digestWeekSentAt = [],

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

  // ETAPE 2 : derogation totale. Aucun plafond, aucune file, et depuis le
  // 07/08/2026 aucune heure calme : un email declenche par l'action directe
  // d'un autre membre identifie part immediatement, de jour comme de nuit.
  if (NO_QUEUE_TEMPLATES.has(templateName)) {
    return { action: 'send' }
  }

  // Categorie transactionnelle : envoi immediat, sans plafond et sans heures
  // calmes. Une notification email ne reveille personne, ce qui sonne la nuit
  // releve des reglages du telephone, qui appartiennent a l'utilisateur.
  if (effectiveCategory === 'transactional') {
    return { action: 'send' }
  }

  // Heures calmes : desormais reservees a 'product', 'digest' et 'alert'.
  // Personne n'attend un conseil de publication a trois heures du matin, et
  // l'envoi du matin performe mieux sur ces categories.
  if (isQuietAt(now)) {
    return { action: 'defer', reason: 'quiet_hours', scheduledFor: nextQuietEndFrom(now) }
  }

  // Alerte de nouvelle annonce : compteur strictement propre au gabarit. Elle
  // ne consomme pas le quota des recapitulatifs, et les recapitulatifs ne
  // consomment pas le sien. Une alerte declenchee par un evenement reel prime
  // donc toujours sur un recapitulatif automatique du matin.
  if (NEARBY_SIT_ALERT_TEMPLATES.has(templateName)) {
    // Plafond de report, garant de la coherence avec la TTL du gabarit.
    const clamp = (d: Date) => {
      const ceiling = new Date(now.getTime() + NEARBY_SIT_MAX_DEFER_HOURS * 3600_000)
      return d.getTime() > ceiling.getTime() ? ceiling : d
    }
    if (nearbySitWeekSentAt.length >= CAP_NEARBY_SIT_PER_WEEK) {
      const oldest = new Date(nearbySitWeekSentAt[0])
      return {
        action: 'defer',
        reason: 'frequency_cap_category_week',
        scheduledFor: clamp(new Date(oldest.getTime() + 7 * 86400_000 + 30_000)),
      }
    }
    if (nearbySitDaySentAt.length >= CAP_NEARBY_SIT_PER_DAY) {
      const oldest = new Date(nearbySitDaySentAt[0])
      return {
        action: 'defer',
        reason: 'frequency_cap_category_day',
        scheduledFor: clamp(new Date(oldest.getTime() + 86400_000 + 30_000)),
      }
    }
    return { action: 'send' }
  }

  // Categorie 'digest' : compteurs strictement propres. Elle ne consomme plus
  // le quota 'product', et reciproquement. Report ecrete a
  // DIGEST_MAX_DEFER_HOURS pour rester sous la TTL de 20 h du gabarit.
  if (effectiveCategory === 'digest') {
    const clampDigest = (d: Date) => {
      const ceiling = new Date(now.getTime() + DIGEST_MAX_DEFER_HOURS * 3600_000)
      return d.getTime() > ceiling.getTime() ? ceiling : d
    }
    if (digestWeekSentAt.length >= CAP_DIGEST_PER_WEEK) {
      const oldest = new Date(digestWeekSentAt[0])
      return {
        action: 'defer',
        reason: 'frequency_cap_category_week',
        scheduledFor: clampDigest(new Date(oldest.getTime() + 7 * 86400_000 + 30_000)),
      }
    }
    if (digestDaySentAt.length >= CAP_DIGEST_PER_DAY) {
      const oldest = new Date(digestDaySentAt[0])
      return {
        action: 'defer',
        reason: 'frequency_cap_category_day',
        scheduledFor: clampDigest(new Date(oldest.getTime() + 86400_000 + 30_000)),
      }
    }
    return { action: 'send' }
  }


  // Categorie 'alert' : compteurs propres, elle ne partage plus le quota des
  // emails produit. Cadence nominale 1 / jour, 7 / semaine.
  if (effectiveCategory === 'alert') {

    if (alertWeekSentAt.length >= CAP_ALERT_PER_WEEK) {
      const oldest = new Date(alertWeekSentAt[0])
      return {
        action: 'defer',
        reason: 'frequency_cap_category_week',
        scheduledFor: new Date(oldest.getTime() + 7 * 86400_000 + 30_000),
      }
    }
    if (alertDaySentAt.length >= CAP_ALERT_PER_DAY) {
      const oldest = new Date(alertDaySentAt[0])
      return {
        action: 'defer',
        reason: 'frequency_cap_category_day',
        scheduledFor: new Date(oldest.getTime() + 86400_000 + 30_000),
      }
    }
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
