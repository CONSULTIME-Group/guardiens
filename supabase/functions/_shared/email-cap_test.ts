import { assertEquals, assert } from 'https://deno.land/std@0.224.0/assert/mod.ts'
import {
  decideDeferral,
  isQuietAt,
  nextQuietEndFrom,
  getParisParts,
  BYPASS_TEMPLATES,
} from './email-cap.ts'

// Helper: build a UTC Date that corresponds to a specific Paris wall-clock time.
// `hourParis` is in [0, 24). Uses fixed dates so we can pin DST behaviour.
function parisAt(yyyyMmDd: string, hourParis: number, minute = 0): Date {
  // Try offsets +1 (winter) and +2 (summer).
  const [y, m, d] = yyyyMmDd.split('-').map(Number)
  for (const offset of [1, 2]) {
    const cand = new Date(Date.UTC(y, m - 1, d, hourParis - offset, minute, 0))
    const p = getParisParts(cand)
    if (p.year === y && p.month === m && p.day === d && p.hour === hourParis && p.minute === minute) {
      return cand
    }
  }
  throw new Error(`Cannot construct Paris time ${yyyyMmDd} ${hourParis}:${minute}`)
}

// =============================================================
// Quiet hours (22:00–08:00 Europe/Paris)
// =============================================================

Deno.test('isQuietAt — 14:00 Paris is NOT quiet', () => {
  assertEquals(isQuietAt(parisAt('2026-01-15', 14)), false)
})

Deno.test('isQuietAt — 22:00 Paris IS quiet (inclusive start)', () => {
  assertEquals(isQuietAt(parisAt('2026-01-15', 22)), true)
})

Deno.test('isQuietAt — 23:30 Paris IS quiet', () => {
  assertEquals(isQuietAt(parisAt('2026-01-15', 23, 30)), true)
})

Deno.test('isQuietAt — 00:00 Paris IS quiet', () => {
  assertEquals(isQuietAt(parisAt('2026-01-15', 0)), true)
})

Deno.test('isQuietAt — 07:59 Paris IS quiet', () => {
  assertEquals(isQuietAt(parisAt('2026-01-15', 7, 59)), true)
})

Deno.test('isQuietAt — 08:00 Paris is NOT quiet (exclusive end)', () => {
  assertEquals(isQuietAt(parisAt('2026-01-15', 8)), false)
})

Deno.test('isQuietAt — works in summer DST (CEST, +02:00)', () => {
  assertEquals(isQuietAt(parisAt('2026-10-01', 14)), false)
  assertEquals(isQuietAt(parisAt('2026-10-01', 23)), true)
  assertEquals(isQuietAt(parisAt('2026-10-01', 8)), false)
})

// =============================================================
// nextQuietEndFrom — report au prochain créneau (08:00 Paris)
// =============================================================

Deno.test('nextQuietEndFrom — at 23:30 Paris → next morning 08:00 Paris', () => {
  const now = parisAt('2026-01-15', 23, 30)
  const next = nextQuietEndFrom(now)
  const p = getParisParts(next)
  assertEquals(p.year, 2026)
  assertEquals(p.month, 1)
  assertEquals(p.day, 16)
  assertEquals(p.hour, 8)
  assertEquals(p.minute, 0)
})

Deno.test('nextQuietEndFrom — at 03:00 Paris → same day 08:00 Paris', () => {
  const now = parisAt('2026-01-15', 3)
  const next = nextQuietEndFrom(now)
  const p = getParisParts(next)
  assertEquals(p.day, 15)
  assertEquals(p.hour, 8)
})

Deno.test('nextQuietEndFrom — at 14:00 Paris → next day 08:00 (we are past 08:00)', () => {
  const now = parisAt('2026-01-15', 14)
  const next = nextQuietEndFrom(now)
  const p = getParisParts(next)
  assertEquals(p.day, 16)
  assertEquals(p.hour, 8)
})

Deno.test('nextQuietEndFrom — across DST boundary (last Sunday of March)', () => {
  // 2026-03-29 is the spring-forward day in Europe/Paris.
  const now = parisAt('2026-03-28', 23)
  const next = nextQuietEndFrom(now)
  const p = getParisParts(next)
  assertEquals(p.day, 29)
  assertEquals(p.hour, 8)
})

// =============================================================
// decideDeferral — frequency caps & bypass
// =============================================================

const ACTIVE_HOUR = parisAt('2026-01-15', 14) // not quiet, mid-afternoon

Deno.test('decideDeferral — empty history at active hour → SEND', () => {
  const r = decideDeferral({
    now: ACTIVE_HOUR,
    templateName: 'review-reminder',
    hourSentAt: [],
    daySentAt: [],
  })
  assertEquals(r.action, 'send')
})

Deno.test('decideDeferral — bypass template during quiet hours → SEND', () => {
  for (const tpl of BYPASS_TEMPLATES) {
    const r = decideDeferral({
      now: parisAt('2026-01-15', 23),
      templateName: tpl,
      hourSentAt: ['2026-01-15T20:00:00.000Z', '2026-01-15T21:00:00.000Z', '2026-01-15T21:30:00.000Z'],
      daySentAt: ['2026-01-15T20:00:00.000Z', '2026-01-15T21:00:00.000Z', '2026-01-15T21:30:00.000Z'],
    })
    assertEquals(r.action, 'send', `bypass failed for ${tpl}`)
  }
})

Deno.test('decideDeferral — __urgent flag bypasses everything', () => {
  const r = decideDeferral({
    now: parisAt('2026-01-15', 23),
    templateName: 'review-reminder',
    isUrgent: true,
    hourSentAt: [],
    daySentAt: [],
  })
  assertEquals(r.action, 'send')
})

