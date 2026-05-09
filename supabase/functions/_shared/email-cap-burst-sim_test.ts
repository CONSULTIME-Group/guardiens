// Simulation de pics d'envoi pour vérifier :
//  1. report correct via decideDeferral (cap 1/h, 3/j, quiet hours)
//  2. flush-deferred-emails (re-évaluation au moment du scheduled_for) ne crée pas de doublons
//
// Modèle in-memory : reproduit fidèlement le comportement de
//  - send-transactional-email (insert email_send_log status=sent OU defer)
//  - flush-deferred-emails    (drain due rows, re-call sender, mark row "sent")
// Idempotence : la même idempotency_key ne doit jamais aboutir à 2 lignes status=sent.

import { assert, assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts'
import { decideDeferral } from './email-cap.ts'

// ── In-memory stores ─────────────────────────────────────────
interface SendLogRow {
  message_id: string
  idempotency_key: string | null
  recipient: string
  template: string
  status: 'sent' | 'deferred'
  created_at: Date
}
interface QueueRow {
  id: string
  idempotency_key: string
  recipient: string
  template: string
  scheduled_for: Date
  status: 'pending' | 'sent' | 'failed'
  reason: string
  attempts: number
  isUrgent: boolean
}

class FakeSystem {
  sendLog: SendLogRow[] = []
  queue: QueueRow[] = []
  private seq = 0

  private newId(prefix: string) {
    this.seq += 1
    return `${prefix}-${this.seq}`
  }

  /** Mirrors send-transactional-email entry point. */
  send(now: Date, recipient: string, template: string, idempotencyKey: string, isUrgent = false) {
    const recipientLower = recipient.toLowerCase()

    // Idempotence : si une ligne sent existe déjà pour cette clé → no-op (= comportement
    // souhaité, le client a déjà été servi par un appel antérieur).
    if (
      this.sendLog.some(
        (r) => r.idempotency_key === idempotencyKey && r.status === 'sent',
      )
    ) {
      return { result: 'idempotent_hit' as const }
    }

    // Récupère l'historique "sent" du destinataire (last 1h / 24h).
    const oneHourAgo = now.getTime() - 3600_000
    const oneDayAgo = now.getTime() - 86400_000
    const hourSent = this.sendLog
      .filter(
        (r) =>
          r.recipient === recipientLower &&
          r.status === 'sent' &&
          r.created_at.getTime() >= oneHourAgo,
      )
      .sort((a, b) => a.created_at.getTime() - b.created_at.getTime())
      .map((r) => r.created_at.toISOString())
    const daySent = this.sendLog
      .filter(
        (r) =>
          r.recipient === recipientLower &&
          r.status === 'sent' &&
          r.created_at.getTime() >= oneDayAgo,
      )
      .sort((a, b) => a.created_at.getTime() - b.created_at.getTime())
      .map((r) => r.created_at.toISOString())

    const decision = decideDeferral({
      now,
      templateName: template,
      isUrgent,
      hourSentAt: hourSent,
      daySentAt: daySent,
    })

    if (decision.action === 'send') {
      this.sendLog.push({
        message_id: this.newId('msg'),
        idempotency_key: idempotencyKey,
        recipient: recipientLower,
        template,
        status: 'sent',
        created_at: now,
      })
      return { result: 'sent' as const }
    }

    // Defer : insert queue row si la idempotency_key n'est pas déjà en attente.
    const existing = this.queue.find(
      (q) => q.idempotency_key === idempotencyKey && q.status === 'pending',
    )
    if (existing) {
      // Re-evaluation pendant flush : on recalcule scheduled_for sur la nouvelle ligne
      // de queue (= pas de doublon), on supersede l'ancienne (mark sent → "consumed").
      existing.status = 'sent'
    }
    this.queue.push({
      id: this.newId('q'),
      idempotency_key: idempotencyKey,
      recipient: recipientLower,
      template,
      scheduled_for: decision.scheduledFor,
      status: 'pending',
      reason: decision.reason,
      attempts: 0,
      isUrgent,
    })
    this.sendLog.push({
      message_id: this.newId('msg'),
      idempotency_key: idempotencyKey,
      recipient: recipientLower,
      template,
      status: 'deferred',
      created_at: now,
    })
    return { result: 'deferred' as const, scheduledFor: decision.scheduledFor }
  }

  /** Mirrors flush-deferred-emails. */
  flush(now: Date) {
    const due = this.queue
      .filter((q) => q.status === 'pending' && q.scheduled_for.getTime() <= now.getTime())
      .sort((a, b) => a.scheduled_for.getTime() - b.scheduled_for.getTime())

    let sent = 0
    let redeferred = 0
    for (const row of due) {
      row.attempts += 1
      const r = this.send(now, row.recipient, row.template, row.idempotency_key, row.isUrgent)
      if (r.result === 'sent') {
        // Marque la row comme "sent" (consumed). La nouvelle ligne send_log status=sent
        // a déjà été créée par send().
        row.status = 'sent'
        sent += 1
      } else if (r.result === 'deferred') {
        // Re-defer : send() a déjà inséré une nouvelle queue row + marqué l'ancienne sent.
        redeferred += 1
      } else {
        // idempotent_hit : déjà envoyée → mark sent
        row.status = 'sent'
      }
    }
    return { processed: due.length, sent, redeferred }
  }

  // Helpers d'inspection
  sentRows() {
    return this.sendLog.filter((r) => r.status === 'sent')
  }
  countSentByKey(key: string) {
    return this.sentRows().filter((r) => r.idempotency_key === key).length
  }
}

// ─── Helpers temps Paris ─────────────────────────────────────
function parisAt(yyyyMmDd: string, hour: number, minute = 0): Date {
  const [y, m, d] = yyyyMmDd.split('-').map(Number)
  for (const off of [1, 2]) {
    const cand = new Date(Date.UTC(y, m - 1, d, hour - off, minute, 0))
    const fmt = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Europe/Paris',
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', hour12: false,
    }).formatToParts(cand)
    const get = (t: string) => fmt.find((p) => p.type === t)!.value
    if (
      parseInt(get('year'), 10) === y &&
      parseInt(get('month'), 10) === m &&
      parseInt(get('day'), 10) === d &&
      parseInt(get('hour'), 10) === hour &&
      parseInt(get('minute'), 10) === minute
    ) return cand
  }
  throw new Error('time')
}

