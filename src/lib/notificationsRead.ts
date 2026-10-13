/**
 * Lot Z : lecture des notifications du membre connecté.
 *
 * « Tout marquer comme lu » vise toutes les notifications non lues du membre
 * en base, au-delà des 20 (cloche) ou 50 (page) chargées à l'écran. La
 * politique « Users can update their own notifications » (auth.uid() =
 * user_id) l'autorise.
 */
import { supabase } from "@/integrations/supabase/client";

export async function markAllNotificationsRead(userId: string): Promise<{ ok: boolean; readAt: string }> {
  const readAt = new Date().toISOString();
  const { error } = await supabase
    .from("notifications")
    .update({ read_at: readAt })
    .eq("user_id", userId)
    .is("read_at", null);
  return { ok: !error, readAt };
}

export async function markNotificationRead(id: string): Promise<{ ok: boolean; readAt: string }> {
  const readAt = new Date().toISOString();
  const { error } = await supabase
    .from("notifications")
    .update({ read_at: readAt })
    .eq("id", id)
    .is("read_at", null);
  return { ok: !error, readAt };
}
