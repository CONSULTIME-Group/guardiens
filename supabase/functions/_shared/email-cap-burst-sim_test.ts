// Simulation de pics d'envoi pour vérifier :
//  1. report correct via decideDeferral (doctrine 02/08/2026 : aucun plafond de
//     fréquence pour la catégorie 'transactional', 1 / 24h et 3 / 7 jours pour
//     les catégories product, digest et alert, heures calmes pour tout le monde)
//  2. flush-deferred-emails (re-évaluation au moment du scheduled_for) ne crée pas de doublons
//
// Chaque simulation passe explicitement une catégorie à decideDeferral. Une
// catégorie absente retomberait sur 'product' avec un avertissement console.
//
// Modèle in-memory : reproduit fidèlement le comportement de
//  - send-transactional-email (insert email_send_log status=sent OU defer)
//  - flush-deferred-emails    (drain due rows, re-call sender, mark row "sent")
// Idempotence : la même idempotency_key ne doit jamais aboutir à 2 lignes status=sent.

import { assert, assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts'
import { decideDeferral, NEARBY_SIT_ALERT_TEMPLATES } from './email-cap.ts'

type Category = 'transactional' | 'product' | 'digest' | 'alert'

// ── In-memory stores ─────────────────────────────────────────
interface SendLogRow {
  message_id: string
  idempotency_key: string | null
  recipient: string
  template: string
  category: Category
  status: 'sent' | 'deferred'
  created_at: Date
}
interface QueueRow {
  id: string
  idempotency_key: string
  recipient: string
  template: string
  category: Category
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
  send(
    now: Date,
    recipient: string,
    template: string,
    idempotencyKey: string,
    isUrgent = false,
    category: Category = 'product',
  ) {
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

    // Historique "sent" du destinataire. Les compteurs qui pilotent la decision
    // sont ceux des categories NON transactionnelles (1 / 24h, 3 / 7 jours).
    const oneHourAgo = now.getTime() - 3600_000
    const oneDayAgo = now.getTime() - 86400_000
    const oneWeekAgo = now.getTime() - 7 * 86400_000
    const sentFor = (since: number, nonTxOnly: boolean) =>
      this.sendLog
        .filter(
          (r) =>
            r.recipient === recipientLower &&
            r.status === 'sent' &&
            r.created_at.getTime() >= since &&
            (!nonTxOnly || r.category !== 'transactional'),
        )
        .sort((a, b) => a.created_at.getTime() - b.created_at.getTime())
        .map((r) => r.created_at.toISOString())

    // Miroir exact du sender : la categorie 'alert' a son compteur, et
    // 'nearby-sit-alert' a le sien, distinct du quota partage.
    const rowsSince = (since: number, keep: (r: SendLogRow) => boolean) =>
      this.sendLog
        .filter(
          (r) =>
            r.recipient === recipientLower &&
            r.status === 'sent' &&
            r.created_at.getTime() >= since &&
            r.category !== 'transactional' &&
            keep(r),
        )
        .sort((a, b) => a.created_at.getTime() - b.created_at.getTime())
        .map((r) => r.created_at.toISOString())
    const isNearby = (r: SendLogRow) => NEARBY_SIT_ALERT_TEMPLATES.has(r.template)
    const isAlert = (r: SendLogRow) => r.category === 'alert' && !isNearby(r)
    const isProduct = (r: SendLogRow) => r.category !== 'alert' && !isNearby(r)

    const decision = decideDeferral({
      now,
      templateName: template,
      isUrgent,
      category,
      hourSentAt: sentFor(oneHourAgo, false),
      daySentAt: sentFor(oneDayAgo, false),
      nonTxDaySentAt: rowsSince(oneDayAgo, isProduct),
      nonTxWeekSentAt: rowsSince(oneWeekAgo, isProduct),
      alertDaySentAt: rowsSince(oneDayAgo, isAlert),
      alertWeekSentAt: rowsSince(oneWeekAgo, isAlert),
      nearbySitDaySentAt: rowsSince(oneDayAgo, isNearby),
      nearbySitWeekSentAt: rowsSince(oneWeekAgo, isNearby),
    })

    if (decision.action === 'send') {
      this.sendLog.push({
        message_id: this.newId('msg'),
        idempotency_key: idempotencyKey,
        recipient: recipientLower,
        template,
        category,
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
      category,
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
      category,
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
      const r = this.send(now, row.recipient, row.template, row.idempotency_key, row.isUrgent, row.category)
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
// SIM 1 — Pic en heure active, catégorie product : 5 envois en 30 secondes
// Attendu : 1 envoyé immédiat, 4 reportés (cap catégorie 1 / 24h)
// Aucun doublon (par idempotency_key).
// =============================================================
Deno.test('SIM 1 — burst product 5×30s en heure active : 1 sent, 4 deferred, no dup', () => {
  const sys = new FakeSystem()
  const start = parisAt('2026-01-15', 14)
  const recipient = 'user@example.com'
  for (let i = 0; i < 5; i++) {
    sys.send(new Date(start.getTime() + i * 6_000), recipient, 'review-reminder', `key-${i}`, false, 'product')
  }

  const sent = sys.sentRows()
  assertEquals(sent.length, 1, 'un seul envoi immédiat (cap catégorie 1 / 24h)')
  assertEquals(sys.queue.filter((q) => q.status === 'pending').length, 4)
  assertEquals(sys.queue[0].reason, 'frequency_cap_category_day')
  // No duplicate per key
  for (let i = 0; i < 5; i++) {
    assert(sys.countSentByKey(`key-${i}`) <= 1, `clé key-${i} envoyée plusieurs fois`)
  }
})

// =============================================================
// SIM 1bis — Même pic, mais catégorie transactionnelle : AUCUN plafond.
// Doctrine 02/08/2026 : un email déclenché par l'action directe d'un membre
// n'est jamais du spam, il part même si l'heure est déjà chargée.
// =============================================================
Deno.test('SIM 1bis — burst transactionnel 5×30s : les 5 partent, aucune ligne différée', () => {
  const sys = new FakeSystem()
  const start = parisAt('2026-01-15', 14)
  const recipient = 'user@example.com'
  for (let i = 0; i < 5; i++) {
    sys.send(new Date(start.getTime() + i * 6_000), recipient, 'new-message', `tx-${i}`, false, 'transactional')
  }

  assertEquals(sys.sentRows().length, 5, 'aucun plafond de fréquence sur le transactionnel')
  assertEquals(sys.queue.length, 0, 'aucune ligne dans la file différée')
})

// =============================================================
// SIM 2 — Flush respecte le cap catégorie : drain 4 due à J+1
// → 1 nouveau sent + 3 re-defer
// =============================================================
Deno.test('SIM 2 — flush à J+1 ne casse PAS le cap catégorie, 1 sent + 3 redéfer', () => {
  const sys = new FakeSystem()
  const start = parisAt('2026-01-15', 14)
  const recipient = 'user@example.com'
  for (let i = 0; i < 5; i++) {
    sys.send(new Date(start.getTime() + i * 6_000), recipient, 'review-reminder', `key-${i}`, false, 'product')
  }
  // Avance à T+24h05 → toutes les queue rows initiales sont dues
  const flushAt = new Date(start.getTime() + 24 * 3600_000 + 5 * 60_000)
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
// SIM 3 — Drain sur 24h, catégorie product : le cap est de 1 / 24h, donc
// un seul email atteint le destinataire sur la fenêtre, les 4 autres restent
// en attente et ne se dupliquent jamais.
// =============================================================
Deno.test('SIM 3 — drain 24h product : exactement 1 envoyé (cap 1 / 24h), 4 en attente', () => {
  const sys = new FakeSystem()
  const start = parisAt('2026-01-15', 9) // matin actif
  const recipient = 'user@example.com'
  for (let i = 0; i < 5; i++) {
    sys.send(new Date(start.getTime() + i * 6_000), recipient, 'review-reminder', `k${i}`, false, 'product')
  }
  // Flush toutes les heures pendant 24h
  for (let h = 1; h <= 24; h++) {
    const t = new Date(start.getTime() + h * 3600_000)
    sys.flush(t)
  }
  const sent = sys.sentRows()
  assertEquals(sent.length, 1, 'cap catégorie 1 / 24h respecté')
  assertEquals(sys.queue.filter((q) => q.status === 'pending').length, 4)

  // Aucun doublon par clé
  const counts = new Map<string, number>()
  for (const r of sent) counts.set(r.idempotency_key!, (counts.get(r.idempotency_key!) ?? 0) + 1)
  for (const [k, n] of counts) assertEquals(n, 1, `clé ${k} envoyée ${n} fois`)
})

// =============================================================
// SIM 4 — Quiet hours : envoi à 23h reporté à 08h le lendemain
// =============================================================
Deno.test('SIM 4 — pic product en quiet hours : tout reporté à 08:00, flush à 08:01 envoie 1', () => {
  const sys = new FakeSystem()
  const start = parisAt('2026-01-15', 23) // quiet
  const recipient = 'user@example.com'
  for (let i = 0; i < 3; i++) {
    sys.send(new Date(start.getTime() + i * 60_000), recipient, 'review-reminder', `q${i}`, false, 'product')
  }
  assertEquals(sys.sentRows().length, 0, 'aucun envoi en quiet hours')
  assertEquals(sys.queue.filter((q) => q.status === 'pending').length, 3)

  // Flush à 08:01 le lendemain
  const flushAt = new Date(parisAt('2026-01-16', 8, 1).getTime())
  const r = sys.flush(flushAt)
  assertEquals(r.processed, 3)
  assertEquals(r.sent, 1, '1 envoyé (cap catégorie 1 / 24h)')
  assertEquals(r.redeferred, 2)
  assertEquals(sys.sentRows().length, 1)
})

// =============================================================
// SIM 4bis — Transactionnel en quiet hours : différé quand même, puis TOUT
// part au premier flush de 08:01, sans plafond de fréquence.
// =============================================================
Deno.test('SIM 4bis — transactionnel en quiet hours : reporté à 08:00 puis les 3 partent', () => {
  const sys = new FakeSystem()
  const start = parisAt('2026-01-15', 23)
  const recipient = 'user@example.com'
  for (let i = 0; i < 3; i++) {
    sys.send(new Date(start.getTime() + i * 60_000), recipient, 'new-message', `txq${i}`, false, 'transactional')
  }
  assertEquals(sys.sentRows().length, 0, 'on ne réveille personne la nuit')
  assertEquals(sys.queue.filter((q) => q.status === 'pending').length, 3)
  assertEquals(sys.queue[0].reason, 'quiet_hours')

  const r = sys.flush(new Date(parisAt('2026-01-16', 8, 1).getTime()))
  assertEquals(r.processed, 3)
  assertEquals(r.sent, 3, 'aucun plafond de fréquence sur le transactionnel')
  assertEquals(r.redeferred, 0)
  assertEquals(sys.queue.filter((q) => q.status === 'pending').length, 0)
})

// =============================================================
// SIM 5 — Idempotence stricte : retry du MÊME idempotency_key
// (cas réel : worker rejoue un message après timeout réseau)
// =============================================================
Deno.test('SIM 5 — même idempotency_key rejouée 10× : 1 seul envoi', () => {
  const sys = new FakeSystem()
  const t = parisAt('2026-01-15', 14)
  for (let i = 0; i < 10; i++) {
    sys.send(new Date(t.getTime() + i * 1000), 'user@x.com', 'review-reminder', 'same-key', false, 'product')
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
    sys.send(new Date(t.getTime() + i * 100), `user${i}@x.com`, 'review-reminder', `bulk-${i}`, false, 'product')
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
  const r = sys.send(t, 'user@x.com', 'review-reminder', 'urgent-quiet', true, 'product')

  assertEquals(r.result, 'sent')
  assertEquals(sys.sentRows().length, 1)
  assertEquals(sys.queue.length, 0, 'aucune insertion dans la file différée')
})

// =============================================================
// SIM 8 — __urgent avec cap journalier catégorie saturé : envoi immédiat
// =============================================================
Deno.test('SIM 8 — __urgent avec cap catégorie 1 / 24h saturé : envoyé immédiatement', () => {
  const sys = new FakeSystem()
  const t = parisAt('2026-01-15', 14) // heure active
  // Saturation du cap catégorie : 1 envoi product, le suivant dans les 24h est defer
  sys.send(t, 'user@x.com', 'review-reminder', 'normal-1', false, 'product')
  const rNormal = sys.send(new Date(t.getTime() + 1000), 'user@x.com', 'review-reminder', 'normal-2', false, 'product')
  assertEquals(rNormal.result, 'deferred')

  // Même destinataire, même template, mais urgent → passe
  const rUrgent = sys.send(new Date(t.getTime() + 2000), 'user@x.com', 'review-reminder', 'urgent-cap', true, 'product')
  assertEquals(rUrgent.result, 'sent')
  assertEquals(sys.queue.filter((q) => q.status === 'pending').length, 1, 'seul normal-2 en queue')
  assertEquals(sys.sentRows().length, 2, '2 sent total (normal-1 + urgent-cap)')
})

// =============================================================
// SIM 9 — Cap hebdomadaire catégorie (3 / 7 jours), toutes catégories non
// transactionnelles confondues : product, digest et alert partagent le compteur.
// L'urgent passe malgré la saturation.
// =============================================================
Deno.test('SIM 9 — cap 3 / 7 jours partagé product+digest+alert, urgent exempté', () => {
  const sys = new FakeSystem()
  const t = parisAt('2026-01-15', 10) // heure active
  // 3 envois non transactionnels espacés de 25h : le cap 1 / 24h n'est jamais touché
  sys.send(t, 'user@x.com', 'review-reminder', 'w-0', false, 'product')
  sys.send(new Date(t.getTime() + 25 * 3600_000), 'user@x.com', 'weekly-digest', 'w-1', false, 'digest')
  sys.send(new Date(t.getTime() + 50 * 3600_000), 'user@x.com', 'new-listing-alert', 'w-2', false, 'alert')
  assertEquals(sys.sentRows().length, 3)

  // 4e envoi non transactionnel dans la fenêtre de 7 jours → defer (cap semaine)
  const rNormal = sys.send(new Date(t.getTime() + 75 * 3600_000), 'user@x.com', 'review-reminder', 'w-3', false, 'product')
  assertEquals(rNormal.result, 'deferred')
  assertEquals(sys.queue[0].reason, 'frequency_cap_category_week')

  // Urgent → passe
  const rUrgent = sys.send(new Date(t.getTime() + 75 * 3600_000 + 2000), 'user@x.com', 'review-reminder', 'urgent-week', true, 'product')
  assertEquals(rUrgent.result, 'sent')
  assertEquals(sys.queue.filter((q) => q.status === 'pending').length, 1)
  assertEquals(sys.sentRows().length, 4)
})

// =============================================================
// SIM 9bis — Le compteur non transactionnel ignore les transactionnels :
// une salve de messages humains ne consomme jamais le quota d'un digest.
// =============================================================
Deno.test('SIM 9bis — 5 transactionnels puis 1 digest : le digest part quand même', () => {
  const sys = new FakeSystem()
  const t = parisAt('2026-01-15', 10)
  for (let i = 0; i < 5; i++) {
    sys.send(new Date(t.getTime() + i * 60_000), 'user@x.com', 'new-message', `mix-tx-${i}`, false, 'transactional')
  }
  const r = sys.send(new Date(t.getTime() + 10 * 60_000), 'user@x.com', 'weekly-digest', 'mix-digest', false, 'digest')
  assertEquals(r.result, 'sent', 'les transactionnels ne consomment pas le quota catégorie')
  assertEquals(sys.sentRows().length, 6)
})

// =============================================================
// SIM 10 — Bypass template (identity-verified) pendant quiet hours
// =============================================================
Deno.test('SIM 10 — bypass template en quiet hours : envoyé immédiatement, queue vide', () => {
  const sys = new FakeSystem()
  const t = parisAt('2026-01-15', 23) // quiet hours
  const r = sys.send(t, 'user@x.com', 'identity-verified', 'bypass-quiet', false, 'transactional')

  assertEquals(r.result, 'sent')
  assertEquals(sys.sentRows().length, 1)
  assertEquals(sys.queue.length, 0, 'aucune insertion dans la file différée pour bypass template')
})


// =============================================================
// SIM 11 — Anti-régression bug prod (2026-07-23) :
// Deux lignes 'pending' pour le MÊME destinataire arrivent à échéance dans
// le même run de flush. La 1re part. Pour la 2e, le cap horaire vient de
// retomber → send-transactional-email tente d'insérer une nouvelle ligne
// différée mais sa garde "already_queued" ne doit PAS se déclencher sur
// la ligne source (celle en cours de retraitement, toujours 'pending').
// Sans le fix : la 2e ligne était marquée 'sent' sans email envoyé.
// Avec le fix (sourceQueueId exclu) : la 2e ligne est correctement
// re-différée et repartira au prochain flush.
// =============================================================
Deno.test('SIM 11 — flush 2 lignes dues même destinataire : 1 envoyée, 1 re-différée (pas clôturée en fantôme)', () => {
  // Fake dédié modélisant fidèlement la garde "already_queued" côté prod
  // + le support du sourceQueueId.
  interface Row {
    id: string
    idempotency_key: string
    recipient: string
    template: string
    scheduled_for: Date
    status: 'pending' | 'sent' | 'failed'
  }
  const CAP_HOUR = 1
  const sendLog: { recipient: string; created_at: Date; status: 'sent' }[] = []
  const queue: Row[] = []
  let seq = 0
  const nid = (p: string) => `${p}-${++seq}`

  // Mirror strict de send-transactional-email pour cette régression.
  function send(
    now: Date,
    recipient: string,
    template: string,
    idempotencyKey: string,
    sourceQueueId: string | null = null,
  ): { result: 'sent' } | { result: 'deferred'; queueId: string } | { result: 'already_queued' } {
    const hourAgo = now.getTime() - 3600_000
    const hourSent = sendLog.filter(
      (r) => r.recipient === recipient && r.status === 'sent' && r.created_at.getTime() >= hourAgo,
    )
    if (hourSent.length >= CAP_HOUR) {
      // Garde anti-doublon prod, avec exclusion sourceQueueId.
      const existing = queue.find(
        (q) =>
          q.idempotency_key === idempotencyKey &&
          q.template === template &&
          (q.status === 'pending' || q.status === 'sent') &&
          q.id !== sourceQueueId,
      )
      if (existing) {
        return { result: 'already_queued' }
      }
      const scheduled = new Date(hourSent[0].created_at.getTime() + 3600_000 + 30_000)
      const row: Row = {
        id: nid('q'),
        idempotency_key: idempotencyKey,
        recipient,
        template,
        scheduled_for: scheduled,
        status: 'pending',
      }
      queue.push(row)
      return { result: 'deferred', queueId: row.id }
    }
    sendLog.push({ recipient, created_at: now, status: 'sent' })
    return { result: 'sent' }
  }

  // Mirror flush-deferred-emails.
  function flush(now: Date) {
    const due = queue
      .filter((q) => q.status === 'pending' && q.scheduled_for.getTime() <= now.getTime())
      .sort((a, b) => a.scheduled_for.getTime() - b.scheduled_for.getTime())
    let sent = 0, redeferred = 0, ghosted = 0
    for (const row of due) {
      const r = send(now, row.recipient, row.template, row.idempotency_key, row.id)
      if (r.result === 'sent') {
        row.status = 'sent'
        sent++
      } else if (r.result === 'deferred') {
        // Le sender a inséré une NOUVELLE ligne : la source peut être clôturée.
        row.status = 'sent'
        redeferred++
      } else {
        // already_queued : flush clôture… mais s'il n'y a PAS de nouvelle ligne,
        // c'est une perte silencieuse (le bug de prod).
        row.status = 'sent'
        ghosted++
      }
    }
    return { processed: due.length, sent, redeferred, ghosted }
  }

  // Scénario : 2 lignes 'pending' même destinataire, mêmes échéances.
  const recipient = 'barbara@example.com'
  const flushAt = new Date('2026-07-23T06:00:00Z')
  const scheduledPast = new Date(flushAt.getTime() - 60_000)
  queue.push({
    id: nid('q'), idempotency_key: 'msg_A', recipient, template: 'new-message',
    scheduled_for: scheduledPast, status: 'pending',
  })
  queue.push({
    id: nid('q'), idempotency_key: 'msg_B', recipient, template: 'new-message',
    scheduled_for: scheduledPast, status: 'pending',
  })

  const r = flush(flushAt)

  assertEquals(r.processed, 2)
  assertEquals(r.sent, 1, '1 email réellement envoyé (cap horaire)')
  assertEquals(r.redeferred, 1, '1 ligne correctement re-différée dans une nouvelle row')
  assertEquals(r.ghosted, 0, 'aucune perte silencieuse (fix sourceQueueId opérant)')

  // Il DOIT rester une ligne pending pour le message non envoyé.
  const pending = queue.filter((q) => q.status === 'pending')
  assertEquals(pending.length, 1, 'une nouvelle ligne pending doit exister pour le retry')
  assert(
    pending[0].idempotency_key === 'msg_A' || pending[0].idempotency_key === 'msg_B',
    'la ligne pending doit reprendre une idempotency_key existante',
  )
  assert(
    pending[0].scheduled_for.getTime() > flushAt.getTime(),
    'la nouvelle ligne doit être planifiée dans le futur',
  )
})


// =============================================================
// SIM 12 — Scenario du 03 au 04/08/2026 : le recapitulatif quotidien du matin
// ne doit plus detruire l'alerte de nouvelle annonce de l'apres-midi.
// =============================================================
Deno.test("SIM 12 — recap du matin puis annonce l'apres-midi : les deux partent", () => {
  const sys = new FakeSystem()
  const morning = parisAt('2026-01-15', 7, 5) // cron recap, heure active
  const afternoon = parisAt('2026-01-15', 15) // publication d'une annonce

  const digest = sys.send(morning, 'gardien@x.com', 'sitter-daily-digest', 'digest-0', false, 'alert')
  assertEquals(digest.result, 'sent')

  const alerte = sys.send(afternoon, 'gardien@x.com', 'nearby-sit-alert', 'alert-0', false, 'alert')
  assertEquals(alerte.result, 'sent', "l'alerte de nouvelle annonce doit passer")

  assertEquals(sys.sentRows().length, 2)
  assertEquals(sys.queue.filter((q) => q.status === 'pending').length, 0)
})

// =============================================================
// SIM 13 — Reciproque : une alerte partie le matin ne bloque pas le
// recapitulatif, et le plafond propre de 3 alertes par jour tient.
// =============================================================
Deno.test('SIM 13 — 4 annonces dans la journee : 3 alertes envoyees, la 4e reportee', () => {
  const sys = new FakeSystem()
  const base = parisAt('2026-01-15', 9)
  const h = (n: number) => new Date(base.getTime() + n * 3600_000)

  assertEquals(sys.send(h(0), 'g@x.com', 'nearby-sit-alert', 'a-0', false, 'alert').result, 'sent')
  assertEquals(sys.send(h(1), 'g@x.com', 'nearby-sit-alert', 'a-1', false, 'alert').result, 'sent')
  assertEquals(sys.send(h(2), 'g@x.com', 'nearby-sit-alert', 'a-2', false, 'alert').result, 'sent')
  const fourth = sys.send(h(3), 'g@x.com', 'nearby-sit-alert', 'a-3', false, 'alert')
  assertEquals(fourth.result, 'deferred')

  // Le recapitulatif du lendemain matin passe malgre les 3 alertes de la veille.
  const digest = sys.send(h(21), 'g@x.com', 'sitter-daily-digest', 'd-0', false, 'alert')
  assertEquals(digest.result, 'sent')
})
