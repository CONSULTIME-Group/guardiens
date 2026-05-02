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
    if (!node || typeof IntersectionObserver === "undefined") {
      setInView(true);
      return;
    }

    const observer = new IntersectionObserver(
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
    return () => observer.disconnect();
  }, [once, root, rootMargin, threshold]);

  return { ref, inView };
}
