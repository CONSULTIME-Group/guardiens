// Lot S1 : construction pure de l'email quotidien des signaux admin.
// Critiques actionnables seulement, une ligne par annonce, tri par échéance.
// Lot S2 : le routage (quotidien, lundi, À animer) est lu dans
// _shared/admin-signal-config.ts, seule source des destinations.
import {
  hasDestination, isSitImminent, isSitStarted, sitGroupSummary, signalAction, signalNature, SIGNAL_TYPES, SIT_ACTION_PRIORITY, SIT_TIMED_TYPES,
} from '../_shared/admin-signal-config.ts'

export interface OpenSignal {
  signal_type: string
  severity: string
  detected_at: string
  entity_type: string | null
  entity_id: string | null
  metadata: Record<string, unknown> | null
}

export interface SitInfo { id: string; title: string | null; start_date: string | null }

export interface DigestLine {
  key: string
  title: string
  action: string
  startDate: string | null
  /** null : file sans date fiable (vérifications d'identité), âge non affiché. */
  ageDays: number | null
  count: number
  signalTypes: string[]
  link: string
}

// Types jamais dans l'email quotidien, dérivés de la configuration.
export const NON_ACTIONABLE_TYPES = new Set(
  Object.entries(SIGNAL_TYPES).filter(([, c]) => !c.destinations.includes('daily_email')).map(([t]) => t),
)

// Lot ADM1 : verbes d'action lus dans la configuration unique (partagés avec l'accueil admin).

const LINKS: Record<string, string> = {
  stale_draft: 'https://guardiens.fr/admin/listings',
  no_applications: 'https://guardiens.fr/admin/listings',
  pending_application: 'https://guardiens.fr/admin/listings',
  stalled_discussion: 'https://guardiens.fr/admin/listings',
  owner_sit_unconfirmed: 'https://guardiens.fr/admin/listings',
  suspicious_account: 'https://guardiens.fr/admin/users',
  notification_delivery_failed: 'https://guardiens.fr/admin/emails',
  nurturing_run_anomaly: 'https://guardiens.fr/admin/emails',
  email_delivery_low: 'https://guardiens.fr/admin/emails',
}

export const actionFor = (type: string) => signalAction(type)

const linkFor = (type: string) => LINKS[type] ?? 'https://guardiens.fr/admin'

const PRIORITY = SIT_ACTION_PRIORITY

export const sitIdOf = (s: OpenSignal): string | null => {
  const m = s.metadata ?? {}
  if (typeof m.sit_id === 'string') return m.sit_id
  if (s.entity_type === 'sit' && s.entity_id) return s.entity_id
  return null
}

// Lot ADM2 : âge réel d'un signal en heures. La gravité d'une candidature est
// figée à l'insertion ; hours_since_created (au repérage) plus le temps écoulé
// depuis le repérage donne l'âge vrai de la candidature.
export const PENDING_APPLICATION_EMAIL_HOURS = 96

export function signalAgeHours(s: OpenSignal, now: number = Date.now()): number {
  const base = Number((s.metadata ?? {}).hours_since_created)
  const since = (now - new Date(s.detected_at).getTime()) / 3_600_000
  return (Number.isFinite(base) ? base : 0) + Math.max(0, since)
}

// Lot ADM2 : annonce publiée sans candidature (warning), dans l'email du matin.
// Le niveau « info » (aucun gardien éligible à proximité) reste sur l'écran.
const EMAIL_WARNING_TYPES = new Set(['no_applications'])

export function isActionableCritical(s: OpenSignal, now: number = Date.now()): boolean {
  if (!hasDestination(s.signal_type, 'daily_email')) return false
  if (s.severity === 'critical' || SIGNAL_TYPES[s.signal_type]?.dailyEmailAnySeverity === true) return true
  if (s.severity !== 'warning') return false
  if (EMAIL_WARNING_TYPES.has(s.signal_type)) return true
  return s.signal_type === 'pending_application' && signalAgeHours(s, now) >= PENDING_APPLICATION_EMAIL_HOURS
}

// Lot ADM2 : files où un membre attend une réponse humaine (admin_human_queues),
// placées en tête de l'email. Même forme que les lignes de signaux.
export interface HumanQueue { key: string; count: number; oldest: string | null }

const HUMAN_QUEUES: Record<string, { one: string; many: string; action: string; link: string }> = {
  contactMessages: { one: 'message de contact', many: 'messages de contact', action: 'Répondre depuis Messages contact : le bouton Répondre envoie l\'email et le trace.', link: 'https://guardiens.fr/admin/contact-messages' },
  reports: { one: 'signalement', many: 'signalements', action: 'Traiter le signalement : décision et message au membre.', link: 'https://guardiens.fr/admin/reports' },
  deletionRequests: { one: 'demande RGPD', many: 'demandes RGPD', action: 'Traiter la demande de suppression (délai légal d\'un mois).', link: 'https://guardiens.fr/admin/demandes-suppression' },
  reviewDisputes: { one: 'contestation d\'avis', many: 'contestations d\'avis', action: 'Trancher la contestation.', link: 'https://guardiens.fr/admin/review-disputes' },
  verifications: { one: 'vérification d\'identité', many: 'vérifications d\'identité', action: 'Valider ou refuser la pièce d\'identité.', link: 'https://guardiens.fr/admin/verifications' },
}

