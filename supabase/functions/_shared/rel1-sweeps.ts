// Lot REL1 (12/11/2026) : trois balayages, livrés derrière deux drapeaux.
//
//   A  brouillon presque prêt          drapeau rel1_draft_almost_ready
//   B1 seconde relance du propriétaire drapeau rel1_owner_silent
//   B2 message au candidat et mention  drapeau rel1_owner_silent
//
// Drapeau éteint : le balayage calcule sa liste et la rend (mode simulation),
// sans email, sans notification, sans écriture. Les listes ne portent que des
// identifiants, jamais d'adresse.
//
// Module sans dépendance Deno : les appels réseau sont injectés, Vitest le lit.
import {
  noticeDayFor, ownerSilentNotification, ownerSilentVariant, parisDay,
} from './rel1-copy.ts'

export const REL1_FLAG_DRAFT = 'rel1_draft_almost_ready'
export const REL1_FLAG_SILENT = 'rel1_owner_silent'
export const ALMOST_READY_TEMPLATE = 'sit-draft-almost-ready'
export const SECOND_NUDGE_TEMPLATE = 'owner-pending-applications-second-nudge'
export const OWNER_SILENT_TEMPLATE = 'application-owner-silent'
export const REL1_MAX_PER_RUN = 25
export const SECOND_NUDGE_DAYS = 7
export const OWNER_SILENT_DAYS = 10
/** Délai annoncé au propriétaire dans la seconde relance avant le message aux candidats. */
export const OWNER_SILENT_GRACE_MS = 3 * 86400000

export const almostReadyKey = (sitId: string) => `sit-draft-almost-ready-${sitId}`
export const secondNudgeKey = (sitId: string) => `pending-apps-second-${sitId}`
export const ownerSilentKey = (applicationId: string) => `owner-silent-${applicationId}`

// deno-lint-ignore no-explicit-any
type Client = any
export type SendOutcome = 'sent' | 'deferred' | 'skipped' | 'failed'
export interface SendRequest {
  templateName: string
  recipientEmail: string
  idempotencyKey: string
  templateData: Record<string, unknown>
  logMetadata: Record<string, unknown>
}
export type SendEmail = (request: SendRequest) => Promise<{ outcome: SendOutcome; reason?: string | null }>

export async function readFlag(client: Client, key: string): Promise<boolean> {
  const { data, error } = await client.from('feature_flags').select('enabled').eq('key', key).maybeSingle()
  // Lecture en échec : drapeau tenu pour éteint (rien ne part).
  if (error) return false
  return data?.enabled === true
}

// ── A. Brouillon presque prêt ─────────────────────────────────────────────

export interface AlmostReadyDraft {
  id: string; user_id: string; owner_email: string; owner_first_name: string | null
  title: string | null; city: string | null; start_date: string | null; end_date: string | null
  absence_reason: string | null; sitter_expectations: string | null; cover_photo_url: string | null
}
export interface AlmostReadyDeps {
  client: Client
  enabled: boolean
  send: SendEmail
  /** Éléments manquants et lien de reprise (sit-draft-missing.ts). */
  loadMissing: (draft: AlmostReadyDraft) => Promise<Array<{ id: string; label: string }>>
  resumeUrl: (sitId: string, missing: Array<{ id: string; label: string }>) => string
  /** Vrai si le propriétaire a répondu « je pars plus tard » et que l'envoi doit attendre. */
  departureHeld: (ownerId: string) => Promise<boolean>
  /** Adresses déjà servies par la relance de brouillon dans ce passage. */
  alreadyServed?: ReadonlySet<string>
}

export async function runAlmostReadySweep(deps: AlmostReadyDeps) {
  const { data, error } = await deps.client.rpc('detect_almost_ready_drafts')
  if (error) return { mode: deps.enabled ? 'live' : 'simulation', error: String(error.message ?? 'detect_failed'), detected: 0, sit_ids: [] as string[] }
  const drafts = ((data ?? []) as AlmostReadyDraft[])
  const eligible: AlmostReadyDraft[] = []
  let held = 0
  const seen = new Set<string>(deps.alreadyServed ?? [])
  for (const draft of drafts) {
    // Un email par personne et par passage.
    if (seen.has(draft.owner_email)) continue
    try {
      if (await deps.departureHeld(draft.user_id)) { held += 1; continue }
    } catch {
      continue // lecture impossible : rien ne part pour ce brouillon
    }
    seen.add(draft.owner_email)
    eligible.push(draft)
  }
  const base = { detected: drafts.length, eligible: eligible.length, held, sit_ids: eligible.map(d => d.id).slice(0, 50).join(',') }
  if (!deps.enabled) return { mode: 'simulation' as const, ...base, sent: 0 }

  let sent = 0, deferred = 0, skipped = 0, failed = 0, attempted = 0
  for (const draft of eligible) {
    if (attempted >= REL1_MAX_PER_RUN) break
    try {
      const missing = await deps.loadMissing(draft)
      attempted += 1
      const { outcome } = await deps.send({
        templateName: ALMOST_READY_TEMPLATE,
        recipientEmail: draft.owner_email,
        idempotencyKey: almostReadyKey(draft.id),
        logMetadata: { sit_id: draft.id, owner_id: draft.user_id, source: 'send-sit-draft-reminder', sweep: 'almost_ready' },
        templateData: {
          firstName: draft.owner_first_name ?? '', sitId: draft.id, title: draft.title ?? '', city: draft.city ?? '',
          startDate: draft.start_date, endDate: draft.end_date,
          missingItems: missing, resumeUrl: deps.resumeUrl(draft.id, missing),
        },
      })
      if (outcome === 'sent') sent += 1
      else if (outcome === 'deferred') deferred += 1
      else if (outcome === 'skipped') skipped += 1
      else failed += 1
    } catch {
      failed += 1
    }
  }
  return { mode: 'live' as const, ...base, sent, deferred, skipped, failed }
}

