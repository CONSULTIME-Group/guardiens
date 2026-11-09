/**
 * Amène la carte des tâches en haut de l'écran et l'y garde pendant que les
 * blocs au-dessus (activité, tendances) prennent leur hauteur : recalage tant
 * que sa position bouge, arrêt une fois stable, au premier geste de défilement
 * du lecteur, ou après FOLLOW_MAX_MS. Recette du 09/11/2026 à 390 px : un seul
 * défilement à 350 ms laissait la carte 3 200 px plus bas. Défilement immédiat
 * (« instant ») : la page porte scroll-behavior: smooth, et une animation relancée
 * tous les quarts de seconde n'avance jamais. La carte s'arrête sous la barre fixe
 * grâce à sa marge de défilement (scroll-mt-20 sur son conteneur).
 */
export const FOLLOW_STEP_MS = 250;
export const FOLLOW_MAX_MS = 6000;
function scrollMarginTop(el: HTMLElement): number {
  try {
    return parseFloat(window.getComputedStyle(el).scrollMarginTop) || 0;
  } catch {
    return 0;
  }
}

export function followCronsCard(getEl: () => HTMLElement | null): () => void {
  let stopped = false;
  let lastTop: number | null = null;
  let stableTicks = 0;
  const started = Date.now();
  const stop = () => {
    stopped = true;
    window.clearInterval(timer);
    window.removeEventListener("wheel", stop);
    window.removeEventListener("touchmove", stop);
    window.removeEventListener("keydown", stop);
  };
  const tick = () => {
    if (stopped) return;
    const el = getEl();
    if (el) {
      const target = scrollMarginTop(el);
      const top = el.getBoundingClientRect().top;
      if (Math.abs(top - target) > 8) el.scrollIntoView?.({ block: "start", behavior: "instant" as ScrollBehavior });
      if (lastTop !== null && Math.abs(top - lastTop) <= 2 && Math.abs(top - target) <= 8) stableTicks += 1;
      else stableTicks = 0;
      lastTop = el.getBoundingClientRect().top;
    }
    if (stableTicks >= 3 || Date.now() - started > FOLLOW_MAX_MS) stop();
  };
  const timer = window.setInterval(tick, FOLLOW_STEP_MS);
  window.addEventListener("wheel", stop, { passive: true });
  window.addEventListener("touchmove", stop, { passive: true });
  window.addEventListener("keydown", stop);
  return stop;
}
