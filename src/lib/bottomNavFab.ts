/**
 * Règle unique d'affichage du bouton flottant central de la barre basse.
 *
 * Le bouton flottant ne s'affiche pas quand la page porte déjà une action
 * primaire ou une barre d'action collante : parcours de création et d'édition,
 * pages de détail avec appel à l'action, réglages et abonnement.
 *
 * Les quatre onglets de la barre restent toujours visibles : seul le bouton
 * central disparaît.
 */

/** Routes exactes sans bouton flottant. */
const NO_FAB_EXACT = new Set([
  "/sits/create",
  "/sits/new",
  "/petites-missions/creer",
  "/questions/nouvelle",
  "/profile",
  "/settings",
  "/mon-abonnement",
  "/pros/inscription",
]);

/** Préfixes sans bouton flottant. */
const NO_FAB_PREFIXES = ["/onboarding", "/review", "/messages/"];

/** Pages de détail ou d'édition qui portent leur propre action primaire. */
const NO_FAB_PATTERNS: RegExp[] = [
  /^\/sits\/[^/]+\/edit$/,
  /^\/sits\/[^/]+$/,
  /^\/annonces\/[^/]+$/,
  /^\/petites-missions\/[^/]+$/,
  /^\/gardiens\/[^/]+$/,
  /^\/pros\/[^/]+$/,
];

export const isFabHidden = (pathname: string): boolean => {
  const path = pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname;
  if (NO_FAB_EXACT.has(path)) return true;
  if (NO_FAB_PREFIXES.some((p) => path === p || path.startsWith(`${p}/`) || path.startsWith(p))) {
    return true;
  }
  return NO_FAB_PATTERNS.some((re) => re.test(path));
};

export default isFabHidden;
