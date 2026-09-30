import { useEffect, useState } from "react";

/** Vrai quand la requête média correspond ; faux hors navigateur (tests jsdom). */
export function useMatchMedia(query: string): boolean {
  const get = () =>
    typeof window !== "undefined" && typeof window.matchMedia === "function"
      ? window.matchMedia(query).matches
      : false;
  const [match, setMatch] = useState(get);
  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return;
    const m = window.matchMedia(query);
    const update = () => setMatch(m.matches);
    update();
    m.addEventListener?.("change", update);
    return () => m.removeEventListener?.("change", update);
  }, [query]);
  return match;
}
