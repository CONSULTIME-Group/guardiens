type DB = { from: (table: string) => any; rpc: (name: string, args: Record<string, unknown>) => any }
const SOURCE = 'email-pipeline-watchdog'
const PREFIX = 'email_pipeline:member_email_claims_'
const STALE_MS = 10 * 60 * 1000

// Counts only: never retrieve claim hashes, attempt tokens or member data.
// This monitor writes diagnostics only; it never releases or retries a claim.
export async function monitorMemberEmailClaims(db: DB, now = new Date()) {
  const checkedAt = now.toISOString()
  const staleBefore = new Date(now.getTime() - STALE_MS).toISOString()
  async function log(code: string, message: string, context: Record<string, unknown>) {
    try {
      const result = await db.rpc('log_client_error', {
        _fingerprint: PREFIX + code, _message: message, _severity: 'error',
        _source: SOURCE, _context: { code: 'member_email_claims_' + code, checked_at: checkedAt, ...context },
      })
      if (result.error) throw new Error()
    } catch { throw new Error('member email claim diagnostic write failed') }
  }
  async function resolve(code: string) {
    try {
      const result = await db.from('error_logs').update({ resolved_at: checkedAt })
        .eq('source', SOURCE).eq('fingerprint', PREFIX + code).is('resolved_at', null)
        .lt('last_seen_at', checkedAt)
      if (result.error) throw new Error()
    } catch { throw new Error('member email claim diagnostic resolution failed') }
  }
  let uncertain: number
  let staleSending: number
  try {
    const results = await Promise.all([
      db.from('member_email_send_claims').select('state', { count: 'exact', head: true }).eq('state', 'uncertain'),
      db.from('member_email_send_claims').select('state', { count: 'exact', head: true }).eq('state', 'sending').lt('updated_at', staleBefore),
    ])
    if (results.some(r => r.error || !Number.isSafeInteger(r.count) || r.count < 0)) {
      throw new Error('incomplete claim counts')
    }
    uncertain = results[0].count
    staleSending = results[1].count
  } catch {
    await log('unavailable', 'Contrôle des réservations email indisponible : état inconnu, aucune libération automatique.', {})
    throw new Error('member email claim monitoring unavailable')
  }
  const summary = { checked_at: checkedAt, uncertain, stale_sending: staleSending }
  if (uncertain > 0) {
    await log('uncertain', 'Résultat fournisseur incertain : vérifier avant toute reprise. Compteurs dans le diagnostic ; aucune libération automatique.', summary)
  } else await resolve('uncertain')
  if (staleSending > 0) {
    await log('stale_sending', 'Réservation email en cours depuis plus de dix minutes : vérifier avant toute reprise. Compteurs dans le diagnostic ; aucune libération automatique.', { ...summary, stale_before: staleBefore })
  } else await resolve('stale_sending')
  await resolve('unavailable')
  return summary
}
