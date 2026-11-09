import { supabase } from "@/integrations/supabase/client";

/**
 * Lot ADM18 (lot C ME1) : un message admin qui échoue laisse sa trace dans le
 * journal des envois (admin_message_logs, « Historique de mes envois »),
 * quel que soit l'écran d'envoi. Sans effet bloquant.
 */
export async function logAdminMessageFailure(targetUserId: string, content: string, errorMessage: string): Promise<void> {
  try {
    await supabase.rpc("admin_log_message_failure", {
      p_target_user_id: targetUserId,
      p_content: content,
      p_error_message: errorMessage || "Erreur inconnue",
    });
  } catch {
    /* trace au mieux */
  }
}
