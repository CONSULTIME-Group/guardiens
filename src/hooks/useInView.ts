import { useEffect, useRef, useState } from "react";

/**
 * Lightweight IntersectionObserver hook.
 * Triggers once when the element enters the viewport (by default).
 */
export function useInView<T extends Element = HTMLDivElement>(
  options: IntersectionObserverInit & { once?: boolean } = {}
) {
  const { once = true, root = null, rootMargin = "0px 0px -10% 0px", threshold = 0.15 } = options;
  const ref = useRef<T | null>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const node = ref.current;
    const IO =
      typeof window !== "undefined"
        ? (window as unknown as { IntersectionObserver?: typeof IntersectionObserver })
            .IntersectionObserver
        : undefined;
    if (!node || typeof IO !== "function") {
      // Pas d'IntersectionObserver (vieux WebView, in-app browser…) → on affiche tout.
      setInView(true);
      return;
    }

    let observer: IntersectionObserver;
    try {
      observer = new IO(
        ([entry]) => {
          if (entry.isIntersecting) {
            setInView(true);
            if (once) observer.unobserve(entry.target);
          } else if (!once) {
            setInView(false);
          }
        },
        { root, rootMargin, threshold }
      );
      observer.observe(node);
    } catch {
      setInView(true);
      return;
    }
    return () => observer.disconnect();
  }, [once, root, rootMargin, threshold]);

  return { ref, inView };
}
