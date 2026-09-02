import { useEffect } from "react";
import { useLocation } from "react-router-dom";

/**
 * Capture globale du paramètre ?ref= de parrainage.
 * À chaque changement d'URL, si un code est présent et qu'aucune valeur
 * n'est déjà stockée, on l'écrit dans sessionStorage pour que l'inscription
 * par email ou Google puisse le rattacher, quelle que soit la page d'entrée.
 * Pas de rendu, pas d'appel réseau.
 */
export function RefCapture() {
  const location = useLocation();

  useEffect(() => {
    try {
      const params = new URLSearchParams(location.search);
      const ref = params.get("ref");
      if (!ref) return;
      const existing = sessionStorage.getItem("guardiens_ref");
      if (existing) return;
      sessionStorage.setItem("guardiens_ref", ref);
    } catch {
      // sessionStorage peut être indisponible dans certains contextes.
    }
  }, [location.search]);

  return null;
}

export default RefCapture;