Deno.test('decideDeferral — quiet hours take precedence over caps', () => {
  const r = decideDeferral({
    now: parisAt('2026-01-15', 23),
    templateName: 'review-reminder',
    hourSentAt: [],
    daySentAt: [],
  })
  assertEquals(r.action, 'defer')
  if (r.action === 'defer') {
    assertEquals(r.reason, 'quiet_hours')
    assertEquals(getParisParts(r.scheduledFor).hour, 8)
  }
})

Deno.test('decideDeferral — daily cap (3 sent in 24h) → defer to oldest+24h+30s', () => {
  const oldest = '2026-01-15T10:00:00.000Z'
  const r = decideDeferral({
    now: ACTIVE_HOUR,
    templateName: 'review-reminder',
    hourSentAt: [],
    daySentAt: [oldest, '2026-01-15T11:00:00.000Z', '2026-01-15T12:00:00.000Z'],
  })
  assertEquals(r.action, 'defer')
  if (r.action === 'defer') {
    assertEquals(r.reason, 'frequency_cap_day')
    const expected = new Date(new Date(oldest).getTime() + 86400_000 + 30_000)
    assertEquals(r.scheduledFor.toISOString(), expected.toISOString())
  }
})

Deno.test('decideDeferral — hourly cap (1 sent in 1h) → defer to oldest+1h+30s', () => {
  const oldest = '2026-01-15T13:30:00.000Z'
  const r = decideDeferral({
    now: ACTIVE_HOUR, // 14:00 Paris
    templateName: 'review-reminder',
    hourSentAt: [oldest],
    daySentAt: [oldest],
  })
  assertEquals(r.action, 'defer')
  if (r.action === 'defer') {
    assertEquals(r.reason, 'frequency_cap_hour')
    const expected = new Date(new Date(oldest).getTime() + 3600_000 + 30_000)
    assertEquals(r.scheduledFor.toISOString(), expected.toISOString())
  }
})

Deno.test('decideDeferral — daily cap takes precedence over hourly cap', () => {
  const oldestDay = '2026-01-15T10:00:00.000Z'
  const r = decideDeferral({
    now: ACTIVE_HOUR,
    templateName: 'review-reminder',
    hourSentAt: ['2026-01-15T13:45:00.000Z'],
    daySentAt: [oldestDay, '2026-01-15T11:00:00.000Z', '2026-01-15T13:45:00.000Z'],
  })
  assertEquals(r.action, 'defer')
  if (r.action === 'defer') assertEquals(r.reason, 'frequency_cap_day')
})

Deno.test('decideDeferral — exactly at cap boundary defers (>=, not >)', () => {
  // 1 in last hour → at hourly cap (CAP_PER_HOUR=1) → defer
  const r1 = decideDeferral({
    now: ACTIVE_HOUR,
    templateName: 'review-reminder',
    hourSentAt: ['2026-01-15T13:50:00.000Z'],
    daySentAt: ['2026-01-15T13:50:00.000Z'],
  })
  assert(r1.action === 'defer' && r1.reason === 'frequency_cap_hour')

  // 3 in last 24h → at daily cap (CAP_PER_DAY=3) → defer
  const r2 = decideDeferral({
    now: ACTIVE_HOUR,
    templateName: 'review-reminder',
    hourSentAt: [],
    daySentAt: ['2026-01-15T01:00:00.000Z', '2026-01-15T05:00:00.000Z', '2026-01-15T11:00:00.000Z'],
  })
  assert(r2.action === 'defer' && r2.reason === 'frequency_cap_day')
})

Deno.test('decideDeferral — under cap (2 in 24h, 0 in 1h) → SEND', () => {
  const r = decideDeferral({
    now: ACTIVE_HOUR,
    templateName: 'review-reminder',
    hourSentAt: [],
    daySentAt: ['2026-01-15T01:00:00.000Z', '2026-01-15T05:00:00.000Z'],
  })
  assertEquals(r.action, 'send')
})

// =============================================================
// "Report au prochain créneau" — end-to-end behaviour
// =============================================================

Deno.test('Report — quiet hour deferral schedules at 08:00 Paris exactly', () => {
  const now = parisAt('2026-11-10', 23, 17) // winter, +01:00
  const r = decideDeferral({
    now,
    templateName: 'review-reminder',
    hourSentAt: [],
    daySentAt: [],
  })
  assert(r.action === 'defer' && r.reason === 'quiet_hours')
  if (r.action === 'defer') {
    const p = getParisParts(r.scheduledFor)
    assertEquals(p.hour, 8)
    assertEquals(p.minute, 0)
    assertEquals(p.day, 11) // tomorrow
  }
})

Deno.test('Report — hourly cap deferral re-evaluates correctly after slot opens', () => {
  // First call: 1 sent at 13:50 → defer to 14:50:30
  const oldest = '2026-01-15T13:50:00.000Z'
  const r1 = decideDeferral({
    now: parisAt('2026-01-15', 14),
    templateName: 'review-reminder',
    hourSentAt: [oldest],
    daySentAt: [oldest],
  })
  assert(r1.action === 'defer' && r1.reason === 'frequency_cap_hour')
  const scheduled = (r1 as any).scheduledFor as Date

  // Replay at the scheduled moment: the old send is now > 1h ago → falls out of window → SEND
  const r2 = decideDeferral({
    now: scheduled,
    templateName: 'review-reminder',
    hourSentAt: [], // oldest is 1h+30s old → no longer in 1h window
    daySentAt: [oldest],
  })
  assertEquals(r2.action, 'send')
})
