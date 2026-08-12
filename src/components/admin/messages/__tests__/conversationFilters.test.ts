import { describe, it, expect } from "vitest";
import {
  contextLabel,
  linkedTitle,
  periodSince,
  replyState,
  unreadAgeDays,
  type AdminConversationRow,
} from "@/components/admin/messages/conversationFilters";

const row = (over: Partial<AdminConversationRow> = {}): AdminConversationRow => ({
  conversation_id: "c1",
  context_type: "sit_application",
  sit_id: "s1",
  sit_title: "Garde à Annecy",
  small_mission_id: null,
  mission_title: null,
  owner_id: "o1",
  owner_name: "Claire",
  owner_avatar: null,
  sitter_id: "g1",
  sitter_name: "Paul",
  sitter_avatar: null,
  message_count: 4,
  human_count: 4,
  distinct_senders: 2,
  unread_count: 0,
  oldest_unread_at: null,
  last_message_at: "2026-08-01T10:00:00Z",
  last_message_excerpt: "Bonjour",
  last_sender_id: "o1",
  created_at: "2026-07-30T10:00:00Z",
  total_count: 1,
  ...over,
});

describe("conversationFilters", () => {
  it("libelle les contextes de l'enum, privé par défaut", () => {
    expect(contextLabel("sit_application")).toBe("Candidature");
    expect(contextLabel("mission_help")).toBe("Coup de main");
    expect(contextLabel(null)).toBe("Privé");
  });

  it("calcule le statut de réponse", () => {
    expect(replyState(row({ human_count: 0, distinct_senders: 0 }))).toBe("empty");
    expect(replyState(row({ human_count: 3, distinct_senders: 1 }))).toBe("unanswered");
    expect(replyState(row({ human_count: 3, distinct_senders: 2 }))).toBe("exchanged");
  });

  it("borne la période", () => {
    const now = new Date("2026-08-12T00:00:00Z");
    expect(periodSince("all", now)).toBeNull();
    expect(periodSince("7d", now)).toBe("2026-08-05T00:00:00.000Z");
  });

  it("donne l'objet lié, annonce ou mission", () => {
    expect(linkedTitle(row())).toBe("Garde à Annecy");
    expect(linkedTitle(row({ sit_title: null, mission_title: "Arroser le jardin" }))).toBe("Arroser le jardin");
    expect(linkedTitle(row({ sit_title: null }))).toBeNull();
  });

  it("mesure l'ancienneté du non lu en jours pleins", () => {
    const now = new Date("2026-08-12T12:00:00Z");
    expect(unreadAgeDays(null, now)).toBeNull();
    expect(unreadAgeDays("2026-08-09T12:00:00Z", now)).toBe(3);
  });
});
