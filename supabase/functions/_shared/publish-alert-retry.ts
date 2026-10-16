// Lot CRON1 (16/10/2026) : reprise des alertes de publication relâchées.
// Module pur, testé côté Vitest.

/** Une alerte relâchée (échec technique ou limite de débit) est reprise pendant 72 heures. */
export const RETRY_RELEASED_HOURS = 72

const KEY_RE = /^publish-alert-([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})-[0-9a-f-]{36}$/i

/** Annonce visée par une clé « publish-alert-{sit_id}-{user_id} », null sinon. */
export function sitIdFromPublishAlertKey(key: string): string | null {
  const m = KEY_RE.exec(key)
  return m ? m[1].toLowerCase() : null
}

/**
 * Annonce publiée avant la fenêtre de rattrapage : seules ses alertes
 * relâchées sont reprises, jamais un nouveau gardien.
 */
export function isRetryOnlySit(publishedAt: string | null | undefined, sinceIso: string): boolean {
  if (!publishedAt) return true
  return Date.parse(publishedAt) < Date.parse(sinceIso)
}
