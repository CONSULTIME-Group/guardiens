import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts'
import { buildDigestLines, isActionableCritical, weeklyCoverageLine, weeklySummaryLines, type OpenSignal } from './digest.ts'

const NOW = Date.parse('2026-09-28T06:00:00Z')
const app = (sit: string, title: string, d = '2026-09-19T09:00:00Z'): OpenSignal => ({
  signal_type: 'pending_application', severity: 'critical', detected_at: d,
  entity_type: 'application', entity_id: crypto.randomUUID(),
  metadata: { sit_id: sit, sit_title: title },
})
const sits = new Map([
  ['marseille', { id: 'marseille', title: 'Garde 2 chats centre ville de Marseille', start_date: '2026-10-31' }],
  ['tahiti', { id: 'tahiti', title: 'Garde de maison et animaux à Taravao, Tahiti', start_date: '2026-10-10' }],
  ['hl', { id: 'hl', title: 'Garder 2 chats en Haute-Loire', start_date: '2026-10-02' }],
])

Deno.test('D : une ligne par annonce, pas une par candidature', () => {
  const lines = buildDigestLines([
    app('marseille', 'M'), app('marseille', 'M'), app('marseille', 'M'), app('marseille', 'M'),
    app('tahiti', 'T'), app('tahiti', 'T'),
  ], sits, NOW)
  assertEquals(lines.length, 2)
  assertEquals(lines.find((l) => l.key === 'sit:marseille')!.count, 4)
  assertEquals(lines.find((l) => l.key === 'sit:marseille')!.action,
    'Relancer le propriétaire : 4 candidatures attendent sa réponse.')
})

Deno.test('D : tri par date de début de garde la plus proche', () => {
  const lines = buildDigestLines([
    app('marseille', 'M'), app('tahiti', 'T'),
    { signal_type: 'owner_sit_unconfirmed', severity: 'critical', detected_at: '2026-09-19T08:40:00Z',
      entity_type: 'sit', entity_id: 'hl', metadata: {} },
  ], sits, NOW)
  assertEquals(lines.map((l) => l.key), ['sit:hl', 'sit:tahiti', 'sit:marseille'])
  assertEquals(lines[0].action, 'Aider le propriétaire à confirmer son gardien avant le départ.')
})

Deno.test('B et D : trous de couverture et warnings exclus, rien si aucun critique actionnable', () => {
  const cov: OpenSignal = { signal_type: 'city_coverage_gap', severity: 'critical', detected_at: '2026-09-20T00:00:00Z',
    entity_type: 'city', entity_id: 'x', metadata: { city: 'Troyes' } }
  const warn: OpenSignal = { ...app('tahiti', 'T'), severity: 'warning' }
  assertEquals(isActionableCritical(cov), false)
  assertEquals(buildDigestLines([cov, warn], sits, NOW), [])
})

Deno.test('B : synthèse hebdomadaire le lundi seulement', () => {
  const cov: OpenSignal = { signal_type: 'city_coverage_gap', severity: 'warning', detected_at: '2026-09-20T00:00:00Z',
    entity_type: 'city', entity_id: 'x', metadata: {} }
  assertEquals(weeklyCoverageLine([cov, cov], new Date('2026-09-28T06:00:00Z')),
    'Couverture : 2 villes suivies comptent moins de 3 gardiens à 30 km.')
  assertEquals(weeklyCoverageLine([cov], new Date('2026-09-29T06:00:00Z')), null)
})

Deno.test('D : aucun tiret cadratin dans les lignes', () => {
  const lines = buildDigestLines([app('zz', 'Garde \u2014 Lyon')], new Map(), NOW)
  assertEquals(lines[0].title, 'Garde , Lyon')
  assertEquals(lines[0].startDate, null)
})

Deno.test('S2 : candidatures et discussions d\'une annonce en une ligne', () => {
  const stalled: OpenSignal = { ...app('tahiti', 'T'), signal_type: 'stalled_discussion' }
  const lines = buildDigestLines([app('tahiti', 'T'), app('tahiti', 'T'), stalled], sits, NOW)
  assertEquals(lines.length, 1)
  assertEquals(lines[0].action, 'Relancer le propriétaire : 2 candidatures sans réponse, 1 discussion à l\'arrêt.')
})

Deno.test('S2 : files de digest regroupées en « File des digests »', () => {
  const d = (t: string): OpenSignal => ({ signal_type: t, severity: 'critical', detected_at: '2026-09-27T06:00:00Z', entity_type: 'system', entity_id: null, metadata: {} })
  const lines = buildDigestLines([d('digest_queue_stalled'), d('digest_queue_morning_backlog')], sits, NOW)
  assertEquals(lines.length, 1)
  assertEquals(lines[0].title, 'File des digests')
  assertEquals(lines[0].count, 2)
})

Deno.test('S2 : éditorial quotidien seulement pour la panne du détecteur', () => {
  const c = (t: string): OpenSignal => ({ signal_type: t, severity: 'critical', detected_at: '2026-09-27T06:00:00Z', entity_type: 'system', entity_id: t, metadata: {} })
  assertEquals(isActionableCritical(c('content_detector_broken')), true)
  assertEquals(isActionableCritical(c('content_defect_outside_freeze')), false)
  assertEquals(isActionableCritical(c('dormant_sitter')), false)
  assertEquals(isActionableCritical(c('untapped_city')), false)
})

Deno.test('S2 : synthèse du lundi, couverture, éditorial, À animer', () => {
  const w = (t: string): OpenSignal => ({ signal_type: t, severity: 'warning', detected_at: '2026-09-20T00:00:00Z', entity_type: 'x', entity_id: null, metadata: {} })
  const rows = [w('city_coverage_gap'), w('city_coverage_gap'), w('city_seo_tension'), w('content_quality_drift'), w('dormant_sitter'), w('affinity_onboarding_stale'), w('affinity_onboarding_stale')]
  assertEquals(weeklySummaryLines(rows, new Date('2026-09-28T06:00:00Z')), [
    'Couverture : 2 villes suivies comptent moins de 3 gardiens à 30 km, 1 ville en tension SEO.',
    'Qualité éditoriale : 1 signal ouvert.',
    'À animer : 1 gardien dormant, 2 onboardings affinité inachevés.',
  ])
  assertEquals(weeklySummaryLines(rows, new Date('2026-09-29T06:00:00Z')), [])
})
