/** Deux relances au plus. La seconde attend sept jours et une activité récente.
 * Une intention en file bloque un nouvel envoi ; un échec ne consomme pas de relance.
 */
export interface DraftReminderLog { status: string; created_at: string; metadata?: Record<string, unknown> | null }
export function nextDraftReminderStage(logs: DraftReminderLog[], lastSeen: string | null, now = Date.now()): 1 | 2 | null {
  // Les logs de report restent dans l'historique après drainage. Seul le
  // dernier état de chaque clé compte, sinon un ancien report bloque à vie.
  const byKey = new Map<string, DraftReminderLog>();
  for (const [index, log] of [...logs].sort((a, b) => Date.parse(a.created_at) - Date.parse(b.created_at)).entries()) {
    byKey.set(String(log.metadata?.idempotency_key ?? `legacy-${index}`), log);
  }
  const current = [...byKey.values()];
  if (current.some(l => l.status === 'pending' || l.status === 'deferred')) return null;
  const sent = current.filter(l => l.status === 'sent');
  if (!sent.length) return 1;
  if (sent.length >= 2 || sent.some(l => Number(l.metadata?.reminder_stage) === 2)) return null;
  const latest = Math.max(...sent.map(l => Date.parse(l.created_at)));
  const activity = lastSeen ? Date.parse(lastSeen) : NaN;
  if (!Number.isFinite(latest) || now - latest < 7 * 86400000) return null;
  if (!Number.isFinite(activity) || now - activity > 30 * 86400000) return null;
  return 2;
}
export function draftReminderStillRelevant(sit: { status?: string; published_at?: string | null; unpublished_at?: string | null; start_date?: string | null } | null, today: string): boolean {
  return Boolean(sit && sit.status === 'draft' && !sit.published_at && !sit.unpublished_at && (!sit.start_date || sit.start_date >= today));
}
