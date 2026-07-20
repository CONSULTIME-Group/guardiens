import type { PostgrestError } from "@supabase/supabase-js";

export type MissionEligibilityReason = "profile_incomplete" | "account_not_active";

/**
 * Détecte, à partir d'une erreur Supabase, un motif d'inéligibilité serveur
 * (enforce_mutual_aid_eligibility / enforce_community_eligibility).
 * Retourne null si l'erreur n'est pas un motif d'éligibilité.
 */
export function detectEligibilityReason(
  err: PostgrestError | { message?: string; hint?: string | null; details?: string | null } | null | undefined,
): MissionEligibilityReason | null {
  if (!err) return null;
  const hay = `${err.hint ?? ""} ${err.message ?? ""} ${(err as any).details ?? ""}`.toLowerCase();
  if (hay.includes("account_not_active")) return "account_not_active";
  if (hay.includes("profile_incomplete")) return "profile_incomplete";
  return null;
}
