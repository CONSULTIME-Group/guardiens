// Lot S1 : construction pure de l'email quotidien des signaux admin.
// Critiques actionnables seulement, une ligne par annonce, tri par échéance.

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

// Manques structurels : jamais dans l'email quotidien.
export const NON_ACTIONABLE_TYPES = new Set([
  'city_coverage_gap',
  'city_seo_tension',
  'untapped_city',
])

const ACTIONS: Record<string, string> = {
  pending_application: 'Relancer le propriétaire pour qu\'il réponde aux candidatures.',
  stalled_discussion: 'Relancer la discussion entre le propriétaire et le gardien.',
  owner_sit_unconfirmed: 'Aider le propriétaire à confirmer son gardien avant le départ.',
  stale_draft: 'Proposer au propriétaire de terminer et publier son annonce.',
  no_applications: 'Diffuser l\'annonce auprès des gardiens proches.',
  nurturing_run_anomaly: 'Vérifier le dernier passage des séquences email.',
  digest_queue_stalled: 'Vérifier l\'envoi des digests gardiens.',
  digest_queue_morning_backlog: 'Vérifier l\'envoi du digest du matin.',
  email_delivery_low: 'Vérifier la délivrabilité des emails.',
  email_queue_failures: 'Vérifier la file d\'envoi des emails.',
  email_recipient_address_invalid: 'Corriger l\'adresse email du membre.',
  notification_delivery_failed: 'Vérifier l\'envoi des notifications.',
  sit_notification_claim_starvation: 'Vérifier la diffusion des annonces aux gardiens.',
  suspicious_account: 'Examiner le compte signalé.',
  content_defect_outside_freeze: 'Corriger les contenus signalés.',
  prerender_monthly_budget_reached: 'Vérifier le budget de pré-rendu.',
}

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

export const actionFor = (type: string) =>
  ACTIONS[type] ?? 'Ouvrir le signal dans l\'administration et le traiter.'

const linkFor = (type: string) => LINKS[type] ?? 'https://guardiens.fr/admin'

// Priorité d'action quand une annonce porte plusieurs signaux.
const PRIORITY = ['owner_sit_unconfirmed', 'stalled_discussion', 'pending_application', 'no_applications', 'stale_draft']

export const sitIdOf = (s: OpenSignal): string | null => {
  const m = s.metadata ?? {}
  if (typeof m.sit_id === 'string') return m.sit_id
  if (s.entity_type === 'sit' && s.entity_id) return s.entity_id
  return null
}

export function isActionableCritical(s: OpenSignal): boolean {
  return s.severity === 'critical' && !NON_ACTIONABLE_TYPES.has(s.signal_type)
}

export function buildDigestLines(
  signals: OpenSignal[],
  sits: Map<string, SitInfo>,
  now: number = Date.now(),
): DigestLine[] {
  const groups = new Map<string, OpenSignal[]>()
  for (const s of signals.filter(isActionableCritical)) {
    const sitId = sitIdOf(s)
    const key = sitId ? `sit:${sitId}` : `sig:${s.signal_type}:${s.entity_id ?? s.detected_at}`
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
    const title = (sit?.title ?? (m.sit_title as string) ?? (m.title as string) ?? main)
      .replace(/[\u2014\u2013]/g, ',')
    const count = arr.length
    let action = actionFor(main)
    if (main === 'pending_application' && count > 1) {
      action = `Relancer le propriétaire : ${count} candidatures attendent sa réponse.`
    }
    lines.push({
      key,
      title,
      action,
      startDate: sit?.start_date ?? (m.start_date as string) ?? null,
      ageDays: Math.floor((now - oldest) / 86_400_000),
      count,
      signalTypes: types,
      link: linkFor(main),
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

// Synthèse hebdomadaire des trous de couverture, le lundi seulement.
export function weeklyCoverageLine(signals: OpenSignal[], now: Date = new Date()): string | null {
  if (now.getUTCDay() !== 1) return null
  const n = signals.filter((s) => s.signal_type === 'city_coverage_gap').length
  if (n === 0) return null
  return n === 1
    ? 'Couverture : 1 ville suivie compte moins de 3 gardiens à 30 km.'
    : `Couverture : ${n} villes suivies comptent moins de 3 gardiens à 30 km.`
}
