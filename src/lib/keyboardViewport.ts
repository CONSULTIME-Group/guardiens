import { useEffect } from "react";

/**
 * Lot CLAVIER1 (29/10/2026, retour de Laurence : « la fenêtre ne monte pas et
 * est couverte par le clavier ») : une fenêtre ouverte se place dans la partie
 * réellement visible de l'écran quand le clavier du téléphone est sorti.
 *
 * Sur iOS Safari et Chrome Android, le clavier réduit la zone visible
 * (visualViewport) sans réduire la zone de mise en page : une fenêtre centrée
 * en `position: fixed` reste centrée sur tout l'écran, donc sous le clavier.
 *
 * Tant qu'au moins une fenêtre est ouverte, ce module pose sur <html> :
 *  - `--vv-height` : hauteur visible en px ;
 *  - `--vv-top` : décalage du haut de la zone visible en px ;
 *  - `data-keyboard-open` quand le clavier occupe plus de 120 px.
 * La règle CSS associée (src/index.css, « Fenêtres et clavier mobile ») recentre
 * la fenêtre et borne sa hauteur à la zone visible. Le champ actif est ramené
 * dans la zone visible de la fenêtre.
 */

export const KEYBOARD_MIN_PX = 120;
export const DIALOG_ATTR = "data-guardiens-dialog";

let users = 0;
let detach: (() => void) | null = null;

export function isKeyboardOpen(innerHeight: number, viewportHeight: number, scale = 1): boolean {
  // Un zoom au pincement réduit aussi la zone visible : ce n'est pas le clavier.
  if (Math.abs(scale - 1) > 0.01) return false;
  return innerHeight - viewportHeight > KEYBOARD_MIN_PX;
}

function sync() {
  const vv = window.visualViewport;
  const root = document.documentElement;
  if (!vv) return;
  const open = isKeyboardOpen(window.innerHeight, vv.height, vv.scale ?? 1);
  root.style.setProperty("--vv-height", `${Math.round(vv.height)}px`);
  root.style.setProperty("--vv-top", `${Math.round(vv.offsetTop)}px`);
  if (open) {
    root.setAttribute("data-keyboard-open", "");
    const active = document.activeElement as HTMLElement | null;
    if (active && active.closest?.(`[${DIALOG_ATTR}]`) && typeof active.scrollIntoView === "function") {
      active.scrollIntoView({ block: "nearest" });
    }
  } else {
    root.removeAttribute("data-keyboard-open");
  }
}

function attach(): () => void {
  const vv = window.visualViewport;
  if (!vv) return () => {};
  vv.addEventListener("resize", sync);
  vv.addEventListener("scroll", sync);
  sync();
  return () => {
    vv.removeEventListener("resize", sync);
    vv.removeEventListener("scroll", sync);
    const root = document.documentElement;
    root.removeAttribute("data-keyboard-open");
    root.style.removeProperty("--vv-height");
    root.style.removeProperty("--vv-top");
  };
}

/** Écoute partagée : un seul jeu d'écouteurs, quel que soit le nombre de fenêtres ouvertes. */
export function useKeyboardViewport(): void {
  useEffect(() => {
    if (typeof window === "undefined") return;
    users += 1;
    if (users === 1) detach = attach();
    return () => {
      users -= 1;
      if (users === 0 && detach) {
        detach();
        detach = null;
      }
    };
  }, []);
}
