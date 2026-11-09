// Lot S1 : construction pure de l'email quotidien des signaux admin.
// Lot ADM13 : les lignes viennent de la liste de travail partagée avec la vue
// d'ensemble ; ce fichier garde la mise en forme de l'email et la synthèse du lundi.
import { SIGNAL_TYPES } from '../_shared/admin-signal-config.ts'
import { unavailableSentence, type WorkListModel } from '../_shared/admin-work-list.ts'

export interface OpenSignal {
  signal_type: string
  severity: string
  detected_at: string
  entity_type: string | null
  entity_id: string | null
  metadata: Record<string, unknown> | null
}

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
  /** Éléments nommés de la ligne (annonces, membres), cinq au plus. */
  elements: { label: string; link: string }[]
}

const ADMIN_ORIGIN = 'https://guardiens.fr'

// Lot ADM13 : l'email du matin reprend la liste de travail de la vue
// d'ensemble (buildWorkList, _shared/admin-work-list.ts), ligne pour ligne.
// Même longueur à l'écran et dans l'email, par construction.
export function workListDigestLines(model: WorkListModel, now: number = Date.now()): DigestLine[] {
  return model.items.map((it) => {
    const since = it.waitingSince ? new Date(it.waitingSince).getTime() : NaN
    return {
      key: it.key,
      title: it.title,
      action: it.detail,
      startDate: it.startDate,
      ageDays: Number.isFinite(since) ? Math.max(0, Math.floor((now - since) / 86_400_000)) : null,
      count: it.count,
      signalTypes: [...new Set(it.signals.map((s) => s.signal_type))],
      link: `${ADMIN_ORIGIN}${it.link.startsWith('/admin') ? it.link : '/admin'}`,
      elements: it.elements.slice(0, 5).map((e) => ({
        label: e.label,
        link: `${ADMIN_ORIGIN}${e.link.startsWith('/admin') ? e.link : '/admin'}`,
      })),
    }
  })
}

/** Phrase des sources illisibles, écrite en tête de l'email. */
export function workListNotices(model: WorkListModel): string[] {
  const s = unavailableSentence(model.unavailable)
  return s ? [s] : []
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
