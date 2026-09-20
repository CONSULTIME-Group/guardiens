import { authorizeApplicationEmail, isApplicationEmail } from './application-email-authorization.ts'
import { authorizeSitEventEmail } from './sit-event-email-authorization.ts'

export const EMAIL_ORIGIN_FIELD = '__guardiens_email_origin'
export const MEMBER_EMAIL_TEMPLATES = new Set([
  'application-accepted', 'application-declined', 'sit-confirmed',
  'cancellation-by-owner', 'cancellation-by-sitter', 'sit-invitation',
  'review-received', 'help-during-sit', 'listing-unpublished-feedback',
])
export type EmailOrigin = { version: 1; kind: 'trusted' } | {
  version: 1; kind: 'member'; callerId: string; recipientId: string; eventKey: string
}
type Client = { from: (table: string) => any }
type Result = { ok: true; origin: EmailOrigin; templateData: Record<string, unknown>; dedupeKeys: string[] }
  | { ok: false; status: 403 | 503 }
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const plainObject = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value)

// Called only for a real service caller with a source queue ID. The request's
// payload/origin is never evidence: load the row claimed by the worker instead.
// A missing legacy origin is refused for these nine templates, not guessed.
export async function authorizeDeferredMemberEmail(db: Client, input: {
  sourceQueueId: string; templateName: string; recipientEmail: string; idempotencyKey: string
}): Promise<Result> {
  const denied: Result = { ok: false, status: 403 }
  if (!MEMBER_EMAIL_TEMPLATES.has(input.templateName) || !uuid.test(input.sourceQueueId)) return denied
  try {
    const { data: row, error } = await db.from('email_deferred_queue')
      .select('template_name,recipient_email,idempotency_key,template_data,status')
      .eq('id', input.sourceQueueId).maybeSingle()
    if (error) throw new Error('queue_read_failed')
    if (!row || row.status !== 'processing' || row.template_name !== input.templateName
      || typeof row.recipient_email !== 'string'
      || row.recipient_email.toLowerCase() !== input.recipientEmail.toLowerCase()
      || row.idempotency_key !== input.idempotencyKey || !plainObject(row.template_data)) return denied
    const { [EMAIL_ORIGIN_FIELD]: stored, ...templateData } = row.template_data
    if (!plainObject(stored) || stored.version !== 1) return denied
    // Existing admin/service privileges are preserved only when recorded by
    // the sender at enqueue, never inferred from the worker's own service key.
    if (stored.kind === 'trusted') return { ok: true, origin: { version: 1, kind: 'trusted' }, templateData, dedupeKeys: [] }
    if (stored.kind !== 'member' || typeof stored.callerId !== 'string' || !uuid.test(stored.callerId)
      || typeof stored.recipientId !== 'string' || !uuid.test(stored.recipientId)
      || typeof stored.eventKey !== 'string' || !stored.eventKey) return denied
    const origin: EmailOrigin = { version: 1, kind: 'member', callerId: stored.callerId,
      recipientId: stored.recipientId, eventKey: stored.eventKey }
    const readProfile = async (id: string) => {
      const { data, error } = await db.from('profiles').select('id,email').eq('id', id).maybeSingle()
      if (error) throw new Error('profile_read_failed')
      return data
    }
    const caller = await readProfile(origin.callerId)
    const recipient = origin.recipientId === origin.callerId ? caller : await readProfile(origin.recipientId)
    if (!caller || caller.id !== origin.callerId || !recipient || recipient.id !== origin.recipientId
      || typeof recipient.email !== 'string' || recipient.email.toLowerCase() !== input.recipientEmail.toLowerCase()) return denied
    const eventInput = { templateName: input.templateName, idempotencyKey: origin.eventKey,
      callerId: origin.callerId, recipientId: origin.recipientId }
    const expectedMessageId = input.templateName === 'help-during-sit'
      ? input.idempotencyKey.replace(/^help-urgence-message-/, '') : undefined
    if (expectedMessageId !== undefined && !uuid.test(expectedMessageId)) return denied
    const decision = isApplicationEmail(input.templateName)
      ? await authorizeApplicationEmail(db, eventInput)
      : await authorizeSitEventEmail(db, { ...eventInput, templateData, expectedMessageId })
    if (decision.ok === false) return decision
    // Re-publication followed by a new unpublication is a new event. Do not
    // transform an old queued intention into a notification for that new event.
    if (decision.idempotencyKey !== input.idempotencyKey) return denied
    return { ok: true, origin, templateData: decision.templateData, dedupeKeys: decision.dedupeKeys }
  } catch {
    return { ok: false, status: 503 }
  }
}
