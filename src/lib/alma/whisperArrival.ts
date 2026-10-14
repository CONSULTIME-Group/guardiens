/**
 * Lot P1 : que fait le dock Alma à l'arrivée d'un whisper ?
 * - Mobile (sous md) : jamais d'ouverture. Bulle courte « peek », sauf sur
 *   /dashboard où Alma vit déjà dans la colonne (pastille seule).
 * - Ordinateur : ouverture non bloquante, une fois par session au plus, et
 *   jamais pendant qu'un champ de formulaire a le focus.
 * - Lot A2 (décision de Jérémie du 14/10/2026) : une relance d'usage
 *   (usage_nudge) s'affiche en aperçu seul, le panneau ne se déplie qu'au
 *   geste de la personne. 449 ouvertures sur 519 venaient d'un whisper.
 */
export type WhisperArrival = "open_spontaneous" | "peek" | "badge_only";

export const ALMA_SPONTANEOUS_SESSION_KEY = "alma_spontaneous_opened";
export const ALMA_PEEK_DURATION_MS = 6000;

/** Types de whisper qui ne déplient jamais le panneau d'eux-mêmes. */
export const ALMA_PREVIEW_ONLY_TYPES: readonly string[] = ["usage_nudge"];

export function decideWhisperArrival(input: {
  isMobile: boolean;
  pathname: string;
  spontaneousAlreadyUsed: boolean;
  formFieldFocused: boolean;
  /** Type du whisper arrivé (usage_nudge, cultural_fact, etc.). */
  whisperType?: string | null;
}): WhisperArrival {
  if (input.isMobile) {
    const onDashboard = input.pathname === "/dashboard" || input.pathname.startsWith("/dashboard/");
    return onDashboard ? "badge_only" : "peek";
  }
  if (input.spontaneousAlreadyUsed || input.formFieldFocused) return "badge_only";
  if (input.whisperType && ALMA_PREVIEW_ONLY_TYPES.includes(input.whisperType)) return "peek";
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
