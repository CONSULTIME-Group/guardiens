// Pure helpers for email frequency cap & quiet hours.
// Extracted from send-transactional-email so the behaviour can be unit-tested.
//
// Lot 6 (26/07/2026) : le plafond depend desormais de la CATEGORIE.
//   - transactional         : 1 / heure et 3 / 24h (inchange)
//   - product/digest/alert   : 1 / 24h et 3 / 7 jours, cumul toutes categories
//                              non transactionnelles confondues.

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
  /** Categorie de l'email. Absente = traitee comme transactionnelle (retro-compat). */
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
 *  3. Categorie non transactionnelle : 3 / 7 jours puis 1 / 24h.
 *  4. Categorie transactionnelle : 3 / 24h puis 1 / heure.
 *  5. Otherwise -> send.
 */
export function decideDeferral(input: DeferInput): DeferDecision {
  const {
    now, templateName, isUrgent, category,
    hourSentAt, daySentAt, nonTxDaySentAt = [], nonTxWeekSentAt = [],
  } = input

  if (BYPASS_TEMPLATES.has(templateName) || isUrgent) {
    return { action: 'send' }
  }

  if (isQuietAt(now)) {
    return { action: 'defer', reason: 'quiet_hours', scheduledFor: nextQuietEndFrom(now) }
  }

  const isNonTx = category === 'product' || category === 'digest' || category === 'alert'

  if (isNonTx) {
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
  }

  if (daySentAt.length >= CAP_PER_DAY) {
    const oldest = new Date(daySentAt[0])
    return {
      action: 'defer',
      reason: 'frequency_cap_day',
      scheduledFor: new Date(oldest.getTime() + 86400_000 + 30_000),
    }
  }

  if (hourSentAt.length >= CAP_PER_HOUR) {
    const oldest = new Date(hourSentAt[0])
    return {
      action: 'defer',
      reason: 'frequency_cap_hour',
      scheduledFor: new Date(oldest.getTime() + 3600_000 + 30_000),
    }
  }

  return { action: 'send' }
}
