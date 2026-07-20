import type { PostgrestError } from "@supabase/supabase-js";

export type MissionEligibilityReason = "account_not_active";

/**
 * Détecte, à partir d'une erreur Supabase, un motif d'inéligibilité serveur.
 * Depuis la vague 31, seul le compte non actif est un motif d'inéligibilité
 * pour l'entraide : la complétion de profil n'est plus une condition d'accès.
 */
export function detectEligibilityReason(
  err: PostgrestError | { message?: string; hint?: string | null; details?: string | null } | null | undefined,
): MissionEligibilityReason | null {
  if (!err) return null;
  const hay = `${err.hint ?? ""} ${err.message ?? ""} ${(err as any).details ?? ""}`.toLowerCase();
  if (hay.includes("account_not_active")) return "account_not_active";
  return null;
}
