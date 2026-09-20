// Read-only authorization for the six remaining legacy member email paths.
// Client fields locate events; only persisted relationships/content authorize them.
type Client = { from: (table: string) => any }
type Decision =
  | { ok: true; idempotencyKey: string; dedupeKeys: string[]; templateData: Record<string, unknown> }
  | { ok: false; status: 403 | 503 }
const UUID = '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}'
const SITE = 'https://guardiens.fr'
const sitColumns = 'id,user_id,title,city,status,start_date,end_date,cancelled_by,cancelled_at,unpublished_at,last_unpublished_reason'
const supported = ['sit-invitation', 'review-received', 'cancellation-by-owner', 'cancellation-by-sitter', 'help-during-sit', 'listing-unpublished-feedback']
async function one(query: any): Promise<any> {
  const { data, error } = await query.maybeSingle()
  if (error) throw new Error('event_read_failed')
  return data
}
function dateLabel(value: unknown): string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return ''
  const date = new Date(`${value}T12:00:00Z`)
  return Number.isNaN(date.getTime()) ? '' : new Intl.DateTimeFormat('fr-FR', {
    day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC',
  }).format(date)
}
const literalPattern = (value: string) => value.replace(/[\\%_]/g, '\\$&')

export async function authorizeSitEventEmail(db: Client, input: {
  templateName: string; idempotencyKey: unknown; callerId: string; recipientId: string;
  templateData?: Record<string, unknown> | null;
}): Promise<Decision> {
  const denied: Decision = { ok: false, status: 403 }
  const { templateName: name, callerId: caller, recipientId: recipient } = input
  if (!supported.includes(name) || typeof input.idempotencyKey !== 'string') return denied
  const key = input.idempotencyKey
  const pattern = name === 'sit-invitation' ? `^sit-invite-(${UUID})-(${UUID})$`
    : name === 'review-received' ? `^review-received-(${UUID})-(${UUID})$`
    : name.startsWith('cancellation-') ? `^${name}-(${UUID})-(${UUID})$`
    : name === 'help-during-sit' ? `^help-urgence-(${UUID})-[0-9]{10,16}$`
    : `^unpublished-feedback-(${UUID})-[0-9]{4}-[0-9]{2}-[0-9]{2}$`
  const match = key.match(new RegExp(pattern, 'i'))
  if (!match) return denied
  const sitId = match[1].toLowerCase()
  if (name === 'sit-invitation' || name === 'review-received') {
    if (match[2].toLowerCase() !== recipient || recipient === caller) return denied
  } else if (name.startsWith('cancellation-')) {
    if (match[2].toLowerCase() !== caller || recipient === caller) return denied
  } else if (name === 'listing-unpublished-feedback' && recipient !== caller) return denied
  try {
    const sit = await one(db.from('sits').select(sitColumns).eq('id', sitId))
    if (!sit) return denied
    let canonical: string
    let payload: Record<string, unknown>
    const profile = (id: string) => one(db.from('profiles').select('first_name,city').eq('id', id))
    const pair = async (status: string) => {
      if (caller === recipient || (sit.user_id !== caller && sit.user_id !== recipient)) return null
      const sitterId = sit.user_id === caller ? recipient : caller
      return one(db.from('applications').select('id,sitter_id,status').eq('sit_id', sit.id)
        .eq('sitter_id', sitterId).eq('status', status))
    }
    if (name === 'sit-invitation') {
      if (sit.user_id !== caller || sit.status !== 'published') return denied
      const invitation = await one(db.from('sit_invitations').select('id,owner_id,sitter_id,status,message')
        .eq('sit_id', sit.id).eq('owner_id', caller).eq('sitter_id', recipient))
      if (!invitation || !['sent', 'viewed'].includes(invitation.status)) return denied
      const owner = await profile(caller)
      const sitter = await profile(recipient)
      const start = dateLabel(sit.start_date), end = dateLabel(sit.end_date)
      payload = {
        sitterFirstName: sitter?.first_name ?? '', ownerFirstName: owner?.first_name ?? '',
        sitTitle: sit.title, sitCity: sit.city ?? owner?.city ?? '',
        sitPeriod: start && end ? `du ${start} au ${end}` : start ? `à partir du ${start}` : null,
        message: invitation.message, sitId: sit.id,
      }
      canonical = `sit-invite-${sit.id}-${recipient}`
    } else if (name === 'review-received') {
      if (sit.status !== 'completed' || !await pair('accepted')) return denied
      const review = await one(db.from('reviews').select('id,review_type,moderation_status,moderation_hidden_at')
        .eq('sit_id', sit.id).eq('reviewer_id', caller).eq('reviewee_id', recipient).eq('review_type', 'garde'))
      if (!review || review.moderation_hidden_at || ['rejete', 'rejected'].includes(review.moderation_status)) return denied
      // An unpublished double-blind review is a real event. Never select its text/rating.
      const author = await profile(caller), target = await profile(recipient)
      payload = { firstName: target?.first_name ?? '', reviewerName: author?.first_name ?? '', sitTitle: sit.title, sitId: sit.id }
      canonical = `review-received-${sit.id}-${recipient}`
    } else if (name.startsWith('cancellation-')) {
      const byOwner = name === 'cancellation-by-owner'
      if ((byOwner ? sit.user_id !== caller : sit.user_id !== recipient)
        || sit.cancelled_by !== caller || !sit.cancelled_at || !await pair('cancelled')) return denied
      // Sitter cancellation re-publishes the sit. The cancellation event still exists.
      if (byOwner ? sit.status !== 'cancelled' : !['cancelled', 'published'].includes(sit.status)) return denied
      const review = await one(db.from('reviews').select('id,cancelled_by_role,cancellation_reason')
        .eq('sit_id', sit.id).eq('reviewer_id', caller).eq('reviewee_id', recipient).eq('review_type', 'annulation'))
      if (!review || review.cancelled_by_role !== (byOwner ? 'proprio' : 'gardien')) return denied
      const author = await profile(caller)
      payload = { cancellerFirstName: author?.first_name ?? '', sitTitle: sit.title, startDate: dateLabel(sit.start_date), reason: review.cancellation_reason }
      canonical = `${name}-${sit.id}-${caller}`
    } else if (name === 'listing-unpublished-feedback') {
      if (sit.user_id !== caller || sit.status !== 'draft' || !sit.unpublished_at) return denied
      const date = new Date(sit.unpublished_at)
      if (Number.isNaN(date.getTime())) return denied
      const author = await profile(caller)
      const reason = sit.last_unpublished_reason
      payload = { firstName: author?.first_name ?? '', sitTitle: sit.title, sitUrl: `${SITE}/sits/${sit.id}`,
        reason: ['found_offline', 'found_onplatform', 'no_relevant_apps', 'plans_changed'].includes(reason) ? reason : 'other' }
      // The persisted event day prevents replay by changing the caller's date.
      canonical = `unpublished-feedback-${sit.id}-${date.toISOString().slice(0, 10)}`
    } else {
      if (sit.status !== 'in_progress' || !await pair('accepted')) return denied
      const data = input.templateData
      if (data?.category !== 'urgence' || typeof data.conversationHref !== 'string'
        || typeof data.messageExcerpt !== 'string' || !data.messageExcerpt.trim() || data.messageExcerpt.length > 240) return denied
      let url: URL
      try { url = new URL(data.conversationHref) } catch { return denied }
      const path = url.pathname.match(new RegExp(`^/messages/(${UUID})$`, 'i'))
      if (url.origin !== SITE || url.username || url.password || !path) return denied
      const conversation = await one(db.from('conversations').select('id,owner_id,sitter_id,sit_id').eq('id', path[1].toLowerCase()))
      const sitterId = sit.user_id === caller ? recipient : caller
      if (!conversation || conversation.sit_id !== sit.id || conversation.owner_id !== sit.user_id || conversation.sitter_id !== sitterId) return denied
      const message = await one(db.from('messages').select('id,content,created_at')
        .eq('conversation_id', conversation.id).eq('sender_id', caller).eq('is_system', false)
        .like('content', `${literalPattern('[URGENCE] ' + data.messageExcerpt)}%`)
        .order('created_at', { ascending: false }).limit(1))
      if (!message || typeof message.content !== 'string'
        || !message.content.startsWith('[URGENCE] ')
        || message.content.slice('[URGENCE] '.length).trim().slice(0, 240) !== data.messageExcerpt) return denied
      const author = await profile(caller)
      payload = { sitTitle: sit.title, senderName: author?.first_name ?? '', category: 'urgence',
        messageExcerpt: message.content.slice('[URGENCE] '.length).trim().slice(0, 240), conversationHref: `${SITE}/messages/${conversation.id}` }
      // A caller-controlled timestamp is never the deduplication identity.
      canonical = `help-urgence-message-${message.id}`
    }
    return { ok: true, idempotencyKey: canonical, dedupeKeys: [...new Set([canonical, key])], templateData: payload }
  } catch {
    return { ok: false, status: 503 }
  }
}
