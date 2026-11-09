/**
 * Lot L6 (09/11/2026) : une candidature reçue a sa page, /candidatures/{id}.
 * Les emails « nouvelle candidature » y mènent (lien profond et lien public),
 * la notification aussi (notify_new_application, drizzle 0120).
 */
export const APPLICATION_PAGE_TEMPLATES: ReadonlySet<string> = new Set([
  'new-application',
  'first-application-received',
])

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** Chemin de la page d'une candidature, null si l'identifiant est absent ou mal formé. */
export function applicationPagePath(applicationId: unknown): string | null {
  return typeof applicationId === 'string' && UUID_RE.test(applicationId)
    ? `/candidatures/${applicationId.toLowerCase()}`
    : null
}

/** Cible du lien profond d'un email de candidature, null pour les autres gabarits. */
export function applicationDeepLinkPath(templateName: string, applicationId: unknown): string | null {
  return APPLICATION_PAGE_TEMPLATES.has(templateName) ? applicationPagePath(applicationId) : null
}

const APPLICATION_KEY_RE = /^(?:first-application|new-application)-([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i

/**
 * Lot L6b : notify_new_application (base) ne transmet pas applicationId, mais
 * sa clé d'envoi le porte (« new-application-{id} », « first-application-{id} »).
 * La fonction d'envoi le relit là, sans toucher à la fonction de la base, qui
 * lit le coffre des secrets et que l'outil de migration refuse de réécrire.
 */
export function withApplicationIdFromKey(
  templateName: string,
  templateData: Record<string, unknown>,
  idempotencyKey: unknown,
): Record<string, unknown> {
  if (!APPLICATION_PAGE_TEMPLATES.has(templateName)) return templateData
  if (applicationPagePath(templateData.applicationId)) return templateData
  const m = typeof idempotencyKey === 'string' ? idempotencyKey.match(APPLICATION_KEY_RE) : null
  return m ? { ...templateData, applicationId: m[1].toLowerCase() } : templateData
}