export function humanQueueLines(queues: HumanQueue[] | null | undefined, now: number = Date.now()): DigestLine[] {
  const out: DigestLine[] = []
  for (const q of queues ?? []) {
    const def = HUMAN_QUEUES[q?.key]
    const count = Number(q?.count ?? 0)
    if (!def || !Number.isFinite(count) || count <= 0) continue
    const oldest = q.oldest ? new Date(q.oldest).getTime() : NaN
    out.push({
      key: `queue:${q.key}`,
      title: `${count} ${count > 1 ? def.many : def.one}`,
      action: def.action,
      startDate: null,
      ageDays: Number.isFinite(oldest) ? Math.max(0, Math.floor((now - oldest) / 86_400_000)) : null,
      count,
      signalTypes: [],
      link: def.link,
    })
  }
  return out
}

// Lot ADM6 : voyants rouges de l'état du site (admin_site_health), en tête de
// l'email. Le rendu SEO est déjà porté par son signal critique : jamais deux fois.
export interface SiteHealthCheck { key: string; label: string; state: string; detail?: string | null; link?: string | null }

const SITE_HEALTH_EMAIL_SKIP = new Set(['seo'])

export function siteHealthLines(checks: SiteHealthCheck[] | null | undefined): DigestLine[] {
  const out: DigestLine[] = []
  for (const c of Array.isArray(checks) ? checks : []) {
    if (!c || typeof c.key !== 'string' || c.state !== 'alert' || SITE_HEALTH_EMAIL_SKIP.has(c.key)) continue
    const path = typeof c.link === 'string' && c.link.startsWith('/admin') ? c.link : '/admin'
    out.push({
      key: `health:${c.key}`,
      title: `État du site : ${c.label}`,
      action: (typeof c.detail === 'string' && c.detail) ? c.detail : 'À regarder depuis l\'accueil admin.',
      startDate: null,
      ageDays: null,
      count: 1,
      signalTypes: [],
      link: `https://guardiens.fr${path}`,
    })
  }
  return out
}

export function buildDigestLines(
  signals: OpenSignal[],
  sits: Map<string, SitInfo>,
  now: number = Date.now(),
): DigestLine[] {
  const groups = new Map<string, OpenSignal[]>()
  for (const s of signals.filter((x) => isActionableCritical(x, now))) {
    const sitId = sitIdOf(s)
    const group = SIGNAL_TYPES[s.signal_type]?.queueGroup
    const key = sitId
      ? `sit:${sitId}`
      : group === 'digest_queue'
        ? 'group:digest_queue'
        : `sig:${s.signal_type}:${s.entity_id ?? s.detected_at}`
    const arr = groups.get(key) ?? []
    arr.push(s)
    groups.set(key, arr)
  }

  const lines: DigestLine[] = []
  for (const [key, arr] of groups) {
    const types = [...new Set(arr.map((s) => s.signal_type))]
    const main = PRIORITY.find((t) => types.includes(t)) ?? types[0]
    const oldest = Math.min(...arr.map((s) => new Date(s.detected_at).getTime()))
    const sitId = key.startsWith('sit:') ? key.slice(4) : null
    const sit = sitId ? sits.get(sitId) : undefined
    const m = arr[0].metadata ?? {}
    // Lot ADM1 : garde commencée, plus aucune action avant le départ.
    const startDate = sit?.start_date ?? (m.start_date as string) ?? null
    if (sitId && types.every((t) => SIT_TIMED_TYPES.has(t)) && isSitStarted(startDate, now)) continue
    // Lot ADM10 : une situation que le site relance déjà seul (nature auto)
    // n'entre dans l'email qu'à 7 jours du départ ou moins, comme sur l'accueil.
    if (types.every((t) => signalNature(t) === 'auto') && !isSitImminent(startDate, now)) continue
    // Lot ADM5 : un titre vide (brouillon sans titre) ne laisse jamais une ligne muette.
    const firstText = (...v: unknown[]) => v.map((x) => (typeof x === 'string' ? x.trim() : '')).find((x) => x) ?? ''
    const title = (key === 'group:digest_queue' ? 'File des digests' : firstText(sit?.title, m.sit_title, m.title) || (sitId ? 'Annonce sans titre' : SIGNAL_TYPES[main]?.label ?? main))
      .replace(/[\u2014\u2013]/g, ',')
    const count = arr.length
    let action = actionFor(main)
    const allTypes = arr.map((x) => x.signal_type)
    if (types.includes('pending_application') && types.includes('stalled_discussion') && main !== 'owner_sit_unconfirmed') {
      action = `Relancer le propriétaire : ${sitGroupSummary(allTypes)}.`
    } else if (main.startsWith('alma_') && Array.isArray(m.messages)) {
      // Lot J1 : les messages concernés, dans l'email quotidien.
      const quotes = (m.messages as { text?: string }[]).map((x) => `« ${String(x.text ?? '').slice(0, 160)} »`).join(' ')
      action = `${actionFor(main)} Messages : ${quotes}`.replace(/[\u2014\u2013]/g, ',')
    } else if (main === 'pending_application' && count > 1) {
      action = `Relancer le propriétaire : ${count} candidatures attendent sa réponse.`
    }
    // Lot ADM2 : âge vrai de la plus ancienne candidature, en jours.
    if (types.includes('pending_application')) {
      const maxH = Math.max(...arr.filter((x) => x.signal_type === 'pending_application').map((x) => signalAgeHours(x, now)))
      const d = Math.floor(maxH / 24)
      if (d >= 1) action = `${action} La plus ancienne attend depuis ${d} jour${d > 1 ? 's' : ''}.`
    }
    lines.push({
      key,
      title,
      action,
      startDate,
      ageDays: Math.floor((now - oldest) / 86_400_000),
      count,
      signalTypes: types,
      // Lot J1 : un signal peut porter son lien exact (fiche membre).
      link: typeof m.admin_url === 'string' && m.admin_url.startsWith('https://guardiens.fr/admin') ? m.admin_url : linkFor(main),
    })
  }

  // Échéance la plus proche d'abord ; sans date, après, du plus ancien au plus récent.
  return lines.sort((a, b) => {
    if (a.startDate && b.startDate) return a.startDate.localeCompare(b.startDate)
    if (a.startDate) return -1
    if (b.startDate) return 1
    return (b.ageDays ?? 0) - (a.ageDays ?? 0)
  })
}

