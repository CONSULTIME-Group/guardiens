import { assert, assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts'
import { almaDepartureState, computeReadiness, departureTokenState, finishUrl, isDuplicateAnswer, isOwnerV2Holdout, md5, remainingPhrase } from './owner-departure-logic.ts'
import { splitDepartureAudience } from './owner-departure-audience.ts'

const today = '2026-10-01'
const empty = { hasProperty: false, pets: [], galleryPhotoCount: 0, propertyPhotoCount: 0, draftStartDates: [], today }

Deno.test('md5 conforme RFC 1321', () => {
  assertEquals(md5(''), 'd41d8cd98f00b204e9800998ecf8427e')
  assertEquals(md5('abc'), '900150983cd24fb0d6963f7d28e17f72')
  assertEquals(md5('é'), '65ec73e5d6b7d8d2b6fcae47a6e9aa6f')
})

Deno.test('ownerReadiness : 0, 60, 100 %, sans animaux', () => {
  assertEquals(computeReadiness(empty).percent, 0)
  const r60 = computeReadiness({ ...empty, city: 'Lyon', latitude: 45.7, pets: [{ name: 'Rex', species: 'dog' }] })
  assertEquals(r60.percent, 60)
  assertEquals(remainingPhrase(r60.todo), 'une photo de chez vous et vos dates')
  const r100 = computeReadiness({ ...empty, city: 'Lyon', latitude: 45.7, hasProperty: true, pets: [{ name: 'Rex', species: 'dog' }], galleryPhotoCount: 1, draftStartDates: ['2026-12-19'] })
  assertEquals(r100.percent, 100)
  const noPets = computeReadiness({ ...empty, hasProperty: true })
  assertEquals(noPets.items.find((i) => i.key === 'animaux')?.label, 'Une maison à garder')
  assertEquals(noPets.percent, 40)
})

Deno.test('jeton : valide, expiré, révoqué, double clic', () => {
  const now = new Date('2026-10-01T10:00:00Z')
  assertEquals(departureTokenState({ profile_id: 'u', expires_at: '2026-10-20T00:00:00Z', revoked_at: null }, now), 'valid')
  assertEquals(departureTokenState({ profile_id: 'u', expires_at: '2026-09-01T00:00:00Z', revoked_at: null }, now), 'expired')
  assertEquals(departureTokenState({ profile_id: 'u', expires_at: '2026-10-20T00:00:00Z', revoked_at: '2026-09-30T00:00:00Z' }, now), 'revoked')
  assertEquals(departureTokenState(null, now), 'invalid')
  const last = { period: 'noel', answered_at: '2026-10-01T09:59:30Z' }
  assert(isDuplicateAnswer(last, 'noel', now))
  assert(!isDuplicateAnswer(last, 'ete', now))
})

Deno.test('enregistrement de la période et carte Alma', () => {
  const now = new Date('2026-10-01T10:00:00Z')
  assertEquals(almaDepartureState(null, now), 'ask')
  assertEquals(almaDepartureState({ period: 'noel', answered_at: '2026-10-01T00:00:00Z' }, now), 'known')
  assertEquals(almaDepartureState({ period: 'plus_tard', answered_at: '2026-09-20T00:00:00Z' }, now), 'hidden')
  assertEquals(almaDepartureState({ period: 'plus_tard', answered_at: '2026-08-01T00:00:00Z' }, now), 'ask')
  assertEquals(finishUrl('noel'), '/sits/create?express=1&periode=noel&debut=2026-12-19&fin=2027-01-03')
  assertEquals(finishUrl('ete'), '/sits/create?express=1&periode=ete')
})

Deno.test('témoin : stable et proche de 10 % sur 1 000 identifiants', () => {
  const ids = Array.from({ length: 1000 }, (_, i) => crypto.randomUUID ? `00000000-0000-4000-8000-${String(i).padStart(12, '0')}` : '')
  const n = ids.filter(isOwnerV2Holdout).length
  assert(n >= 70 && n <= 135, `témoin ${n}`)
  for (const id of ids.slice(0, 50)) assertEquals(isOwnerV2Holdout(id), isOwnerV2Holdout(id))
  const split = splitDepartureAudience(ids.map((id) => ({ id })), new Set([ids.find((i) => !isOwnerV2Holdout(i))!]))
  assertEquals(split.holdoutExcluded, n)
  assertEquals(split.alreadyAnswered, 1)
  assertEquals(split.rows.length, 1000 - n - 1)
})
