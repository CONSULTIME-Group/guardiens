/**
 * Lot A4 (audit Alma du 14/10/2026) : après un gabarit de sûreté d'Alma
 * (urgence animale, personne en danger, détresse, maltraitance, conflit de
 * garde), les chuchotements, faits culturels et bulles de moment se taisent
 * 2 heures. alma-chat le demande par `safety` et `quiet_minutes` dans sa
 * réponse ; le drapeau vit dans le navigateur (localStorage, tous onglets).
 */
export const SAFETY_QUIET_KEY = "alma_safety_quiet_until";
export const DEFAULT_SAFETY_QUIET_MINUTES = 120;

/** Pose le silence pour `minutes` (borné entre 1 minute et 24 heures). */
export function setSafetyQuiet(minutes: number = DEFAULT_SAFETY_QUIET_MINUTES, now: number = Date.now()): void {
  const m = Number.isFinite(minutes) ? Math.min(Math.max(minutes, 1), 24 * 60) : DEFAULT_SAFETY_QUIET_MINUTES;
  const until = now + m * 60_000;
  try {
    const previous = Number(localStorage.getItem(SAFETY_QUIET_KEY) ?? 0);
    if (!Number.isFinite(previous) || previous < until) localStorage.setItem(SAFETY_QUIET_KEY, String(until));
  } catch {
    /* stockage indisponible : le silence de session reste assuré par l'écran */
  }
}

/** Vrai tant que le silence de sûreté court. */
export function isSafetyQuiet(now: number = Date.now()): boolean {
  try {
    const until = Number(localStorage.getItem(SAFETY_QUIET_KEY) ?? 0);
    return Number.isFinite(until) && until > now;
  } catch {
    return false;
  }
}

/** Lit la réponse d'alma-chat : pose le silence quand elle porte un gabarit de sûreté. */
export function applySafetyQuietFromResponse(data: unknown, now: number = Date.now()): boolean {
  const d = (data ?? {}) as { safety?: unknown; quiet_minutes?: unknown };
  if (typeof d.safety !== "string" || !d.safety) return false;
  setSafetyQuiet(typeof d.quiet_minutes === "number" ? d.quiet_minutes : DEFAULT_SAFETY_QUIET_MINUTES, now);
  return true;
}
