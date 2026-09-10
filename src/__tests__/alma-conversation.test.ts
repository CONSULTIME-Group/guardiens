/**
 * Lot 1 Alma conversationnelle : verrous du prompt, du plafond quotidien,
 * du fil de conversation et de la journalisation de `action_taken`.
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  getAlmaConversationState,
  openAlmaConversation,
  resetAlmaConversation,
  sendAlmaMessage,
} from "@/lib/alma/conversation-store";
import { shouldScheduleAutoDismiss } from "@/lib/alma/auto-dismiss";
import { buildHistoryInsert, buildHistoryPatch } from "@/lib/alma/whisper-history";

const promptSource = readFileSync(
  resolve(process.cwd(), "supabase/functions/_shared/alma-system-prompt.ts"),
  "utf8",
);
const edgeSource = readFileSync(
  resolve(process.cwd(), "supabase/functions/alma-chat/index.ts"),
  "utf8",
);

describe("prompt système d'Alma", () => {
  it("impose le vouvoiement absolu", () => {
    expect(promptSource).toContain("Vouvoiement absolu");
  });

  it("interdit les chiffres de volumétrie du réseau", () => {
    expect(promptSource).toContain("Tu ne cites JAMAIS la taille du réseau");
    expect(promptSource).toContain("nombre de gardiens");
  });

  it("garde le réflexe vétérinaire en urgence", () => {
    expect(promptSource).toContain("vétérinaire dès le premier mot");
  });

  it("ne contient aucun tiret cadratin ni demi-cadratin", () => {
    expect(promptSource.includes("\u2014")).toBe(false);
    expect(promptSource.includes("\u2013")).toBe(false);
  });

  it("plafonne les échanges à dix par jour, avec une réponse affirmative", () => {
    expect(promptSource).toContain("ALMA_CHAT_DAILY_LIMIT = 10");
    expect(promptSource).toContain("Je reprends la conversation demain");
    expect(edgeSource).toContain("ALMA_CHAT_DAILY_LIMIT");
    expect(edgeSource).toContain("limited: true");
  });
});

describe("auto-dismiss", () => {
  it("reste actif sans conversation ouverte", () => {
    expect(shouldScheduleAutoDismiss({ hasWhisper: true, conversationOpen: false })).toBe(true);
  });

  it("est désactivé dès qu'une conversation est ouverte", () => {
    expect(shouldScheduleAutoDismiss({ hasWhisper: true, conversationOpen: true })).toBe(false);
  });
});

describe("journal des whispers", () => {
  it("prépare une ligne complète à l'affichage", () => {
    const row = buildHistoryInsert({
      userId: "u1",
      whisper: { type: "cultural_fact", surface: "sitter_dashboard", metadata: { a: 1 } } as any,
      sessionId: "s1",
    });
    expect(row).toEqual({
      user_id: "u1",
      whisper_type: "cultural_fact",
      surface: "sitter_dashboard",
      session_id: "s1",
      metadata: { a: 1 },
    });
  });

  it("renseigne action_taken sur un clic d'action", () => {
    expect(buildHistoryPatch("action_clicked", "open_profile")).toEqual({
      dismissed_reason: "action_clicked",
      action_taken: "open_profile",
    });
  });

  it("laisse action_taken vide sur une fermeture ou un timeout", () => {
    expect(buildHistoryPatch("timeout")).toEqual({ dismissed_reason: "timeout" });
    expect(buildHistoryPatch("closed_manually")).toEqual({ dismissed_reason: "closed_manually" });
  });
});

describe("fil de conversation", () => {
  beforeEach(() => resetAlmaConversation());

  it("prend le whisper courant comme premier message", () => {
    openAlmaConversation("Votre annonce attire du monde.");
    const s = getAlmaConversationState();
    expect(s.open).toBe(true);
    expect(s.messages).toHaveLength(1);
    expect(s.messages[0].role).toBe("alma");
  });

  it("ajoute la réponse d'Alma au fil", async () => {
    openAlmaConversation("Bonjour.");
    const invoke = vi.fn().mockResolvedValue({ data: { answer: "Voici ce que je lis." }, error: null });
    await sendAlmaMessage({
      text: "Que vaut mon profil ?",
      surface: "sitter_dashboard",
      activeRole: "sitter",
      invoke: invoke as any,
    });
    const s = getAlmaConversationState();
    expect(s.messages.map((m) => m.role)).toEqual(["alma", "user", "alma"]);
    expect(s.messages[2].content).toBe("Voici ce que je lis.");
    expect(s.sending).toBe(false);
  });

  it("affiche le message de reprise au delà du plafond quotidien", async () => {
    const invoke = vi
      .fn()
      .mockResolvedValue({ data: { limited: true, message: "Je reprends demain." }, error: null });
    await sendAlmaMessage({
      text: "Encore une question",
      surface: "owner_dashboard",
      activeRole: "owner",
      invoke: invoke as any,
    });
    const s = getAlmaConversationState();
    expect(s.limited).toBe(true);
    expect(s.messages.at(-1)?.content).toBe("Je reprends demain.");
  });
});
