// Extraction et controle des jetons. Helpers purs, sans appel reseau.

export function extractBearer(authorizationHeader: string | null): string | null {
  if (!authorizationHeader) return null;
  if (!authorizationHeader.startsWith('Bearer ')) return null;
  const token = authorizationHeader.slice(7).trim();
  return token.length > 0 ? token : null;
}

/**
 * dispatch-web-push n'accepte que la cle service_role, jamais un membre,
 * jamais un jeton anonyme. Comparaison stricte.
 */
export function isServiceRoleCaller(
  authorizationHeader: string | null,
  serviceRoleKey: string | undefined,
): boolean {
  const token = extractBearer(authorizationHeader);
  if (!token) return false;
  if (!serviceRoleKey || serviceRoleKey.length === 0) return false;
  return token === serviceRoleKey;
}