// =============================================================
// SIM 1 — Pic en heure active : 5 envois en 30 secondes
// Attendu : 1 envoyé immédiat, 4 reportés (cap 1/h)
// Aucun doublon (par idempotency_key).
// =============================================================
Deno.test('SIM 1 — burst 5×30s en heure active : 1 sent, 4 deferred, no dup', () => {
  const sys = new FakeSystem()
  const start = parisAt('2026-01-15', 14)
  const recipient = 'user@example.com'
  for (let i = 0; i < 5; i++) {
    sys.send(new Date(start.getTime() + i * 6_000), recipient, 'review-reminder', `key-${i}`)
  }

  const sent = sys.sentRows()
  assertEquals(sent.length, 1, 'un seul envoi immédiat (cap 1/h)')
  assertEquals(sys.queue.filter((q) => q.status === 'pending').length, 4)
  // No duplicate per key
  for (let i = 0; i < 5; i++) {
    assert(sys.countSentByKey(`key-${i}`) <= 1, `clé key-${i} envoyée plusieurs fois`)
  }
})

// =============================================================
// SIM 2 — Flush respecte le cap : drain 4 due → 1 nouveau sent + 3 re-defer
// =============================================================
Deno.test('SIM 2 — flush au +1h ne casse PAS le cap, 1 sent + 3 redéfer', () => {
  const sys = new FakeSystem()
  const start = parisAt('2026-01-15', 14)
  const recipient = 'user@example.com'
  for (let i = 0; i < 5; i++) {
    sys.send(new Date(start.getTime() + i * 6_000), recipient, 'review-reminder', `key-${i}`)
  }
  // Avance à T+1h05 → toutes les queue rows initiales sont dues
  const flushAt = new Date(start.getTime() + 65 * 60_000)
  const r = sys.flush(flushAt)

  assertEquals(r.processed, 4)
  assertEquals(r.sent, 1, 'flush envoie 1 (cap respecté)')
  assertEquals(r.redeferred, 3)

  // Total sent = 2 distincts (initial + 1 du flush)
  assertEquals(sys.sentRows().length, 2)
  // Pas de doublon
  const seen = new Set<string>()
  for (const row of sys.sentRows()) {
    assert(!seen.has(row.idempotency_key!), `doublon sur ${row.idempotency_key}`)
    seen.add(row.idempotency_key!)
  }
})

