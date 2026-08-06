import { assertEquals, assert } from 'https://deno.land/std@0.224.0/assert/mod.ts'
import {
  decideDeferral,
  isQuietAt,
  nextQuietEndFrom,
  getParisParts,
  BYPASS_TEMPLATES,
  resolveDeferral,
  TEMPLATE_TTL_HOURS,
  CAP_NEARBY_SIT_PER_DAY,
  CAP_NEARBY_SIT_PER_WEEK,
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
// decideDeferral — doctrine 02/08/2026
//   transactional : aucun plafond, seules les heures calmes s'appliquent.
//   non transactionnel : plafonds de categorie uniquement.
//   categorie absente ou inconnue : traitee comme 'product'.
// =============================================================

const ACTIVE_HOUR = parisAt('2026-01-15', 14) // not quiet, mid-afternoon

Deno.test('decideDeferral — empty history at active hour → SEND', () => {
  const r = decideDeferral({
    now: ACTIVE_HOUR,
    templateName: 'new-message',
    category: 'transactional',
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
      category: 'transactional',
      hourSentAt: ['2026-01-15T20:00:00.000Z', '2026-01-15T21:00:00.000Z'],
      daySentAt: ['2026-01-15T20:00:00.000Z', '2026-01-15T21:00:00.000Z'],
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

// -------------------------------------------------------------
// Transactionnel : jamais plafonne
// -------------------------------------------------------------

Deno.test('decideDeferral — transactionnel avec 10 envois dans l\'heure → SEND', () => {
  const hour = Array.from({ length: 10 }, (_, i) =>
    new Date(Date.parse('2026-01-15T13:00:00.000Z') + i * 60_000).toISOString())
  const r = decideDeferral({
    now: ACTIVE_HOUR,
    templateName: 'new-message',
    category: 'transactional',
    hourSentAt: hour,
    daySentAt: hour,
  })
  assertEquals(r.action, 'send')
})

Deno.test('decideDeferral — transactionnel ignore aussi les compteurs non tx', () => {
  const r = decideDeferral({
    now: ACTIVE_HOUR,
    templateName: 'new-application',
    category: 'transactional',
    hourSentAt: [],
    daySentAt: [],
    nonTxDaySentAt: ['2026-01-15T09:00:00.000Z'],
    nonTxWeekSentAt: ['2026-01-10T09:00:00.000Z', '2026-01-12T09:00:00.000Z', '2026-01-15T09:00:00.000Z'],
  })
  assertEquals(r.action, 'send')
})

Deno.test('decideDeferral — transactionnel toujours differe pendant les heures calmes', () => {
  const r = decideDeferral({
    now: parisAt('2026-01-15', 23),
    templateName: 'new-message',
    category: 'transactional',
    hourSentAt: [],
    daySentAt: [],
  })
  assertEquals(r.action, 'defer')
  if (r.action === 'defer') {
    assertEquals(r.reason, 'quiet_hours')
    assertEquals(getParisParts(r.scheduledFor).hour, 8)
  }
})

// -------------------------------------------------------------
// Non transactionnel : plafonds de categorie uniquement
// -------------------------------------------------------------

Deno.test('decideDeferral — product plafonne par le cap categorie 24h', () => {
  const oldest = '2026-01-15T10:00:00.000Z'
  const r = decideDeferral({
    now: ACTIVE_HOUR,
    templateName: 'review-reminder',
    category: 'product',
    hourSentAt: [],
    daySentAt: [],
    nonTxDaySentAt: [oldest],
  })
  assertEquals(r.action, 'defer')
  if (r.action === 'defer') {
    assertEquals(r.reason, 'frequency_cap_category_day')
    const expected = new Date(new Date(oldest).getTime() + 86400_000 + 30_000)
    assertEquals(r.scheduledFor.toISOString(), expected.toISOString())
  }
})

Deno.test('decideDeferral — product plafonne par le cap categorie 7 jours (prioritaire)', () => {
  const oldest = '2026-01-09T10:00:00.000Z'
  const r = decideDeferral({
    now: ACTIVE_HOUR,
    templateName: 'review-reminder',
    category: 'digest',
    hourSentAt: [],
    daySentAt: [],
    nonTxDaySentAt: ['2026-01-15T10:00:00.000Z'],
    nonTxWeekSentAt: [oldest, '2026-01-11T10:00:00.000Z', '2026-01-15T10:00:00.000Z'],
  })
  assertEquals(r.action, 'defer')
  if (r.action === 'defer') {
    assertEquals(r.reason, 'frequency_cap_category_week')
    const expected = new Date(new Date(oldest).getTime() + 7 * 86400_000 + 30_000)
    assertEquals(r.scheduledFor.toISOString(), expected.toISOString())
  }
})

Deno.test('decideDeferral — product NON plafonne par les anciens caps globaux', () => {
  const many = ['2026-01-15T09:00:00.000Z', '2026-01-15T10:00:00.000Z', '2026-01-15T11:00:00.000Z', '2026-01-15T13:50:00.000Z']
  const r = decideDeferral({
    now: ACTIVE_HOUR,
    templateName: 'review-reminder',
    category: 'product',
    hourSentAt: ['2026-01-15T13:50:00.000Z'],
    daySentAt: many,
    nonTxDaySentAt: [],
    nonTxWeekSentAt: [],
  })
  assertEquals(r.action, 'send')
})

Deno.test('decideDeferral — template sans categorie traite comme product', () => {
  const oldest = '2026-01-15T10:00:00.000Z'
  const r = decideDeferral({
    now: ACTIVE_HOUR,
    templateName: 'template-non-categorise',
    hourSentAt: [],
    daySentAt: [],
    nonTxDaySentAt: [oldest],
  })
  assertEquals(r.action, 'defer')
  if (r.action === 'defer') assertEquals(r.reason, 'frequency_cap_category_day')
})

Deno.test('decideDeferral — categorie inconnue traitee comme product', () => {
  const r = decideDeferral({
    now: ACTIVE_HOUR,
    templateName: 'template-categorie-inconnue',
    category: 'marketing' as unknown as 'product',
    hourSentAt: [],
    daySentAt: [],
    nonTxDaySentAt: ['2026-01-15T10:00:00.000Z'],
  })
  assert(r.action === 'defer' && r.reason === 'frequency_cap_category_day')
})

Deno.test('decideDeferral — product sous les plafonds de categorie → SEND', () => {
  const r = decideDeferral({
    now: ACTIVE_HOUR,
    templateName: 'review-reminder',
    category: 'product',
    hourSentAt: [],
    daySentAt: [],
    nonTxDaySentAt: [],
    nonTxWeekSentAt: ['2026-01-10T09:00:00.000Z', '2026-01-12T09:00:00.000Z'],
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
    category: 'product',
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

Deno.test('Report — cap categorie re-evalue correctement une fois le creneau ouvert', () => {
  const oldest = '2026-01-15T10:00:00.000Z'
  const r1 = decideDeferral({
    now: ACTIVE_HOUR,
    templateName: 'review-reminder',
    category: 'product',
    hourSentAt: [],
    daySentAt: [],
    nonTxDaySentAt: [oldest],
  })
  assert(r1.action === 'defer' && r1.reason === 'frequency_cap_category_day')
  const scheduled = (r1 as any).scheduledFor as Date

  const r2 = decideDeferral({
    now: scheduled,
    templateName: 'review-reminder',
    category: 'product',
    hourSentAt: [],
    daySentAt: [],
    nonTxDaySentAt: [], // sorti de la fenetre 24h
  })
  assertEquals(r2.action, 'send')
})

// -------------------------------------------------------------
// CORRECTIF 06/08/2026 : compteur propre a l'alerte de nouvelle annonce
// -------------------------------------------------------------

Deno.test("nearby-sit-alert — le recapitulatif du matin ne consomme plus son quota", () => {
  // Scenario reel du 03 au 04/08 : un gardien recoit son recapitulatif
  // quotidien a 5h UTC, puis une annonce est publiee dans sa zone l'apres-midi.
  // Les deux doivent partir.
  const digestSentAt = "2026-01-15T05:00:00.000Z"
  const r = decideDeferral({
    now: ACTIVE_HOUR,
    templateName: "nearby-sit-alert",
    category: "alert",
    hourSentAt: [],
    daySentAt: [digestSentAt],
    // Le recapitulatif est compte dans le quota 'alert', pas dans celui de
    // l'alerte de nouvelle annonce.
    alertDaySentAt: [digestSentAt],
    alertWeekSentAt: [digestSentAt],
    nearbySitDaySentAt: [],
    nearbySitWeekSentAt: [],
  })
  assertEquals(r.action, "send")
})

Deno.test("sitter-daily-digest — une alerte deja partie ne bloque pas le recapitulatif", () => {
  const alertSentAt = "2026-01-15T09:00:00.000Z"
  const r = decideDeferral({
    now: ACTIVE_HOUR,
    templateName: "sitter-daily-digest",
    category: "alert",
    hourSentAt: [],
    daySentAt: [alertSentAt],
    alertDaySentAt: [],
    alertWeekSentAt: [],
    nearbySitDaySentAt: [alertSentAt],
    nearbySitWeekSentAt: [alertSentAt],
  })
  assertEquals(r.action, "send")
})

Deno.test("nearby-sit-alert — plafond propre de 3 par jour", () => {
  const three = [
    "2026-01-15T06:00:00.000Z",
    "2026-01-15T08:00:00.000Z",
    "2026-01-15T10:00:00.000Z",
  ]
  const r = decideDeferral({
    now: ACTIVE_HOUR,
    templateName: "nearby-sit-alert",
    category: "alert",
    hourSentAt: [],
    daySentAt: three,
    nearbySitDaySentAt: three,
    nearbySitWeekSentAt: three,
  })
  assertEquals(r.action, "defer")
})

Deno.test("nearby-sit-alert — aucun report ne peut depasser la TTL du gabarit", () => {
  const ttlMs = TEMPLATE_TTL_HOURS["nearby-sit-alert"] * 3600_000
  const day = Array.from({ length: CAP_NEARBY_SIT_PER_DAY }, (_, i) =>
    new Date(ACTIVE_HOUR.getTime() - (i + 1) * 60_000).toISOString()).reverse()
  const week = Array.from({ length: CAP_NEARBY_SIT_PER_WEEK }, (_, i) =>
    new Date(ACTIVE_HOUR.getTime() - (i + 1) * 60_000).toISOString()).reverse()
  for (const counters of [{ day, week: day }, { day, week }]) {
    const r = decideDeferral({
      now: ACTIVE_HOUR,
      templateName: "nearby-sit-alert",
      category: "alert",
      hourSentAt: [],
      daySentAt: [],
      nearbySitDaySentAt: counters.day,
      nearbySitWeekSentAt: counters.week,
    })
    assertEquals(r.action, "defer")
    if (r.action === "defer") {
      // Jitter appelant de 900 s au maximum inclus dans la marge.
      const delta = r.scheduledFor.getTime() + 900_000 - ACTIVE_HOUR.getTime()
      assert(delta < ttlMs, `report ${delta}ms >= TTL ${ttlMs}ms`)
      const resolution = resolveDeferral({
        templateName: "nearby-sit-alert",
        reason: r.reason,
        scheduledFor: new Date(r.scheduledFor.getTime() + 900_000),
        firstEnqueuedAt: ACTIVE_HOUR,
      })
      assertEquals(resolution.action, "enqueue")
    }
  }
})
