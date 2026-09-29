/** Début de période pour les sélecteurs 24 h / 7 j / 30 j / 90 j. */
export function periodStart(range: string, now: Date = new Date()): Date {
  const hours = range === "24h" ? 24 : range === "7d" ? 24 * 7 : range === "90d" ? 24 * 90 : 24 * 30;
  return new Date(now.getTime() - hours * 3600 * 1000);
}

/** Garde la ligne la plus récente par message_id (repli sur id). */
export function dedupeByMessageId<T extends { id?: string; message_id?: string | null; created_at: string }>(rows: T[]): T[] {
  const by = new Map<string, T>();
  for (const r of rows) {
    const k = r.message_id || r.id || `${r.created_at}`;
    const prev = by.get(k);
    if (!prev || new Date(r.created_at) > new Date(prev.created_at)) by.set(k, r);
  }
  return Array.from(by.values()).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
}