// =============================================================
// SIM 3 — Drain complet sur 24h : 5 envois → exactement 3 atteindront sent
// (cap journalier = 3). Les 2 restants doivent être en queue ou re-deferred.
// =============================================================
Deno.test('SIM 3 — drain 24h : exactement 3 envoyés (cap jour=3), 2 reportés', () => {
  const sys = new FakeSystem()
  const start = parisAt('2026-01-15', 9) // matin actif
  const recipient = 'user@example.com'
  for (let i = 0; i < 5; i++) {
    sys.send(new Date(start.getTime() + i * 6_000), recipient, 'review-reminder', `k${i}`)
  }
  // Flush toutes les heures pendant 24h
  for (let h = 1; h <= 24; h++) {
    const t = new Date(start.getTime() + h * 3600_000)
    sys.flush(t)
  }
  const sent = sys.sentRows()
  assertEquals(sent.length, 3, 'cap journalier = 3 respecté')

  // Aucun doublon par clé
  const counts = new Map<string, number>()
  for (const r of sent) counts.set(r.idempotency_key!, (counts.get(r.idempotency_key!) ?? 0) + 1)
  for (const [k, n] of counts) assertEquals(n, 1, `clé ${k} envoyée ${n} fois`)
})

// =============================================================
// SIM 4 — Quiet hours : envoi à 23h reporté à 08h le lendemain
// =============================================================
Deno.test('SIM 4 — pic en quiet hours : tout reporté à 08:00, flush à 08:01 envoie 1', () => {
  const sys = new FakeSystem()
  const start = parisAt('2026-01-15', 23) // quiet
  const recipient = 'user@example.com'
  for (let i = 0; i < 3; i++) {
    sys.send(new Date(start.getTime() + i * 60_000), recipient, 'review-reminder', `q${i}`)
  }
  assertEquals(sys.sentRows().length, 0, 'aucun envoi en quiet hours')
  assertEquals(sys.queue.filter((q) => q.status === 'pending').length, 3)

  // Flush à 08:01 le lendemain
  const flushAt = new Date(parisAt('2026-01-16', 8, 1).getTime())
  const r = sys.flush(flushAt)
  assertEquals(r.processed, 3)
  assertEquals(r.sent, 1, '1 envoyé (cap horaire)')
  assertEquals(r.redeferred, 2)
  assertEquals(sys.sentRows().length, 1)
})

// =============================================================
// SIM 5 — Idempotence stricte : retry du MÊME idempotency_key
// (cas réel : worker rejoue un message après timeout réseau)
// =============================================================
Deno.test('SIM 5 — même idempotency_key rejouée 10× : 1 seul envoi', () => {
  const sys = new FakeSystem()
  const t = parisAt('2026-01-15', 14)
  for (let i = 0; i < 10; i++) {
    sys.send(new Date(t.getTime() + i * 1000), 'user@x.com', 'review-reminder', 'same-key')
  }
  assertEquals(sys.countSentByKey('same-key'), 1, 'idempotence violée')
  // Et la queue ne doit pas exploser non plus (replays sur clé déjà sent → no-op)
  assertEquals(sys.queue.filter((q) => q.status === 'pending').length, 0)
})

