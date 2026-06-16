import { useEffect, useState } from "react";

/**
 * Hook d'impression unique : déclenche `onSeen` la première fois que l'élément
 * référencé entre dans le viewport (≥ 50 % visible pendant ≥ 200 ms par défaut).
 *
 * Déduplication par `dedupeKey` au niveau de la session (sessionStorage) :
 * une même carte/badge ne génère qu'UNE impression par session+clé, même
 * si l'utilisateur scrolle, change d'onglet, ou re-monte le composant.
 *
 * Pourquoi : éviter d'exploser le tracking (50 cartes scrollées = 1 event
 * par carte, pas 50 events spammés au mount).
 */
export function useImpressionOnce(
  ref: React.RefObject<Element>,
  dedupeKey: string | null,
  onSeen: () => void,
  options: { threshold?: number; rootMargin?: string } = {},
) {
  const [seen, setSeen] = useState(false);

  useEffect(() => {
    if (!ref.current || !dedupeKey || seen) return;
    const storageKey = `impr:${dedupeKey}`;
    try {
      if (sessionStorage.getItem(storageKey)) {
        setSeen(true);
        return;
      }
    } catch {
      // sessionStorage indisponible : on continue sans dédup
    }

    const el = ref.current;
    if (typeof IntersectionObserver === "undefined") {
      // Fallback : déclencher immédiatement
      onSeen();
      try { sessionStorage.setItem(storageKey, "1"); } catch { /* ignore */ }
      setSeen(true);
      return;
    }

    let timeoutId: number | null = null;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            timeoutId = window.setTimeout(() => {
              onSeen();
              try { sessionStorage.setItem(storageKey, "1"); } catch { /* ignore */ }
              setSeen(true);
              observer.disconnect();
            }, 200);
          } else if (timeoutId !== null) {
            clearTimeout(timeoutId);
            timeoutId = null;
          }
        }
      },
      { threshold: options.threshold ?? 0.5, rootMargin: options.rootMargin },
    );
    observer.observe(el);
    return () => {
      if (timeoutId !== null) clearTimeout(timeoutId);
      observer.disconnect();
    };
  }, [ref, dedupeKey, seen, onSeen, options.threshold, options.rootMargin]);

  return seen;
}
