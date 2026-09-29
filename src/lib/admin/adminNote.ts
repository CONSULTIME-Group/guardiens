import { supabase } from "@/integrations/supabase/client";

/**
 * Écriture unique de la note interne (dialogue Note et panneau Fiche membre).
 * Lot A13 : chaque enregistrement ajoute une ligne update_admin_note au
 * journal d'audit, avec les 140 premiers caractères de la nouvelle note.
 */
export async function saveAdminNote(userId: string, note: string): Promise<{ ok: boolean }> {
  const { error } = await supabase
    .from("profile_moderation")
    .upsert({ profile_id: userId, admin_notes: note }, { onConflict: "profile_id" });
  if (error) return { ok: false };
  const { data: authData } = await supabase.auth.getUser();
  const adminId = authData.user?.id ?? null;
  if (adminId) {
    await supabase.from("admin_action_logs").insert({
      admin_id: adminId,
      action: "update_admin_note",
      target_type: "user",
      target_id: userId,
      note: note.slice(0, 140),
    });
  }
  return { ok: true };
}