// =============================================================
// SIM 6 — Stress : 50 destinataires distincts, 1 envoi chacun → tous passent
// (le cap est par destinataire, pas global)
// =============================================================
Deno.test('SIM 6 — 50 destinataires distincts : tous envoyés immédiatement', () => {
  const sys = new FakeSystem()
  const t = parisAt('2026-01-15', 14)
  for (let i = 0; i < 50; i++) {
    sys.send(new Date(t.getTime() + i * 100), `user${i}@x.com`, 'review-reminder', `bulk-${i}`)
  }
  assertEquals(sys.sentRows().length, 50)
  assertEquals(sys.queue.length, 0)
})

// =============================================================
// SIM 7 — __urgent pendant quiet hours : envoi immédiat, queue vide
// =============================================================
Deno.test('SIM 7 — __urgent à 23h Paris : envoyé immédiatement, aucune ligne en queue', () => {
  const sys = new FakeSystem()
  const t = parisAt('2026-01-15', 23) // quiet hours
  const r = sys.send(t, 'user@x.com', 'review-reminder', 'urgent-quiet', true)

  assertEquals(r.result, 'sent')
  assertEquals(sys.sentRows().length, 1)
  assertEquals(sys.queue.length, 0, 'aucune insertion dans la file différée')
})

// =============================================================
// SIM 8 — __urgent avec cap horaire dépassé : envoi immédiat, queue vide
// =============================================================
Deno.test('SIM 8 — __urgent avec cap horaire saturé : envoyé immédiatement, queue vide', () => {
  const sys = new FakeSystem()
  const t = parisAt('2026-01-15', 14) // heure active
  // Saturation du cap horaire : 1 envoi normal, le suivant dans la même heure est defer
  sys.send(t, 'user@x.com', 'review-reminder', 'normal-1')
  const rNormal = sys.send(new Date(t.getTime() + 1000), 'user@x.com', 'review-reminder', 'normal-2')
  assertEquals(rNormal.result, 'deferred')

  // Même destinataire, même template, mais urgent → passe
  const rUrgent = sys.send(new Date(t.getTime() + 2000), 'user@x.com', 'review-reminder', 'urgent-cap', true)
  assertEquals(rUrgent.result, 'sent')
  assertEquals(sys.queue.filter((q) => q.status === 'pending').length, 1, 'seul normal-2 en queue')
  assertEquals(sys.sentRows().length, 2, '2 sent total (normal-1 + urgent-cap)')
})

// =============================================================
// SIM 9 — __urgent avec cap journalier dépassé : envoi immédiat, queue vide
// =============================================================
Deno.test('SIM 9 — __urgent avec cap journalier saturé : envoyé immédiatement, queue vide', () => {
  const sys = new FakeSystem()
  const t = parisAt('2026-01-15', 10) // heure active
  // 3 envois normaux pour saturer le cap journalier
  for (let i = 0; i < 3; i++) {
    sys.send(new Date(t.getTime() + i * 1000), 'user@x.com', 'review-reminder', `day-${i}`)
  }
  assertEquals(sys.sentRows().length, 3)

  // 4e envoi normal → defer (cap jour)
  const rNormal = sys.send(new Date(t.getTime() + 4000), 'user@x.com', 'review-reminder', 'day-3')
  assertEquals(rNormal.result, 'deferred')

  // Urgent → passe
  const rUrgent = sys.send(new Date(t.getTime() + 5000), 'user@x.com', 'review-reminder', 'urgent-day', true)
  assertEquals(rUrgent.result, 'sent')
  assertEquals(sys.queue.filter((q) => q.status === 'pending').length, 1)
  assertEquals(sys.sentRows().length, 4)
})

// =============================================================
// SIM 10 — Bypass template (identity-verified) pendant quiet hours
// =============================================================
Deno.test('SIM 10 — bypass template en quiet hours : envoyé immédiatement, queue vide', () => {
  const sys = new FakeSystem()
  const t = parisAt('2026-01-15', 23) // quiet hours
  const r = sys.send(t, 'user@x.com', 'identity-verified', 'bypass-quiet')

  assertEquals(r.result, 'sent')
  assertEquals(sys.sentRows().length, 1)
  assertEquals(sys.queue.length, 0, 'aucune insertion dans la file différée pour bypass template')
})
