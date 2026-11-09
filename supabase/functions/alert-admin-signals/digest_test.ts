import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts'
import { weeklyCoverageLine, weeklySummaryLines, workListDigestLines, workListNotices, type OpenSignal } from './digest.ts'
import { buildWorkList, type PilotageSignal } from '../_shared/admin-work-list.ts'

// Lot ADM13 : l'email du matin reprend la liste de travail de la vue
// d'ensemble ; les règles de la liste sont verrouillées côté site
// (src/__tests__/adm13/), ce fichier vérifie la forme de l'email.
const NOW = Date.parse('2026-11-09T06:00:00Z')
const sig = (type: string, severity: string, extra: Partial<PilotageSignal> = {}): PilotageSignal => ({
  id: crypto.randomUUID(), signal_type: type, severity, entity_type: null, entity_id: null,
  detected_at: '2026-11-05T08:00:00Z', metadata: {}, ...extra,
})

Deno.test('ADM13 : une ligne d\'email par ligne de la liste, liens absolus', () => {
  const model = buildWorkList({
    signals: [sig('suspicious_account', 'warning'), sig('suspicious_account', 'warning'), sig('alma_churn', 'critical')],
    queues: [{ key: 'contactMessages', count: 2, oldest: '2026-11-07T06:00:00Z' }],
    relances_failed_7d: 1,
    health: [{ key: 'tasks', label: 'Tâches planifiées', state: 'alert', detail: 'Dernier passage en échec ou en retard : Récapitulatif', link: '/admin?plus=taches' }],
  }, NOW)
  const lines = workListDigestLines(model, NOW)
  assertEquals(lines.length, model.items.length)
  assertEquals(lines.map((l) => l.title), [
    'Vérifier les tâches planifiées',
    'Répondre à 2 messages de contact',
    'Écrire au membre qui veut partir',
    'Examiner 2 comptes suspects',
    'Vérifier 1 relance automatique en échec',
  ])
  assertEquals(lines[0].link, 'https://guardiens.fr/admin?plus=taches')
  assertEquals(lines[1].ageDays, 2)
})

Deno.test('ADM13 : une source illisible est écrite en tête de l\'email', () => {
  const model = buildWorkList({ sources: { queues: false, health: false }, signals: [] }, NOW)
  assertEquals(workListNotices(model), ['Lecture impossible : files des membres, état du site. La liste est incomplète.'])
})

Deno.test('ADM13 : aucun tiret cadratin dans les lignes', () => {
  const model = buildWorkList({
    signals: [sig('no_applications', 'warning', { entity_type: 'sit', entity_id: 's1' })],
    sits: [{ id: 's1', title: 'Garde \u2014 Lyon', city: 'Lyon', start_date: '2026-12-20' }],
  }, NOW)
  const text = JSON.stringify(workListDigestLines(model, NOW))
  assertEquals(/[\u2014\u2013]/.test(text), false)
})

Deno.test('B : synthèse hebdomadaire le lundi seulement', () => {
  const cov: OpenSignal = { signal_type: 'city_coverage_gap', severity: 'warning', detected_at: '2026-09-20T00:00:00Z',
    entity_type: 'city', entity_id: 'x', metadata: {} }
  assertEquals(weeklyCoverageLine([cov, cov], new Date('2026-09-28T06:00:00Z')),
    'Couverture : 2 villes suivies comptent moins de 3 gardiens à 30 km.')
  assertEquals(weeklyCoverageLine([cov], new Date('2026-09-29T06:00:00Z')), null)
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
