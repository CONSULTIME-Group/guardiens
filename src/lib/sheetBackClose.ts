import { useEffect, useRef } from "react";

/**
 * Lot L1 (08/11/2026, arène tableau de bord v2) : le geste « Retour » du
 * téléphone referme la feuille ouverte au lieu de quitter la page.
 *
 * À l'ouverture, une entrée est ajoutée à l'historique, à la même adresse,
 * marquée par un identifiant propre à la feuille. « Retour » la retire : la
 * feuille se referme. Une feuille refermée par l'écran (croix, voile, bouton)
 * retire elle-même son entrée, tant qu'elle est encore au sommet de
 * l'historique. Après une navigation vers une autre page, l'entrée reste en
 * place et rien n'est retiré.
 */
export const SHEET_HISTORY_KEY = "guardiensSheet";

type MarkedState = Record<string, unknown> | null;

function topMark(): unknown {
  const s = window.history.state as MarkedState;
  return s && typeof s === "object" ? s[SHEET_HISTORY_KEY] : undefined;
}

export function useCloseOnBack(enabled: boolean, close: () => void): void {
  const closeRef = useRef(close);
  closeRef.current = close;

  useEffect(() => {
    if (!enabled || typeof window === "undefined") return;
    const id = Math.random().toString(36).slice(2);
    const base = window.history.state && typeof window.history.state === "object" ? (window.history.state as Record<string, unknown>) : {};
    try {
      window.history.pushState({ ...base, [SHEET_HISTORY_KEY]: id }, "");
    } catch {
      return;
    }
    let popped = false;
    const onPop = () => {
      if (popped || topMark() === id) return;
      popped = true;
      closeRef.current();
    };
    window.addEventListener("popstate", onPop);
    return () => {
      window.removeEventListener("popstate", onPop);
      if (!popped && topMark() === id) {
        try {
          window.history.back();
        } catch {
          /* historique indisponible */
        }
      }
    };
  }, [enabled]);
}
