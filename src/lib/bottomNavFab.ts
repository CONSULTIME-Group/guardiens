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
];

/** Sous chemins qui restent des pages de liste ou de navigation. */
const KEEP_FAB_EXACT = new Set([
  "/annonces/international",
  "/petites-missions/lyon",
]);

const KEEP_FAB_PREFIXES: string[] = [];

export const isFabHidden = (pathname: string): boolean => {
  const path = pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname;
  if (KEEP_FAB_EXACT.has(path)) return false;
  if (KEEP_FAB_PREFIXES.some((p) => path === p || path.startsWith(`${p}/`))) return false;
  if (NO_FAB_EXACT.has(path)) return true;
  if (NO_FAB_PREFIXES.some((p) => path === p || path.startsWith(`${p}/`) || path.startsWith(p))) {
    return true;
  }
  return NO_FAB_PATTERNS.some((re) => re.test(path));
};

/**
 * Lot M2 (12/10/2026) : bouton central de la barre basse (mobile).
 *
 * Constat (base, 14 jours au 12/10) : 16 des 43 sorties sans titre du
 * formulaire de coup de main venaient, sur mobile, de l'accueil, de la
 * recherche ou des annonces (12 gardiens, 4 double rôle), là où le bouton
 * central « Publier » menait au formulaire.
 * Décision de Jérémie du 12/10/2026 : pour un gardien, le bouton mène à ses
 * disponibilités ; le coup de main reste proposé depuis l'entraide.
 */
export const SITTER_AVAILABILITY_PATH = "/profile?focus=availability";

export interface BottomNavFab {
  to: string;
  label: string;
  /** Nom annoncé par les lecteurs d'écran. */
  ariaLabel: string;
  icon: "plus" | "availability";
}

export function bottomNavFab(path: string, isOwnerView: boolean): BottomNavFab {
  if (path.startsWith("/petites-missions")) {
    return { to: "/petites-missions/creer", label: "Publier", ariaLabel: "Publier", icon: "plus" };
  }
  if (isOwnerView) return { to: "/sits/create", label: "Publier", ariaLabel: "Publier", icon: "plus" };
  return { to: SITTER_AVAILABILITY_PATH, label: "Dispo", ariaLabel: "Mes disponibilités", icon: "availability" };
}

export default isFabHidden;
