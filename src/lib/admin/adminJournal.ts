import { supabase } from "@/integrations/supabase/client";

/**
 * Lot ADM18 (lot 6 de l'arène, lot E H1) : une ligne au journal d'audit pour
 * chaque écriture admin confirmée. Renvoie ok, jamais d'exception : l'écran
 * dit « journal à compléter » quand la ligne manque, l'écriture reste faite.
 */
export async function logAdminAction(entry: {
  action: string;
  targetType: string;
  targetId: string;
  metadata?: Record<string, unknown>;
}): Promise<{ ok: boolean }> {
  try {
    const { data: userRes } = await supabase.auth.getUser();
    const adminId = userRes?.user?.id;
    if (!adminId) return { ok: false };
    const { error } = await supabase.from("admin_action_logs").insert({
      admin_id: adminId,
      action: entry.action,
      target_type: entry.targetType,
      target_id: entry.targetId,
      metadata: (entry.metadata ?? {}) as never,
    });
    return { ok: !error };
  } catch {
    return { ok: false };
  }
}