// ── B. Candidatures sans réponse ──────────────────────────────────────────

export interface UnansweredApplication {
  application_id: string; sit_id: string; sit_title: string | null; sit_city: string | null; sit_start_date: string | null
  sitter_id: string; sitter_first_name: string | null; sitter_email: string | null
  owner_id: string; owner_first_name: string | null; owner_email: string | null
  days_since_created: number; owner_suppressed: boolean
  second_nudge_logged: boolean; second_nudge_settled_at: string | null
}

export interface SecondNudgeGroup {
  sit_id: string; sit_title: string | null; owner_id: string; owner_first_name: string | null; owner_email: string
  count: number; oldestDays: number
  /** Renseignés quand une seule candidature attend. */
  singleApplicationId: string | null; singleSitterFirstName: string | null
}

/** B1 : une ligne par annonce joignable, encore jamais relancée une seconde fois. */
export function groupSecondNudges(rows: UnansweredApplication[]): SecondNudgeGroup[] {
  const bySit = new Map<string, UnansweredApplication[]>()
  for (const row of rows) {
    if (!row.owner_email || row.owner_suppressed || row.second_nudge_logged) continue
    bySit.set(row.sit_id, [...(bySit.get(row.sit_id) ?? []), row])
  }
  return [...bySit.values()].map(apps => {
    const first = apps[0]
    return {
      sit_id: first.sit_id, sit_title: first.sit_title, owner_id: first.owner_id,
      owner_first_name: first.owner_first_name, owner_email: first.owner_email!,
      count: apps.length, oldestDays: Math.max(...apps.map(a => a.days_since_created)),
      singleApplicationId: apps.length === 1 ? first.application_id : null,
      singleSitterFirstName: apps.length === 1 ? first.sitter_first_name : null,
    }
  }).sort((a, b) => b.oldestDays - a.oldestDays)
}

/**
 * B2 : le candidat est prévenu quand le propriétaire ne peut pas recevoir
 * d'email (adresse absente ou en liste de suppression), ou trois jours après
 * la seconde relance (partie ou refusée par ses réglages). L'email 2 annonce
 * cette date au propriétaire : elle est tenue ici.
 */
export function ownerSilentDue(row: UnansweredApplication, now: number): boolean {
  if (!row.owner_email || row.owner_suppressed) return true
  const settled = row.second_nudge_settled_at ? Date.parse(row.second_nudge_settled_at) : NaN
  return Number.isFinite(settled) && now - settled >= OWNER_SILENT_GRACE_MS
}

export interface SecondNudgeDeps {
  client: Client
  enabled: boolean
  send: SendEmail
  /** Créneau de relance partagé (reminder-daily-slot.ts). */
  slot: { isTaken(email: string): Promise<boolean>; take(email: string): void }
  /** Jetons « Je réfléchis encore » et « Décliner », une seule candidature en attente. */
  issueActionUrls: (applicationId: string) => Promise<{ declineUrl?: string; thinkingUrl?: string }>
  now?: number
}

