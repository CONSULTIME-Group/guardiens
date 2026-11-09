/**
 * Lot L6 (09/11/2026, emprunt A-06 de l'arène v2) : décliner une candidature
 * avec un mot aimable. Un seul chemin, partagé par la liste des candidatures
 * de l'annonce (ApplicationsList) et la page d'une candidature
 * (/candidatures/:id) : statut rejected, message système puis mot du
 * propriétaire dans la conversation si elle existe, email application-declined.
 */
import { supabase } from "@/integrations/supabase/client";
import { sendTransactionalEmail } from "@/lib/sendTransactionalEmail";
import { startConversation } from "@/lib/conversation";
import { invalidateMyApplications } from "@/lib/dashboardShared";

/** Mots proposés, affirmatifs ; le premier est choisi d'office, chacun reste modifiable. */
export const KIND_DECLINE_MESSAGES: readonly string[] = [
  "Merci beaucoup pour votre candidature et pour votre message. J'ai retenu un autre gardien pour cette garde. Au plaisir de vous croiser sur Guardiens !",
  "Merci pour votre proposition, elle m'a fait plaisir. Les dates collaient mieux avec un autre gardien cette fois-ci. Je garde votre profil en tête pour une prochaine garde.",
  "Merci d'avoir pensé à nous. J'ai choisi un gardien installé plus près de chez nous. Belle continuation sur Guardiens !",
];

export const DECLINE_MESSAGE_MAX = 300;
export const DECLINE_SYSTEM_MESSAGE = "Votre candidature a été déclinée pour cette garde.";

export interface DeclineTarget {
  applicationId: string;
  sitId: string;
  sitterId: string;
  sitTitle: string;
  ownerId: string;
  message?: string | null;
}

/** Décline la candidature ; lève une erreur si le statut n'a pas pu être écrit. */
export async function declineApplication(t: DeclineTarget): Promise<void> {
  const { error } = await supabase.from("applications").update({ status: "rejected" as never }).eq("id", t.applicationId);
  if (error) throw error;

  const word = (t.message ?? "").trim().slice(0, DECLINE_MESSAGE_MAX);
  const { data: found } = await supabase
    .from("conversations")
    .select("id")
    .eq("sit_id", t.sitId)
    .eq("sitter_id", t.sitterId)
    .maybeSingle();
  let conv: { id: string } | null = found ?? null;
  // Lot L6 : un mot aimable arrive toujours, quitte à ouvrir la conversation.
  if (!conv && word) {
    const { conversationId } = await startConversation({ otherUserId: t.sitterId, context: "sit_application", sitId: t.sitId });
    conv = conversationId ? { id: conversationId } : null;
  }
  if (conv) {
    await supabase.from("messages").insert({
      conversation_id: conv.id,
      sender_id: t.ownerId,
      content: DECLINE_SYSTEM_MESSAGE,
      is_system: true,
    });
    if (word) {
      await supabase.from("messages").insert({
        conversation_id: conv.id,
        sender_id: t.ownerId,
        content: word,
        is_system: false,
      });
    }
    await supabase.from("conversations").update({ updated_at: new Date().toISOString() }).eq("id", conv.id);
  }

  invalidateMyApplications(t.ownerId);

  // Email transactionnel, non bloquant.
  sendTransactionalEmail({
    templateName: "application-declined",
    recipientUserId: t.sitterId,
    idempotencyKey: `app-declined-${t.applicationId}`,
    templateData: { sitTitle: t.sitTitle },
  }).catch(() => {});
}
