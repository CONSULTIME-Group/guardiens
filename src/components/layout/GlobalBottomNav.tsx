import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { BottomNav } from "./Navigation";
import { useShellMode } from "./useShellMode";
import { useChromeVisibility } from "./ChromeVisibility";

/**
 * Montage unique et global de la barre de navigation basse.
 *
 * La barre vivait dans AppLayout, donc toutes les routes qui n'utilisent pas
 * la coquille applicative (Landing, pages publiques, pages légales, fiches
 * d'annonce) laissaient un utilisateur connecté sans navigation mobile. Elle
 * est désormais montée une seule fois, ici, sous le routeur.
 *
 * Aucun écouteur de défilement, aucun observateur, aucune boucle d'animation :
 * la navigation principale ne dépend que de la route et du mode de coquille.
 */

/** Parcours où la barre basse ne doit jamais apparaître. */
const EXCLUDED_EXACT = new Set([
  "/login",
  "/inscription",
  "/register",
  "/forgot-password",
  "/reset-password",
  "/auth/confirm",
  "/onboarding/affinity",
]);

/** L'espace d'administration fournit sa propre navigation mobile. */
const EXCLUDED_PREFIXES = ["/admin"];

export const isBottomNavExcluded = (pathname: string): boolean => {
  const path = pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname;
  if (EXCLUDED_EXACT.has(path)) return true;
  return EXCLUDED_PREFIXES.some((prefix) => path === prefix || path.startsWith(`${prefix}/`));
};

const GlobalBottomNav = () => {
  const { pathname } = useLocation();
  const shell = useShellMode();
  const { bottomNavHidden } = useChromeVisibility();

  const mounted = shell === "app" && !isBottomNavExcluded(pathname);

  // Réserve d'espace globale : la barre est en position fixe, les pages hors
  // coquille applicative n'ont aucun padding bas. La classe active une règle
  // unique adossée à --bottom-nav-h, plutôt qu'une valeur répétée page à page.
  useEffect(() => {
    if (typeof document === "undefined") return;
    const root = document.documentElement;
    const reserve = mounted && !bottomNavHidden;
    root.classList.toggle("has-global-bottom-nav", reserve);
    return () => root.classList.remove("has-global-bottom-nav");
  }, [mounted, bottomNavHidden]);

  if (!mounted) return null;
  return <BottomNav />;
};

export default GlobalBottomNav;