export async function runSecondNudgeSweep(deps: SecondNudgeDeps) {
  const now = deps.now ?? Date.now()
  const { data, error } = await deps.client.rpc('detect_unanswered_applications', { p_days: SECOND_NUDGE_DAYS })
  if (error) return { mode: deps.enabled ? 'live' : 'simulation', error: String(error.message ?? 'detect_failed'), detected: 0 }
  const rows = (data ?? []) as UnansweredApplication[]
  const groups = groupSecondNudges(rows)
  const base = { detected: rows.length, sits: groups.length, sit_ids: groups.map(g => g.sit_id).slice(0, 50).join(',') }
  if (!deps.enabled) return { mode: 'simulation' as const, ...base, sent: 0 }

  let sent = 0, deferred = 0, skipped = 0, failed = 0, slotTaken = 0, attempted = 0
  for (const group of groups) {
    if (attempted >= REL1_MAX_PER_RUN) break
    // Une relance par propriétaire et par 20 heures : reportée au passage suivant.
    if (await deps.slot.isTaken(group.owner_email)) { slotTaken += 1; continue }
    try {
      const urls = group.singleApplicationId ? await deps.issueActionUrls(group.singleApplicationId).catch(() => ({})) : {}
      attempted += 1
      const { outcome } = await deps.send({
        templateName: SECOND_NUDGE_TEMPLATE,
        recipientEmail: group.owner_email,
        idempotencyKey: secondNudgeKey(group.sit_id),
        logMetadata: {
          sit_id: group.sit_id, owner_id: group.owner_id, source: 'nudge-owner-pending-application',
          sweep: 'second_nudge', pending_count: group.count,
        },
        templateData: {
          ownerFirstName: group.owner_first_name ?? '', sitterFirstName: group.singleSitterFirstName ?? '',
          sitTitle: group.sit_title ?? '', count: group.count, oldestDays: group.oldestDays,
          noticeDay: noticeDayFor(now),
          ctaUrl: `https://guardiens.fr/sits/${group.sit_id}#candidatures`,
          ...urls,
        },
      })
      if (outcome === 'sent' || outcome === 'deferred') deps.slot.take(group.owner_email)
      if (outcome === 'sent') sent += 1
      else if (outcome === 'deferred') deferred += 1
      else if (outcome === 'skipped') skipped += 1
      else failed += 1
    } catch {
      failed += 1
    }
  }
  return { mode: 'live' as const, ...base, sent, deferred, skipped, failed, slot_taken: slotTaken }
}

export interface OwnerSilentDeps {
  client: Client
  enabled: boolean
  send: SendEmail
  now?: number
}

export async function runOwnerSilentSweep(deps: OwnerSilentDeps) {
  const now = deps.now ?? Date.now()
  const { client } = deps
  const { data, error } = await client.rpc('detect_unanswered_applications', { p_days: OWNER_SILENT_DAYS })
  if (error) return { mode: deps.enabled ? 'live' : 'simulation', error: String(error.message ?? 'detect_failed'), detected: 0 }
  const rows = (data ?? []) as UnansweredApplication[]
  const due = rows.filter(row => ownerSilentDue(row, now))
  const base = {
    detected: rows.length, due: due.length, waiting_second_nudge: rows.length - due.length,
    application_ids: due.map(r => r.application_id).slice(0, 50).join(','),
  }
  if (!deps.enabled) return { mode: 'simulation' as const, ...base, notified: 0 }

  // Pose la mention sur les candidatures dues, efface celles qui ont quitté la cible.
  const { data: sync, error: syncError } = await client.rpc('sync_owner_response_pending', {
    p_application_ids: due.map(r => r.application_id), p_days: OWNER_SILENT_DAYS,
  })
  if (syncError) return { mode: 'live' as const, ...base, error: String(syncError.message ?? 'sync_failed'), notified: 0 }
  const counts = (Array.isArray(sync) ? sync[0] : sync) as { marked?: number; cleared?: number } | null

  let notified = 0, emailsSent = 0, emailsDeferred = 0, emailsSkipped = 0, failed = 0
  for (const row of due) {
    if (notified >= REL1_MAX_PER_RUN) break
    // Une seule fois par candidature : la ligne est prise avant tout envoi.
    const { data: claimed, error: claimError } = await client.from('owner_response_pending')
      .update({ notified_at: new Date(now).toISOString() })
      .eq('application_id', row.application_id).is('notified_at', null).is('cleared_at', null)
      .select('application_id')
    if (claimError) { failed += 1; continue }
    if (!claimed || claimed.length === 0) continue

    const notification = ownerSilentNotification(row.sit_title)
    const { error: notifError } = await client.from('notifications').insert({ user_id: row.sitter_id, ...notification })
    if (notifError) failed += 1
    else notified += 1

    if (!row.sitter_email) continue
    try {
      const { outcome } = await deps.send({
        templateName: OWNER_SILENT_TEMPLATE,
        recipientEmail: row.sitter_email,
        idempotencyKey: ownerSilentKey(row.application_id),
        logMetadata: {
          application_id: row.application_id, sit_id: row.sit_id, owner_id: row.owner_id,
          sitter_id: row.sitter_id, source: 'nudge-owner-pending-application', sweep: 'owner_silent',
        },
        templateData: {
          sitterFirstName: row.sitter_first_name ?? '', sitTitle: row.sit_title ?? '', sitCity: row.sit_city ?? '',
          days: row.days_since_created, variant: ownerSilentVariant(row.application_id),
        },
      })
      if (outcome === 'sent') emailsSent += 1
      else if (outcome === 'deferred') emailsDeferred += 1
      else if (outcome === 'skipped') emailsSkipped += 1
      else failed += 1
    } catch {
      failed += 1
    }
  }
  return {
    mode: 'live' as const, ...base, marked: counts?.marked ?? 0, cleared: counts?.cleared ?? 0,
    notified, emails_sent: emailsSent, emails_deferred: emailsDeferred, emails_skipped: emailsSkipped, failed,
  }
}

/** Jour de Paris, pour les journaux. */
export const rel1Today = (now = Date.now()) => parisDay(now)
