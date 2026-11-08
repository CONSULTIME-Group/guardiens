// Politique unique d'une relance de brouillon, pour les deux chemins :
// send-sit-draft-reminder (tâche quotidienne) et nudge-stale-draft (bouton
// « Relancer » de l'admin). send-transactional-email refait au moment réel de
// l'envoi les contrôles qui peuvent changer entre la sélection et l'envoi
// (annonce, propriétaire, nombre et espacement, préférences, suppression).
//
// Toute lecture en échec lève une erreur : l'appelant n'envoie rien (fail closed).
// Module sans dépendance Deno : importé aussi par Vitest.
import {
  draftReminderHistoryFilter, draftReminderKey, draftReminderStageDecision, draftReminderStillRelevant,
  type DraftReminderSkipReason,
} from './draft-reminder-policy.ts'
export { DRAFT_REMINDER_SKIP_LABELS, type DraftReminderSkipReason } from './draft-reminder-policy.ts'
import { ownerHasPublished } from './published-sit.ts'
import { departureHoldsPublishAsk, loadLastDepartureAnswer } from './owner-sequence-rules.ts'

export const DRAFT_REMINDER_TEMPLATE = 'sit-draft-reminder'
export const DRAFT_REMINDER_SELECT =
  'id, user_id, status, published_at, unpublished_at, title, city, start_date, end_date, absence_reason, sitter_expectations, cover_photo_url, created_at'
/** Un brouillon n'est relancé qu'après 24 heures. */
export const DRAFT_REMINDER_MIN_AGE_MS = 24 * 3600_000
// Lot NUR1 bloc B (08/11/2026) : la relance de brouillon n'attend plus les
// emails de séquence. Elle fait publier 32 % de ses destinataires, contre 2
// sur environ 150 pour la séquence. Le plafond d'envoi (un email produit par
// 24 heures, send-transactional-email) reporte au lendemain en cas de
// collision ; l'inverse reste tenu par evaluate-journeys (owner-no-sit-*
// attend 48 heures après une relance de brouillon).

export interface DraftReminderDraft {
  id: string; user_id: string; status?: string | null; published_at?: string | null; unpublished_at?: string | null
  title?: string | null; city?: string | null; start_date?: string | null; end_date?: string | null
  absence_reason?: string | null; sitter_expectations?: string | null; cover_photo_url?: string | null; created_at?: string | null
}
export interface DraftReminderOwner {
  email: string; first_name: string | null; city: string | null; latitude: number | null; longitude: number | null; last_seen_at: string | null
}
export type DraftReminderDecision =
  | { send: true; stage: 1 | 2; idempotencyKey: string; draft: DraftReminderDraft; owner: DraftReminderOwner }
  | { send: false; reason: DraftReminderSkipReason }

export function escapeIlike(value: string): string {
  return value.trim().toLowerCase().replace(/[\\%_]/g, (c) => `\\${c}`)
}

// deno-lint-ignore no-explicit-any
type Client = any

function fail(what: string, error: { message?: string } | null | undefined): never {
  throw new Error(`draft_reminder_${what}_unavailable: ${error?.message ?? 'unknown'}`)
}

export async function evaluateDraftReminder(
  client: Client,
  draft: DraftReminderDraft | null,
  opts: { now?: number; minAgeMs?: number } = {},
): Promise<DraftReminderDecision> {
  const now = opts.now ?? Date.now()
  const today = new Date(now).toISOString().slice(0, 10)
  if (!draft || !draftReminderStillRelevant(draft as never, today)) return { send: false, reason: 'draft_no_longer_relevant' }
  const created = draft.created_at ? Date.parse(draft.created_at) : NaN
  if (!Number.isFinite(created) || now - created < (opts.minAgeMs ?? DRAFT_REMINDER_MIN_AGE_MS)) return { send: false, reason: 'too_recent' }
  if (await ownerHasPublished(client, draft.user_id)) return { send: false, reason: 'owner_already_published' }

  const { data: profile, error: profileError } = await client.from('profiles')
    .select('email, first_name, city, latitude, longitude, last_seen_at').eq('id', draft.user_id).maybeSingle()
  if (profileError) fail('profile', profileError)
  const email = typeof profile?.email === 'string' ? profile.email.trim().toLowerCase() : ''
  if (!email) return { send: false, reason: 'no_email' }

  const { data: suppressed, error: suppressedError } = await client.from('suppressed_emails')
    .select('id').eq('email', email).maybeSingle()
  if (suppressedError) fail('suppression', suppressedError)
  if (suppressed) return { send: false, reason: 'suppressed' }

  // Le gabarit est classé « product » (email-categories.ts).
  const { data: prefs, error: prefsError } = await client.from('email_preferences')
    .select('product_emails').eq('user_id', draft.user_id).maybeSingle()
  if (prefsError) fail('preferences', prefsError)
  if (prefs && prefs.product_emails === false) return { send: false, reason: 'product_emails_off' }

  if (departureHoldsPublishAsk(await loadLastDepartureAnswer(client, draft.user_id), new Date(now))) {
    return { send: false, reason: 'departure_hold' }
  }

  const pattern = escapeIlike(email)
  const { data: history, error: historyError } = await client.from('email_send_log')
    .select('status, created_at, metadata').eq('template_name', DRAFT_REMINDER_TEMPLATE)
    .or(draftReminderHistoryFilter(draft.id))
  if (historyError) fail('history', historyError)
  const stage = draftReminderStageDecision(history ?? [], profile?.last_seen_at ?? null, now)
  if (stage.stage === null) return { send: false, reason: stage.reason }

  // Plafond par personne : jamais deux relances de brouillon le même jour (UTC).
  const { count, error: dailyError } = await client.from('email_send_log').select('id', { count: 'exact', head: true })
    .eq('template_name', DRAFT_REMINDER_TEMPLATE).ilike('recipient_email', pattern)
    .gte('created_at', `${today}T00:00:00.000Z`).in('status', ['sent', 'pending', 'deferred'])
  if (dailyError) fail('daily_cap', dailyError)
  if ((count ?? 0) > 0) return { send: false, reason: 'already_sent_today' }

  return {
    send: true, stage: stage.stage, idempotencyKey: draftReminderKey(draft.id, stage.stage), draft,
    owner: {
      email, first_name: profile?.first_name ?? null, city: profile?.city ?? null,
      latitude: profile?.latitude ?? null, longitude: profile?.longitude ?? null, last_seen_at: profile?.last_seen_at ?? null,
    },
  }
}

/** Issue d'un appel à send-transactional-email, sans jamais compter un refus comme un envoi. */
export type DraftSendOutcome = 'sent' | 'deferred' | 'skipped' | 'failed'
export function classifyTransactionalResponse(httpOk: boolean, body: Record<string, unknown> | null): { outcome: DraftSendOutcome; reason: string | null } {
  if (!httpOk || !body) return { outcome: 'failed', reason: String(body?.error ?? 'send_failed') }
  if (body.deferred) return { outcome: 'deferred', reason: String(body.reason ?? 'deferred') }
  if (body.skipped || body.abandoned) return { outcome: 'skipped', reason: String(body.reason ?? 'skipped') }
  if (body.success === true) return { outcome: 'sent', reason: null }
  // success: false avec un motif (préférence, compte suspendu, suppression) : refus, pas une panne.
  if (body.success === false && body.reason) return { outcome: 'skipped', reason: String(body.reason) }
  return { outcome: 'failed', reason: 'unexpected_send_response' }
}
