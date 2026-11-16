import { useEffect, useState } from "react";

/**
 * Lot ART1 (16/11/2026) : sur la page d'un article, au téléphone, la
 * pastille d'Alma se réduit à son avatar pendant la lecture (défilement
 * vers le bas) et revient entière dès que le lecteur remonte, en haut de
 * page et en fin d'article. Mesure du 16/11 à 390 px : la pastille entière
 * (avatar, nom, mention IA, « Question », menu) couvrait la dernière ligne
 * de texte à l'écran pendant toute la lecture.
 */

export const READING_TOP_ZONE_PX = 320;
export const READING_BOTTOM_ZONE_PX = 240;
export const READING_DIRECTION_PX = 48;
export const READING_MAX_WIDTH_PX = 767;

export function isArticleReadingPath(pathname: string): boolean {
  if (/^\/actualites\/page\//.test(pathname)) return false;
  return /^\/(actualites|guides)\/[^/]+\/?$/.test(pathname);
}

export type ReadingState = { collapsed: boolean; anchor: number };

export const READING_INITIAL: ReadingState = { collapsed: false, anchor: 0 };

/** Un pas de défilement : y position actuelle, maxY défilement possible. */
export function nextReadingState(prev: ReadingState, y: number, maxY: number): ReadingState {
  if (y < READING_TOP_ZONE_PX || maxY - y < READING_BOTTOM_ZONE_PX) {
    return { collapsed: false, anchor: y };
  }
  if (prev.collapsed) {
    if (y > prev.anchor) return { collapsed: true, anchor: y };
    if (prev.anchor - y > READING_DIRECTION_PX) return { collapsed: false, anchor: y };
    return prev;
  }
  if (y < prev.anchor) return { collapsed: false, anchor: y };
  if (y - prev.anchor > READING_DIRECTION_PX) return { collapsed: true, anchor: y };
  return prev;
}

export function useArticleReadingCollapse(enabled: boolean, pathname: string): boolean {
  const [collapsed, setCollapsed] = useState(false);
  useEffect(() => {
    setCollapsed(false);
    if (!enabled || typeof window === "undefined") return;
    const media = window.matchMedia?.(`(max-width: ${READING_MAX_WIDTH_PX}px)`);
    if (!media) return;
    let state: ReadingState = { collapsed: false, anchor: window.scrollY };
    let frame = 0;
    const read = () => {
      frame = 0;
      if (!media.matches) {
        if (state.collapsed) setCollapsed(false);
        state = { collapsed: false, anchor: window.scrollY };
        return;
      }
      const maxY = document.documentElement.scrollHeight - window.innerHeight;
      const next = nextReadingState(state, window.scrollY, maxY);
      if (next.collapsed !== state.collapsed) setCollapsed(next.collapsed);
      state = next;
    };
    const onScroll = () => {
      if (!frame) frame = window.requestAnimationFrame(read);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [enabled, pathname]);
  return enabled && collapsed;
}
