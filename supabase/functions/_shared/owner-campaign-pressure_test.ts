import { assert, assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts'
import { countRecentEmails, isPressureIgnored, splitByPressure, OWNER_CAMPAIGN_MAX_RECENT_EMAILS } from './owner-campaign-pressure.ts'
import { splitDepartureAudience } from './owner-departure-audience.ts'
import { splitNoelV2Audience } from './owner-noel-v2.ts'
import { isOwnerV2Holdout } from './owner-departure-logic.ts'

const log = (email: string, template: string, n: number, status = 'sent') =>
  Array.from({ length: n }, (_, i) => ({ recipient_email: email, template_name: template, status, message_id: `${email}-${template}-${i}` }))

Deno.test('pression : 2 gardé, 3 exclu, transactionnels ignorés, sent et bounced seulement', () => {
  const counts = countRecentEmails([
    ...log('Deux@x.fr', 'entraide-ligne-relance', 2),
    ...log('trois@x.fr', 'entraide-ligne-helps-with', 2), ...log('trois@x.fr', 'nearby-daily-digest', 1, 'bounced'),
    ...log('trans@x.fr', 'entraide-ligne-relance', 2), ...log('trans@x.fr', 'signup', 1), ...log('trans@x.fr', 'new-message', 3),
    ...log('trans@x.fr', 'recovery', 1), ...log('trans@x.fr', 'admin-signals-digest', 2), ...log('trans@x.fr', 'unread-messages-reminder', 1),
    ...log('echec@x.fr', 'entraide-ligne-relance', 5, 'failed'),
    { recipient_email: 'dup@x.fr', template_name: 'seasonal-nurture', status: 'sent', message_id: 'm1' },
    { recipient_email: 'dup@x.fr', template_name: 'seasonal-nurture', status: 'sent', message_id: 'm1' },
    { recipient_email: 'dup@x.fr', template_name: 'seasonal-nurture', status: 'sent', message_id: 'm1' },
  ])
  assertEquals(OWNER_CAMPAIGN_MAX_RECENT_EMAILS, 3)
  assertEquals(counts.get('deux@x.fr'), 2)
  assertEquals(counts.get('trois@x.fr'), 3)
  assertEquals(counts.get('trans@x.fr'), 2)
  assertEquals(counts.get('echec@x.fr'), undefined)
  assertEquals(counts.get('dup@x.fr'), 1)
  const r = splitByPressure([{ email: 'deux@x.fr' }, { email: 'TROIS@x.fr' }, { email: 'trans@x.fr' }], counts)
  assertEquals(r.rows.map((x) => x.email), ['deux@x.fr', 'trans@x.fr'])
  assertEquals(r.pressureExcluded, 1)
  for (const t of ['signup', 'magiclink', 'system', 'new-application', 'admin-delivery-alert']) assert(isPressureIgnored(t), t)
  assert(!isPressureIgnored('entraide-ligne-relance'))
})

const ids = Array.from({ length: 400 }, (_, i) => `00000000-0000-4000-8000-${String(i).padStart(12, '0')}`)
const holdout = ids.find(isOwnerV2Holdout)!
const [a, b, c, d] = ids.filter((i) => !isOwnerV2Holdout(i))
const counts = new Map([['b@x.fr', 3], ['c@x.fr', 2], ['h@x.fr', 9]])

Deno.test('audience question de départ : pressureExcluded après témoin et déjà répondu', () => {
  const s = splitDepartureAudience(
    [{ id: a, email: 'a@x.fr' }, { id: b, email: 'b@x.fr' }, { id: c, email: 'c@x.fr' }, { id: d, email: 'b@x.fr' }, { id: holdout, email: 'h@x.fr' }],
    new Set([d]), counts)
  assertEquals(s.rows.map((r) => r.id), [a, c])
  assertEquals(s.holdoutExcluded, 1); assertEquals(s.alreadyAnswered, 1); assertEquals(s.pressureExcluded, 1)
})

Deno.test('audience Noël : pressureExcluded après témoin et autre période', () => {
  const s = splitNoelV2Audience(
    [{ id: a, email: 'a@x.fr' }, { id: b, email: 'b@x.fr' }, { id: c, email: 'b@x.fr' }, { id: holdout, email: 'h@x.fr' }],
    new Map([[c, 'ete']]), counts)
  assertEquals(s.rows.map((r) => r.id), [a])
  assertEquals(s.holdoutExcluded, 1); assertEquals(s.otherPeriodExcluded, 1); assertEquals(s.pressureExcluded, 1)
})
