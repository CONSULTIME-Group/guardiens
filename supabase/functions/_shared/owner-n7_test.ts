import { assert, assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts'
import { excludeStaffSitters, FOUNDER_PROFILE_IDS } from './owner-noel-audience.ts'
import { splitAlreadyReceived, ONCE_PER_RECIPIENT_TEMPLATES } from './owner-campaign-pressure.ts'
import { isScannerBurst } from './owner-departure-logic.ts'
import { DATED_TEMPLATES } from './email-cap.ts'

Deno.test('fondateurs (Elisa incluse) et admins retirés du vivier', () => {
  assert(FOUNDER_PROFILE_IDS.includes('d593fac5-cf87-4696-8041-70fd3a8d3c76'))
  const rows = [{ id: '7bf29905-d372-4669-93b1-ec7def9b06d5' }, { id: 'd593fac5-cf87-4696-8041-70fd3a8d3c76' }, { id: 'adm' }, { id: 'x' }]
  assertEquals(excludeStaffSitters(rows, new Set(['adm'])).map((r) => r.id), ['x'])
})
Deno.test('anti-doublon par gabarit', () => {
  const r = splitAlreadyReceived([{ email: 'A@x.fr' }, { email: 'b@x.fr' }], new Set(['a@x.fr']))
  assertEquals(r.alreadyReceived, 1); assertEquals(r.rows.length, 1)
  assert(ONCE_PER_RECIPIENT_TEMPLATES.has('owner-noel-2026') && ONCE_PER_RECIPIENT_TEMPLATES.has('owner-departure-question'))
})
Deno.test('gabarits datés', () => {
  assert(DATED_TEMPLATES.has('owner-noel-2026')); assert(DATED_TEMPLATES.has('owner-departure-question'))
})
Deno.test('robot de messagerie : deux périodes en moins de 2 minutes', () => {
  const now = new Date('2026-10-06T10:00:00Z')
  assert(isScannerBurst([{ period: 'noel', answered_at: '2026-10-06T09:59:30Z' }], 'hiver', now))
  assert(!isScannerBurst([{ period: 'noel', answered_at: '2026-10-06T09:59:30Z' }], 'noel', now))
  assert(!isScannerBurst([{ period: 'noel', answered_at: '2026-10-06T09:50:00Z' }], 'hiver', now))
})
