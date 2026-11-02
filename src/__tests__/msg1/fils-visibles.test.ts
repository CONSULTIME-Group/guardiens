/** Lot MSG1 : un message reçu se retrouve toujours dans la liste. */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { isConversationVisibleInRole as visible } from "@/lib/conversationVisibility";

const base = {
  userId: "me", userRole: "both", activeRole: "sitter", ownerId: "me", sitterId: "marie",
  sitId: null as string | null, smallMissionId: null as string | null, unreadCount: 0,
};

describe("MSG1", () => {
  it("fil sans annonce : visible dans les deux espaces", () => {
    expect(visible(base)).toBe(true);
    expect(visible({ ...base, activeRole: "owner" })).toBe(true);
  });
  it("rôle unique : propriétaire contacté depuis un profil, rangé côté gardien", () => {
    expect(visible({ ...base, userRole: "owner", activeRole: "owner", ownerId: "jeremie", sitterId: "me" })).toBe(true);
    expect(visible({ ...base, userRole: "owner", activeRole: "owner", ownerId: "x", sitterId: "me", sitId: "s" })).toBe(true);
  });
  it("double rôle, fil d'annonce lu dans l'espace opposé : rangé", () => {
    expect(visible({ ...base, sitId: "s" })).toBe(false);
    expect(visible({ ...base, sitId: "s", activeRole: "owner" })).toBe(true);
  });
  it("non lu : toujours visible", () => {
    expect(visible({ ...base, sitId: "s", unreadCount: 1 })).toBe(true);
  });
  it("mission : visible dans les deux espaces", () => {
    expect(visible({ ...base, sitId: "s", smallMissionId: "m" })).toBe(true);
  });
  it("la notification de message ouvre la conversation", () => {
    const sql = readFileSync("drizzle/migrations/0113_msg1_lien_conversation.sql", "utf8");
    expect(sql).toContain("'/messages/' || NEW.conversation_id::text");
  });
});
