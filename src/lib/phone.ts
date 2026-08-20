/**
 * Validation "numéro plausible" pour les contacts du guide de la maison.
 * Volontairement permissive (FR et international) : on bloque l'évident
 * (lettres, 3 chiffres, 40 chiffres), pas les formats exotiques réels.
 */

export const PHONE_MAX_LENGTH = 20;

/** true si vide (champ facultatif non rempli) ou plausible. */
export function isPlausiblePhone(raw: string | null | undefined): boolean {
  if (raw == null) return true;
  const v = raw.trim();
  if (v === "") return true;
  if (!/^\+?[0-9 .()-]+$/.test(v)) return false;
  const digits = v.replace(/\D/g, "");
  return digits.length >= 8 && digits.length <= 15;
}

export const PHONE_ERROR_MESSAGE = "Ce numéro ne semble pas valide (8 à 15 chiffres, indicatif + accepté).";
