/**
 * Montage différé d'un bloc sous la ligne de flottaison (lot P1b).
 *
 * Le bloc est monté quand il approche de l'écran (400 px d'avance) ou, au
 * plus tard, quand le navigateur a du temps libre après le premier
 * affichage. Le premier rendu du tableau de bord ne calcule donc que ce
 * qui est visible, le reste suit par petites tâches. Rien n'est masqué :
 * chaque bloc finit toujours par être monté.
 */
import { useEffect, useState, type ReactNode } from "react";
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
