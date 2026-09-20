type DB = { rpc: (name: string, args: Record<string, unknown>) => any }
export type SendClaim = { key: string; token: string }
type Acquisition = { status: 'acquired'; claim: SendClaim } | { status: 'sent' | 'busy' | 'uncertain' | 'unavailable' }

export async function acquireMemberSendClaim(db: DB, input: {
  templateName: string; recipientEmail: string; idempotencyKey: string
}): Promise<Acquisition> {
  try {
    // JSON tuple prevents delimiter ambiguity. Only the digest is persisted;
    // no recipient address, member ID, event ID or template content in this table.
    const bytes = new TextEncoder().encode(JSON.stringify([
      'member-email-v1', input.templateName, input.recipientEmail.toLowerCase(), input.idempotencyKey,
    ]))
    const digest = await crypto.subtle.digest('SHA-256', bytes)
    const key = Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, '0')).join('')
    const claim = { key, token: crypto.randomUUID() }
    const { data, error } = await db.rpc('acquire_member_email_send_claim', { p_claim_key: key, p_owner_token: claim.token })
    if (error) return { status: 'unavailable' }
    if (data === 'acquired') return { status: 'acquired', claim }
    return { status: ['sent', 'busy', 'uncertain'].includes(data) ? data : 'unavailable' }
  } catch {
    return { status: 'unavailable' }
  }
}

export async function finishMemberSendClaim(db: DB, claim: SendClaim, outcome: 'sent' | 'retryable' | 'uncertain'): Promise<boolean> {
  try {
    const { data, error } = await db.rpc('finish_member_email_send_claim', {
      p_claim_key: claim.key, p_owner_token: claim.token, p_outcome: outcome,
    })
    return !error && data === true
  } catch {
    return false
  }
}

// Explicit rejection is safe to retry. Timeouts, conflicts, 5xx and malformed
// responses can hide a provider acceptance and must never release the reservation.
export function memberSendOutcome(status: number): 'retryable' | 'uncertain' {
  return status >= 400 && status < 500 && status !== 408 && status !== 409 ? 'retryable' : 'uncertain'
}
