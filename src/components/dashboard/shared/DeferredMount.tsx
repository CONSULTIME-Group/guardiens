/**
 * Montage différé d'un bloc sous la ligne de flottaison (lot P1b).
 *
 * Le bloc est monté quand il approche de l'écran (400 px d'avance) ou, au
 * plus tard, quand le navigateur a du temps libre après le premier
 * affichage. Le premier rendu du tableau de bord ne calcule donc que ce
 * qui est visible, le reste suit par petites tâches. Rien n'est masqué :
 * chaque bloc finit toujours par être monté.
 */
import { startTransition, useEffect, useState, type ReactNode } from "react";
import { useInView } from "@/hooks/useInView";
import { afterIdle } from "@/lib/alma/weatherCache";

export function DeferredMount({
  children,
  minHeight = 120,
  idleMs = 2500,
}: {
  children: ReactNode;
  minHeight?: number;
  idleMs?: number;
}) {
  const { ref, inView } = useInView<HTMLDivElement>({ rootMargin: "400px 0px 400px 0px", threshold: 0 });
  const [idle, setIdle] = useState(false);
  useEffect(() => {
    let alive = true;
    void afterIdle(idleMs).then(() => { if (alive) setIdle(true); });
    return () => { alive = false; };
  }, [idleMs]);
  const mounted = inView || idle;
  return (
    <div ref={ref} className="min-w-0">
      {mounted ? children : <div aria-hidden="true" style={{ minHeight }} />}
    </div>
  );
}

/** Vrai au-dessus de 1024 px (colonne de droite du tableau de bord). */
export function useIsDesktopRail(): boolean {
  const query = "(min-width: 1024px)";
  const [match, setMatch] = useState(() =>
    typeof window !== "undefined" && typeof window.matchMedia === "function"
      ? window.matchMedia(query).matches
      : false,
  );
  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return;
    const m = window.matchMedia(query);
    const update = () => setMatch(m.matches);
    update();
    m.addEventListener?.("change", update);
    return () => m.removeEventListener?.("change", update);
  }, []);
  return match;
}

/**
 * Lot P3 : rendu par étapes. Le bloc est monté juste après le premier
 * affichage (image suivante, en transition), même s'il est visible. La
 * première tâche du tableau de bord ne rend que le haut de page ; la place
 * est réservée (minHeight) pour éviter tout saut de mise en page.
 */
export function StagedMount({ children, minHeight = 0, testId }: { children: ReactNode; minHeight?: number; testId?: string }) {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let alive = true;
    const go = () => { if (alive) startTransition(() => setReady(true)); };
    const raf = typeof requestAnimationFrame === "function" ? requestAnimationFrame(() => setTimeout(go, 0)) : null;
    if (raf === null) setTimeout(go, 0);
    return () => { alive = false; if (raf !== null && typeof cancelAnimationFrame === "function") cancelAnimationFrame(raf); };
  }, []);
  if (ready) return <>{children}</>;
  return <div aria-hidden="true" data-staged-placeholder={testId ?? ""} style={{ minHeight }} />;
}
