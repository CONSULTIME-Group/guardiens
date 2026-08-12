/**
 * Logique pure de l'onglet Conversations admin.
 * Isolée du rendu pour être testable, et pour garder une seule source de
 * vérité sur les libellés de contexte et le statut de réponse.
 *
 * Rappel de doctrine : cet écran est en lecture stricte. Rien ici ne doit
 * produire d'écriture, ni marquer un message comme lu côté membre.
 */

export type ConversationPeriod = "7d" | "30d" | "90d" | "all";
export type ConversationSort = "last_message" | "unread_age" | "volume";

export interface AdminConversationRow {
  conversation_id: string;
  context_type: string | null;
  sit_id: string | null;
  sit_title: string | null;
  small_mission_id: string | null;
  mission_title: string | null;
  owner_id: string | null;
  owner_name: string | null;
  owner_avatar: string | null;
  sitter_id: string | null;
  sitter_name: string | null;
  sitter_avatar: string | null;
  message_count: number;
  human_count: number;
  distinct_senders: number;
  unread_count: number;
  oldest_unread_at: string | null;
  last_message_at: string | null;
  last_message_excerpt: string | null;
  last_sender_id: string | null;
  created_at: string;
  total_count: number;
}

/** Libellés de contexte, alignés sur l'enum conversation_context en base. */
export const CONVERSATION_CONTEXT_LABEL: Record<string, string> = {
  sit_application: "Candidature",
  sitter_inquiry: "Contact gardien",
  mission_help: "Coup de main",
  helper_inquiry: "Contact coup de main",
  owner_pitch: "Proposition propriétaire",
  private: "Privé",
};

export const contextLabel = (ctx: string | null | undefined): string =>
  CONVERSATION_CONTEXT_LABEL[ctx || "private"] || (ctx ?? "Privé");

/** Bornes de période, en ISO, ou null pour « depuis le début ». */
export const periodSince = (
  period: ConversationPeriod,
  now: Date = new Date(),
): string | null => {
  const days = period === "7d" ? 7 : period === "30d" ? 30 : period === "90d" ? 90 : null;
  if (days === null) return null;
  return new Date(now.getTime() - days * 24 * 60 * 60 * 1000).toISOString();
};

export type ReplyState = "empty" | "unanswered" | "exchanged";

/**
 * Statut de réponse d'une conversation :
 * aucun message humain, un seul participant a écrit, ou vrai échange.
 */
export const replyState = (row: Pick<AdminConversationRow, "human_count" | "distinct_senders">): ReplyState => {
  if (!row.human_count) return "empty";
  return row.distinct_senders <= 1 ? "unanswered" : "exchanged";
};

export const REPLY_STATE_LABEL: Record<ReplyState, string> = {
  empty: "Aucun message",
  unanswered: "Sans réponse",
  exchanged: "Échange",
};

/** Titre de l'objet lié, annonce ou mission, sinon null. */
export const linkedTitle = (row: AdminConversationRow): string | null =>
  row.sit_title || row.mission_title || null;

/** Ancienneté du plus vieux non lu, en jours pleins. */
export const unreadAgeDays = (
  oldestUnreadAt: string | null,
  now: Date = new Date(),
): number | null => {
  if (!oldestUnreadAt) return null;
  const t = new Date(oldestUnreadAt).getTime();
  if (Number.isNaN(t)) return null;
  return Math.floor((now.getTime() - t) / (24 * 60 * 60 * 1000));
};
