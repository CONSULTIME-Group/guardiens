// Lot S1 : construction pure de l'email quotidien des signaux admin.
// Critiques actionnables seulement, une ligne par annonce, tri par échéance.
// Lot S2 : le routage (quotidien, lundi, À animer) est lu dans
// _shared/admin-signal-config.ts, seule source des destinations.
import {
  hasDestination, isSitStarted, sitGroupSummary, signalAction, SIGNAL_TYPES, SIT_ACTION_PRIORITY, SIT_TIMED_TYPES,
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
  ageDays: number
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

export function isActionableCritical(s: OpenSignal): boolean {
  if (!hasDestination(s.signal_type, 'daily_email')) return false
  return s.severity === 'critical' || SIGNAL_TYPES[s.signal_type]?.dailyEmailAnySeverity === true
}

export function buildDigestLines(
  signals: OpenSignal[],
  sits: Map<string, SitInfo>,
  now: number = Date.now(),
): DigestLine[] {
  const groups = new Map<string, OpenSignal[]>()
  for (const s of signals.filter(isActionableCritical)) {
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
    const title = (key === 'group:digest_queue' ? 'File des digests' : sit?.title ?? (m.sit_title as string) ?? (m.title as string) ?? main)
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
    return b.ageDays - a.ageDays
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
