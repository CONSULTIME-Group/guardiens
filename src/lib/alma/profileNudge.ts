/**
 * Lot J3 : Alma parle du profil seulement sous 40 % de complétion.
 * Au dessus, chuchotements, bulles, journal et amorces se tournent vers
 * l'entraide, les projets et les annonces proches (moteur J2-A).
 */
export const ALMA_PROFILE_NUDGE_THRESHOLD = 40;

export function profileNudgeAllowed(completion: number | null | undefined): boolean {
  return typeof completion === "number" && completion < ALMA_PROFILE_NUDGE_THRESHOLD;
}
