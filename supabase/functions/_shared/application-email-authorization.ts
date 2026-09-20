// Read-only authorization for the three legacy browser application emails.
// A legacy idempotency key is only an event locator, never proof of ownership.
type ReadClient = { from: (table: string) => any }
type Decision =
  | { ok: true; idempotencyKey: string; dedupeKeys: string[]; templateData: Record<string, unknown> }
  | { ok: false; status: 403 | 503 }

const UUID = '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}'
const applicationColumns = 'id,sit_id,sitter_id,status,decline_reason,decline_variant'
const sitColumns = 'id,user_id,status,title,city,property_id,start_date,end_date'

export function isApplicationEmail(templateName: string): boolean {
  return ['application-accepted', 'application-declined', 'sit-confirmed'].includes(templateName)
}

async function one(query: any): Promise<any> {
  const { data, error } = await query.maybeSingle()
  if (error) throw new Error('authorization_read_failed')
  return data
}

async function many(query: any): Promise<any[]> {
  const { data, error } = await query
  if (error || !Array.isArray(data)) throw new Error('authorization_read_failed')
  return data
}

function dateLabel(value: unknown): string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return ''
  const date = new Date(`${value}T12:00:00Z`)
  if (Number.isNaN(date.getTime())) return ''
  return new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(date)
}

export async function authorizeApplicationEmail(
  db: ReadClient,
  input: { templateName: string; idempotencyKey: unknown; callerId: string; recipientId: string },
): Promise<Decision> {
  const denied: Decision = { ok: false, status: 403 }
  if (!isApplicationEmail(input.templateName) || typeof input.idempotencyKey !== 'string') return denied
  const { templateName, callerId, recipientId } = input
  const key = input.idempotencyKey
  try {
    let app: any
    let sit: any
    if (templateName === 'sit-confirmed') {
      const match = key.match(new RegExp(`^sit-confirmed-(${UUID})$`, 'i'))
      if (!match || recipientId !== callerId) return denied
      sit = await one(db.from('sits').select(sitColumns).eq('id', match[1].toLowerCase()))
      if (!sit || sit.user_id !== callerId || !['confirmed', 'in_progress'].includes(sit.status)) return denied
      // Multiple accepted applications are inconsistent: maybeSingle fails closed.
      app = await one(db.from('applications').select(applicationColumns).eq('sit_id', sit.id).eq('status', 'accepted'))
      if (!app || app.status !== 'accepted') return denied
    } else {
      const action = templateName === 'application-accepted' ? 'accepted' : 'declined'
      const direct = key.match(new RegExp(`^app-${action}-(${UUID})$`, 'i'))
      const conversation = key.match(new RegExp(`^app-${action}-conv-(${UUID})-(${UUID})$`, 'i'))
      const automatic = action === 'declined'
        ? key.match(new RegExp(`^app-declined-auto-(${UUID})-(${UUID})$`, 'i')) : null
      if (direct) {
        app = await one(db.from('applications').select(applicationColumns).eq('id', direct[1].toLowerCase()))
      } else if (conversation) {
        if (conversation[2].toLowerCase() !== recipientId) return denied
        const conv = await one(db.from('conversations').select('id,sit_id,owner_id,sitter_id').eq('id', conversation[1].toLowerCase()))
        if (!conv || conv.owner_id !== callerId || conv.sitter_id !== recipientId || !conv.sit_id) return denied
        app = await one(db.from('applications').select(applicationColumns).eq('sit_id', conv.sit_id).eq('sitter_id', recipientId))
      } else if (automatic) {
        if (automatic[2].toLowerCase() !== recipientId) return denied
        app = await one(db.from('applications').select(applicationColumns).eq('sit_id', automatic[1].toLowerCase()).eq('sitter_id', recipientId))
      } else {
        return denied
      }
      const expectedStatus = action === 'accepted' ? 'accepted' : 'rejected'
      if (!app || app.sitter_id !== recipientId || app.status !== expectedStatus) return denied
      sit = await one(db.from('sits').select(sitColumns).eq('id', app.sit_id))
      if (!sit || sit.user_id !== callerId) return denied
      if (action === 'accepted' && !['published', 'confirmed', 'in_progress'].includes(sit.status)) return denied
    }

    const canonicalKey = templateName === 'sit-confirmed'
      ? `sit-confirmed-${sit.id}`
      : `app-${templateName === 'application-accepted' ? 'accepted' : 'declined'}-${app.id}`
    const dedupeKeys = [canonicalKey]
    if (templateName !== 'sit-confirmed') {
      // Account for historical UI entry points; all now write the canonical key.
      const conversations = await many(db.from('conversations').select('id')
        .eq('sit_id', sit.id).eq('sitter_id', app.sitter_id).eq('owner_id', callerId))
      const action = templateName === 'application-accepted' ? 'accepted' : 'declined'
      for (const conv of conversations) dedupeKeys.push(`app-${action}-conv-${conv.id}-${app.sitter_id}`)
      if (action === 'declined') dedupeKeys.push(`app-declined-auto-${sit.id}-${app.sitter_id}`)
    }
    // Also covers a valid uppercase spelling of an incoming historical key.
    dedupeKeys.push(key)

    // Rebuild the entire payload: browser-supplied names, reasons, dates, links,
    // urgency and other fields cannot impersonate another event or alter caps.
    const owner = templateName === 'application-accepted'
      ? await one(db.from('profiles').select('first_name').eq('id', callerId)) : null
    const sitter = templateName !== 'application-accepted'
      ? await one(db.from('profiles').select('first_name').eq('id', app.sitter_id)) : null
    let templateData: Record<string, unknown>
    if (templateName === 'application-accepted') {
      templateData = { sitTitle: sit.title, ownerFirstName: owner?.first_name ?? '' }
    } else if (templateName === 'application-declined') {
      templateData = {
        sitTitle: sit.title, sitterFirstName: sitter?.first_name ?? '', sitCity: sit.city ?? '',
        declineReason: app.decline_reason ?? undefined, declineVariant: app.decline_variant ?? undefined, locale: 'fr',
      }
    } else {
      const pets = await many(db.from('pets').select('name').eq('property_id', sit.property_id))
      templateData = {
        sitTitle: sit.title, sitterFirstName: sitter?.first_name ?? '',
        startDate: dateLabel(sit.start_date), endDate: dateLabel(sit.end_date),
        petNames: pets.map((pet) => pet.name).filter((name) => typeof name === 'string').join(', '), sitId: sit.id,
      }
    }
    return { ok: true, idempotencyKey: canonicalKey, dedupeKeys: [...new Set(dedupeKeys)], templateData }
  } catch {
    // Never return database errors, event identifiers or personal data.
    return { ok: false, status: 503 }
  }
}
