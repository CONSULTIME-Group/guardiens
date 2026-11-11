/**
 * Lot ADM21 (audit admin du 11/11/2026) : ordre de la vue d'ensemble sur
 * téléphone. Tous les voyants lus et verts : la liste de travail d'abord,
 * l'état du site ensuite. Un voyant « alert », aucun voyant lu, une lecture
 * en cours ou en échec : l'état du site reste en tête.
 */
export function isListFirstOnPhone(
  health: Array<{ state?: string | null }> | null,
  loading: boolean,
  error: unknown,
): boolean {
  if (loading || error || !health || health.length === 0) return false;
  return health.every((c) => c.state === "ok");
}
