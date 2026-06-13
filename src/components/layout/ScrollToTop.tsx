import { useEffect } from "react";
import { useLocation, useNavigationType } from "react-router-dom";

/**
 * Scroll handling sur changement de route :
 * - PUSH / REPLACE : scroll en haut (nouvelle page).
 * - POP (back navigateur) : on laisse le navigateur restaurer la position.
 * Évite le flash désagréable « tout en haut » lorsque l'utilisateur revient en arrière.
 */
const ScrollToTop = () => {
  const { pathname } = useLocation();
  const navType = useNavigationType();

  useEffect(() => {
    if (navType === "POP") return;
    window.scrollTo({ top: 0, left: 0, behavior: "instant" as ScrollBehavior });
  }, [pathname, navType]);

  return null;
};

export default ScrollToTop;
