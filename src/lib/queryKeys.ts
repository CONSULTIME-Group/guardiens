/**
 * Versions centralisées des queryKeys React Query.
 *
 * Pourquoi : quand un hook ajoute un champ au `select` Supabase, le cache
 * React Query persiste l'ancienne forme (sans le champ) tant que la
 * `queryKey` n'a pas changé → l'UI rend `undefined` jusqu'au prochain GC.
 *
 * Solution : chaque domaine a un numéro de version. On bump ICI (et nulle
 * part ailleurs) quand on change la forme des données retournées par un
 * hook. Le bump invalide automatiquement tous les caches de ce domaine
 * pour tous les utilisateurs au prochain mount.
 *
 * Convention : `qk.<domaine>(...args)` renvoie un tuple stable.
 * Ne JAMAIS construire de queryKey ad hoc dans les hooks — toujours passer
 * par ce fichier pour garder la traçabilité des bumps en un seul endroit.
 *
 * Historique des bumps :
 *  - nearbyHelpers v2 (2026-05-18) : ajout du champ `bio`.
 */

export const QK_VERSIONS = {
  nearbyHelpers: "v2",
  helpersProximityCount: "v1",
} as const;

export const qk = {
  nearbyHelpers: (userId: string | undefined, forcedRadius: number | null) =>
    ["nearby-helpers", QK_VERSIONS.nearbyHelpers, userId, forcedRadius] as const,

  helpersProximityCount: (userId: string | undefined) =>
    ["helpers-proximity-count", QK_VERSIONS.helpersProximityCount, userId] as const,
};
