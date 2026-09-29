/**
 * Lot P1 : que fait le dock Alma à l'arrivée d'un whisper ?
 * - Mobile (sous md) : jamais d'ouverture. Bulle courte « peek », sauf sur
 *   /dashboard où Alma vit déjà dans la colonne (pastille seule).
 * - Ordinateur : ouverture non bloquante, une fois par session au plus, et
 *   jamais pendant qu'un champ de formulaire a le focus.
 */
export type WhisperArrival = "open_spontaneous" | "peek" | "badge_only";

export const ALMA_SPONTANEOUS_SESSION_KEY = "alma_spontaneous_opened";
export const ALMA_PEEK_DURATION_MS = 6000;

export function decideWhisperArrival(input: {
  isMobile: boolean;
  pathname: string;
  spontaneousAlreadyUsed: boolean;
  formFieldFocused: boolean;
}): WhisperArrival {
  if (input.isMobile) {
    const onDashboard = input.pathname === "/dashboard" || input.pathname.startsWith("/dashboard/");
    return onDashboard ? "badge_only" : "peek";
  }
  if (input.spontaneousAlreadyUsed || input.formFieldFocused) return "badge_only";
  return "open_spontaneous";
}

export function isMobileViewport(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return !window.matchMedia("(min-width: 768px)").matches;
}

export function isFormFieldFocused(): boolean {
  if (typeof document === "undefined") return false;
  const el = document.activeElement as HTMLElement | null;
  if (!el) return false;
  const tag = el.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || el.isContentEditable === true;
}

export function spontaneousUsedThisSession(): boolean {
  try { return sessionStorage.getItem(ALMA_SPONTANEOUS_SESSION_KEY) === "1"; } catch { return false; }
}

export function markSpontaneousUsed(): void {
  try { sessionStorage.setItem(ALMA_SPONTANEOUS_SESSION_KEY, "1"); } catch { /* sans effet */ }
}
