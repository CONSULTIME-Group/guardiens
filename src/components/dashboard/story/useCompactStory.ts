/**
 * Lot L4 : mode compact du récit (décision de l'arène du 08/11/2026 : règles
 * compactes au-delà de 115 %). Vrai quand le texte est agrandi (police de base
 * au-dessus de 18,4 px) ou quand l'écran utile est étroit ou court, ce que
 * produit un zoom de page à 130 % sur téléphone (360 × 740 devient 277 × 569).
 */
import { useEffect, useState } from "react";

export const COMPACT_QUERY = "(max-width: 319px), (max-height: 620px)";
export const COMPACT_ROOT_FONT_PX = 16 * 1.15;

function readCompact(): boolean {
  if (typeof window === "undefined") return false;
  let narrow = false;
  try {
    narrow = typeof window.matchMedia === "function" && window.matchMedia(COMPACT_QUERY).matches;
  } catch {
    narrow = false;
  }
  let large = false;
  try {
    const px = parseFloat(window.getComputedStyle(document.documentElement).fontSize);
    large = Number.isFinite(px) && px > COMPACT_ROOT_FONT_PX;
  } catch {
    large = false;
  }
  return narrow || large;
}

export function useCompactStory(): boolean {
  const [compact, setCompact] = useState(readCompact);
  useEffect(() => {
    const update = () => setCompact(readCompact());
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);
  return compact;
}
