import { useEffect, useRef } from "react";

/**
 * Suit la profondeur de scroll maximale (en %) atteinte sur la page courante
 * et appelle `onFlush(maxPct)` au moment opportun :
 *  - quand l'onglet passe en arrière-plan (`visibilitychange`)
 *  - quand le composant est démonté (changement de page)
 *  - au plus une fois par cycle (déduplication via ref)
 *
 * On évite `beforeunload` qui est désormais peu fiable sur mobile.
 */
export function useScrollDepthTracker(onFlush: (maxScrollPct: number) => void, enabled = true) {
  const maxPctRef = useRef(0);
  const flushedRef = useRef(false);
  const onFlushRef = useRef(onFlush);
  onFlushRef.current = onFlush;

  useEffect(() => {
    if (!enabled || typeof window === "undefined") return;

    const compute = () => {
      const doc = document.documentElement;
      const total = (doc.scrollHeight - window.innerHeight);
      if (total <= 0) return;
      const pct = Math.min(100, Math.round(((window.scrollY + window.innerHeight) / doc.scrollHeight) * 100));
      if (pct > maxPctRef.current) maxPctRef.current = pct;
    };

    const flush = () => {
      if (flushedRef.current) return;
      if (maxPctRef.current <= 0) return;
      flushedRef.current = true;
      onFlushRef.current(maxPctRef.current);
    };

    const onVisibility = () => {
      if (document.visibilityState === "hidden") flush();
    };

    compute();
    window.addEventListener("scroll", compute, { passive: true });
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      window.removeEventListener("scroll", compute);
      document.removeEventListener("visibilitychange", onVisibility);
      flush(); // au démontage (changement de route)
    };
  }, [enabled]);
}
