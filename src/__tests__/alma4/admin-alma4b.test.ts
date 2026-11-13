/**
 * Lot ALMA4b (13/11/2026, réaudit de /admin/alma après la mise en ligne du
 * lot ALMA4) : les réponses d'un geste se lisent à part, la mesure de
 * l'aperçu qui se répond exclut l'équipe, et une puce touchée reste hors du
 * taux d'action des murmures.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  aggregateRefusals,
  inputModeLabel,
  inputSplit,
  speakerStats,
  typedConversations,
  type RawConversation,
} from "@/lib/admin/alma-conversations";
import { measureCompanion } from "@/lib/alma/companionMetrics";
import { REPLY_CHIP_TARGET, replyChipMeasure, replyChipRateLabel } from "@/lib/admin/alma-reply-chip";
import { REPLY_CHIP_INPUT_MODE } from "@/lib/alma/peekReply";

const read = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");
const row = (over: Partial<RawConversation>): RawConversation => ({
  id: Math.random().toString(36), created_at: "2026-11-13T08:00:00Z", surface: "search", active_role: "sitter",
  question: "Comment publier ?", answer: "Voici comment publier une annonce.", register: "dossier",
  refusal_reason: null, input_mode: "keyboard", user_id: "u1", ...over,
});

describe("ALMA4b · onglet Conversations", () => {
  const rows = [
    row({ user_id: "u1", input_mode: "keyboard" }),
    row({ user_id: "u1", input_mode: "voice" }),
    row({ user_id: "u1", input_mode: "reply_chip", question: "Raconte", answer: "Un fait." }),
    row({ user_id: "u2", input_mode: "reply_chip", question: "Une autre !", answer: "Une blague." }),
    row({ user_id: "u3", input_mode: null }),
  ];

  it("une réponse d'un geste a son libellé et sa colonne, jamais « clavier »", () => {
    expect(REPLY_CHIP_INPUT_MODE).toBe("reply_chip");
    expect(inputModeLabel("reply_chip")).toBe("réponse d'un geste");
    expect(inputModeLabel("voice")).toBe("voix");
    expect(inputModeLabel("keyboard")).toBe("clavier");
    expect(inputModeLabel(null)).toBeNull();
    expect(inputSplit(rows)).toEqual({ voice: 1, keyboard: 1, replyChip: 2, unknown: 1, voiceShare: 0.5 });
  });

  it("« personnes qui parlent » compte une fois qui écrit et répond d'un geste", () => {
    expect(speakerStats(rows)).toEqual({ people: 3, typedPeople: 2, replyChipPeople: 2, typed: 3, replyChips: 2 });
    expect(speakerStats([])).toEqual({ people: 0, typedPeople: 0, replyChipPeople: 0, typed: 0, replyChips: 0 });
  });

  it("thèmes, longueur et amorces se mesurent sans les réponses d'un geste", () => {
    expect(typedConversations(rows)).toHaveLength(3);
    const tab = read("src/pages/admin/_components/alma/ConversationsTab.tsx");
    expect(tab).toContain("aggregateThemes(typedRows)");
    expect(tab).toContain("averageAnswerLength(typedRows)");
    expect(tab).toContain("openingRepetition(typedRows)");
    expect(tab).toContain("Personnes qui parlent à Alma");
    expect(tab).not.toContain('"voix" : "clavier"');
  });

  it("le plafond des réponses d'un geste a un libellé français", () => {
    const stats = aggregateRefusals([row({ refusal_reason: "reply_chip_limit" })]);
    expect(stats[0].label).toBe("Plafond des réponses d'un geste");
  });

  it("Pilotage : variété et replis mesurés sur les réponses du modèle seulement", () => {
    const m = measureCompanion([
      { answer: "Bonjour, voici la marche à suivre pour publier.", classification: { fallback_template: false } },
      { answer: "Un fait lu en base.", classification: { intent: "reply_chip" } },
      { answer: "Un fait lu en base.", classification: { intent: "reply_chip" } },
    ]);
    expect(m.answers).toBe(1);
    expect(m.sharedOpeners).toBe(0);
  });
});

describe("ALMA4b · mesure de l'aperçu qui se répond", () => {
  const ev = (user_id: string | null, event_type: string, chip: unknown) => ({ user_id, event_type, metadata: { chip } });
  const rows = [
    ev("a", "alma_whisper_peek_shown", "tell"),
    ev("a", "alma_whisper_peek_shown", "another"),
    ev("b", "alma_whisper_peek_shown", "tell"),
    ev("b", "alma_whisper_peek_shown", null), // aperçu sans puce (fiche d'une garde, relance)
    ev("b", "alma_whisper_reply_clicked", "tell"),
    ev("team", "alma_whisper_peek_shown", "tell"),
    ev("team", "alma_whisper_reply_clicked", "tell"),
    ev(null, "alma_whisper_peek_shown", "tell"),
  ];

  it("compte les aperçus rendus avec une puce et les puces touchées, équipe exclue", () => {
    const m = replyChipMeasure(rows, ["team"]);
    expect(m).toMatchObject({ peeks: 3, peekPeople: 2, clicks: 1, clickPeople: 1 });
    expect(m.rate).toBeCloseTo(1 / 3);
    expect(m.byKind).toEqual({ another: { peeks: 1, clicks: 0 }, tell: { peeks: 2, clicks: 1 } });
  });

  it("aucun aperçu : le taux reste à mesurer, jamais 0 %", () => {
    const m = replyChipMeasure([], []);
    expect(m.rate).toBeNull();
    expect(replyChipRateLabel(null)).toBe("En attente du premier aperçu");
    expect(replyChipRateLabel(0.024)).toBe("2,4 %");
    expect(replyChipRateLabel(0.25)).toBe("25 %");
    expect(REPLY_CHIP_TARGET).toBe(0.03);
  });

  it("la carte est montée dans l'onglet Murmures et lit les deux événements", () => {
    expect(read("src/pages/admin/AdminAlma.tsx")).toContain("<ReplyChipCard since={since} />");
    const card = read("src/pages/admin/_components/alma/ReplyChipCard.tsx");
    expect(card).toContain("REPLY_CHIP_EVENTS");
    expect(card).toContain('"user_roles"');
    expect(card).toContain("reportAdminReadError");
  });
});

describe("ALMA4b · dock", () => {
  const dock = read("src/components/ai/alma/AlmaDock.tsx");

  it("une puce touchée clôt le murmure sans identifiant d'action", () => {
    expect(dock).toContain('doDismiss("action_clicked");');
    expect(dock).not.toContain("reply_chip_${");
  });

  it("le panneau ouvert par une puce laisse la page du jour de côté", () => {
    expect(dock).toContain("journal={whisperOwnsPanel || replyThread ? null : journal}");
    expect(dock).toContain("if (!expanded) setReplyThread(false);");
  });
});