// Synthèse hebdomadaire des trous de couverture et tensions SEO, le lundi seulement.
export function weeklyCoverageLine(signals: OpenSignal[], now: Date = new Date()): string | null {
  if (now.getUTCDay() !== 1) return null
  const n = signals.filter((s) => s.signal_type === 'city_coverage_gap').length
  const t = signals.filter((s) => s.signal_type === 'city_seo_tension').length
  if (n === 0 && t === 0) return null
  const parts: string[] = []
  if (n) parts.push(n === 1 ? '1 ville suivie compte moins de 3 gardiens à 30 km' : `${n} villes suivies comptent moins de 3 gardiens à 30 km`)
  if (t) parts.push(t === 1 ? '1 ville en tension SEO' : `${t} villes en tension SEO`)
  return `Couverture : ${parts.join(', ')}.`
}

// Synthèse du lundi : couverture, qualité éditoriale, animation.
export function weeklySummaryLines(signals: OpenSignal[], now: Date = new Date()): string[] {
  if (now.getUTCDay() !== 1) return []
  const lines: string[] = []
  const cov = weeklyCoverageLine(signals, now)
  if (cov) lines.push(cov)
  const content = signals.filter((s) => SIGNAL_TYPES[s.signal_type]?.queueGroup === 'content').length
  if (content) lines.push(`Qualité éditoriale : ${content} signal${content > 1 ? 'aux' : ''} ouvert${content > 1 ? 's' : ''}.`)
  const dormant = signals.filter((s) => s.signal_type === 'dormant_sitter').length
  const stale = signals.filter((s) => s.signal_type === 'affinity_onboarding_stale').length
  if (dormant || stale) {
    lines.push(`À animer : ${dormant} gardien${dormant > 1 ? 's' : ''} dormant${dormant > 1 ? 's' : ''}, ${stale} onboarding${stale > 1 ? 's' : ''} affinité inachevé${stale > 1 ? 's' : ''}.`)
  }
  return lines
}

// Lot J2-B : section Alma de la synthèse du lundi.
export interface AlmaWeeklyStats {
  conversations: number
  chips: number
  with_action: number
  acted: number
  rated: number
  not_useful: number
  signals: Record<string, number>
  unanswered: string[]
}

const pct = (n: number, d: number) => (d > 0 ? `${Math.round((100 * n) / d)} %` : 'non mesuré')

export function almaWeeklyLines(stats: AlmaWeeklyStats | null, now: Date = new Date()): string[] {
  if (now.getUTCDay() !== 1 || !stats) return []
  const s = stats
  const sig = Object.entries(s.signals ?? {})
    .map(([t, n]) => `${SIGNAL_TYPES[t]?.label ?? t} ${n}`)
    .join(', ')
  const lines = [
    `Alma, 7 derniers jours : ${s.conversations} conversation${s.conversations > 1 ? 's' : ''} réelle${s.conversations > 1 ? 's' : ''}, pastilles ${pct(s.chips, s.conversations)}, action à 10 minutes ${pct(s.acted, s.with_action)}, pas utile ${pct(s.not_useful, s.rated)}.`,
    `Signaux Alma : ${sig || 'aucun'}.`,
  ]
  if (s.unanswered?.length) {
    lines.push(`Sans réponse : ${s.unanswered.slice(0, 3).map((q) => `« ${q} »`).join(' ')}`.replace(/[\u2014\u2013]/g, ','))
  }
  return lines
}
