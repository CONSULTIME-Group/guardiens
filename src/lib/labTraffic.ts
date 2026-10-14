/**
 * Lot perf 1 (14/10/2026) : trafic de robot ou de laboratoire, jamais compté
 * dans la mesure d'audience ni dans la mesure de vitesse.
 *
 * - robot reconnu à son agent (isBotUserAgent, même règle que le bandeau
 *   cookies) ;
 * - navigateur piloté (navigator.webdriver : Playwright, Selenium) ;
 * - mesure de laboratoire marquée par `?perf_lab=1` (Lighthouse, sondes),
 *   gardée pour toute la session de l'onglet.
 * Pure côté appelant : une erreur d'accès renvoie false (visiteur compté).
 */
import { isBotUserAgent } from "@/lib/cookieConsent";

export const PERF_LAB_PARAM = "perf_lab";
const PERF_LAB_KEY = "guardiens_perf_lab";

export function isPerfLabSession(search: string = typeof window !== "undefined" ? window.location.search : ""): boolean {
  try {
    if (new URLSearchParams(search).get(PERF_LAB_PARAM) === "1") {
      try { sessionStorage.setItem(PERF_LAB_KEY, "1"); } catch { /* stockage indisponible */ }
      return true;
    }
    return typeof sessionStorage !== "undefined" && sessionStorage.getItem(PERF_LAB_KEY) === "1";
  } catch {
    return false;
  }
}

export function isAutomatedBrowser(): boolean {
  try {
    return typeof navigator !== "undefined" && (navigator as Navigator & { webdriver?: boolean }).webdriver === true;
  } catch {
    return false;
  }
}

/** Vrai pour un robot, un navigateur piloté ou une mesure de laboratoire. */
export function isLabOrBotTraffic(): boolean {
  if (typeof window === "undefined") return false;
  return isBotUserAgent() || isAutomatedBrowser() || isPerfLabSession();
}
