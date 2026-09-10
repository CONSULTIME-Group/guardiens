import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts'
import { chunk, clampInt, filterToFrozenCohort, isRateLimitFailure, runInBatches } from './cohort.ts'

const plan = [
  { user_id: 'u-cible' },
  { user_id: 'u-temoin' },
  { user_id: 'u-inconnu' },
]

const cohort = [
  { user_id: 'u-cible', groupe: 'cible' },
  { user_id: 'u-temoin', groupe: 'temoin' },
]

Deno.test('cohorte presente : seul le groupe cible est retenu', () => {
  const res = filterToFrozenCohort(plan, cohort)
  assertEquals(res.rows.map((r) => r.user_id), ['u-cible'])
  assertEquals(res.planBrut, 3)
  assertEquals(res.cibleRetenue, 1)
  assertEquals(res.ecartesHorsCible, 2)
  assertEquals(res.cohortPresent, true)
})

Deno.test('cohorte absente : le plan passe integralement', () => {
  const res = filterToFrozenCohort(plan, [])
  assertEquals(res.rows.length, 3)
  assertEquals(res.ecartesHorsCible, 0)
  assertEquals(res.cohortPresent, false)
})

Deno.test('croisement vide sur un plan non vide : refus signale', () => {
  const res = filterToFrozenCohort(plan, [{ user_id: 'u-temoin', groupe: 'temoin' }])
  assertEquals(res.cohortPresent, true)
  assertEquals(res.planBrut, 3)
  assertEquals(res.cibleRetenue, 0)
  // Le garde-fou de l'appelant : cohorte presente, plan non vide, zero retenu.
  assertEquals(res.cohortPresent && res.planBrut > 0 && res.cibleRetenue === 0, true)
})

Deno.test('recipient_id visant le temoin ne laisse aucun destinataire', () => {
  const res = filterToFrozenCohort(plan, cohort)
  // Le filtre recipient_id s'applique APRES le croisement.
  const targeted = res.rows.filter((r) => r.user_id === 'u-temoin')
  assertEquals(targeted.length, 0)
})

Deno.test('le decoupage respecte batch_size et ne pause pas apres le dernier lot', async () => {
  const items = [1, 2, 3, 4, 5, 6, 7]
  const batches: number[][] = []
  const sleeps: number[] = []

  const res = await runInBatches(items, {
    batchSize: 3,
    delayMs: 1200,
    sleep: (ms) => { sleeps.push(ms); return Promise.resolve() },
    handler: (n) => {
      const last = batches[batches.length - 1]
      if (!last || last.length === 3) batches.push([n])
      else last.push(n)
      return Promise.resolve(n)
    },
  })

  assertEquals(chunk(items, 3).map((b) => b.length), [3, 3, 1])
  assertEquals(res.processed, 7)
  assertEquals(res.stopped, false)
  // Trois lots, donc deux pauses seulement.
  assertEquals(sleeps, [1200, 1200])
})

Deno.test('la garde de temps arrete la boucle et rend le reste', async () => {
  let checks = 0
  const res = await runInBatches([1, 2, 3, 4], {
    batchSize: 2,
    delayMs: 0,
    sleep: () => Promise.resolve(),
    handler: (n) => Promise.resolve(n),
    shouldStop: () => checks++ > 0,
  })
  assertEquals(res.stopped, true)
  assertEquals(res.processed, 2)
  assertEquals(res.remaining, [3, 4])
})

Deno.test('bornes des options de lot', () => {
  assertEquals(clampInt(undefined, 1, 20, 5), 5)
  assertEquals(clampInt(50, 1, 20, 5), 20)
  assertEquals(clampInt(0, 1, 20, 5), 1)
  assertEquals(clampInt(15000, 0, 10000, 1200), 10000)
})

Deno.test('seuls les echecs de debit sont rejouables', () => {
  assertEquals(isRateLimitFailure('Resend RateLimitError: Retry after 56425ms'), true)
  assertEquals(isRateLimitFailure('send-transactional-email 429: too many'), true)
  assertEquals(isRateLimitFailure('send-transactional-email 403: blocked'), false)
})
