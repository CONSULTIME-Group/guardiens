/**
 * Lot X2 (13/10/2026) : un compte gardien qui enregistre une annonce reçoit
 * l'espace propriétaire (sitter vers both, transition libre-service de
 * change_user_role) et bascule dessus.
 *
 * Constat A-02 de l'audit du 13/10 : 3 annonces enregistrées par des comptes
 * gardien restaient absentes de /sits, du tableau de bord et de la navigation,
 * candidatures comprises (seuls une notification ou un email y menaient).
 */
import { supabase } from "@/integrations/supabase/client";

type Role = "owner" | "sitter" | "both" | string | null | undefined;

export function needsOwnerSpace(role: Role): boolean {
  return role === "sitter";
}

export async function ensureOwnerSpace(opts: {
  userId: string;
  role: Role;
  refreshProfile: () => Promise<void>;
  switchRole: (role: "owner" | "sitter") => void;
}): Promise<boolean> {
  if (!needsOwnerSpace(opts.role)) return false;
  try {
    const { error } = await supabase.rpc("change_user_role", { p_user_id: opts.userId, p_new_role: "both" as any });
    if (error) throw error;
    await opts.refreshProfile();
    opts.switchRole("owner");
    return true;
  } catch (e) {
    // L'annonce est enregistrée : l'espace se rattrape par « Propriétaire + ».
    console.warn("[ownerSpace] passage en double rôle impossible", e);
    return false;
  }
}
