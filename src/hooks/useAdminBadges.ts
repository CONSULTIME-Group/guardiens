/**
 * Rafraîchissement de la pastille du menu admin.
 *
 * Lot ADM14 (09/11/2026, lot 3 du plan de l'arène admin) : le menu ne porte
 * plus qu'une pastille, celle de la vue d'ensemble, égale au nombre de lignes
 * de la liste de travail (useWorkList, src/hooks/useWorkList.ts). Les
 * pastilles par file (admin_menu_badges) ne sont plus lues ; les files
 * qu'elles signalaient entrent dans la liste (drizzle 0127).
 */
export const ADMIN_BADGES_REFRESH_EVENT = "admin-badges-refresh";

/** À appeler après toute action qui change une file admin : la liste et sa pastille se relisent. */
export function refreshAdminBadges(): void {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(ADMIN_BADGES_REFRESH_EVENT));
  }
}
