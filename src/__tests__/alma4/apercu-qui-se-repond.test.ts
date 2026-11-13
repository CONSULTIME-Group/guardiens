/**
 * Lot ALMA4 (13/11/2026, arène claude/arene/2026-11-10-alma-vivante, lot L4) :
 * l'aperçu qui se répond. Verrou des règles de la puce, de la réplique
 * scriptée et du câblage (dock, store, alma-chat).
 */
import { describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  isInSeason,
  isReplyFactCompatible,
  peekLines,
  pickReplyFact,
  replyActionChip,
  replyChipForWhisper,
  REPLY_CHIP_DAILY_LIMIT,
  REPLY_CHIP_EMPTY_ANSWER,
  REPLY_CHIP_INPUT_MODE,
  REPLY_CHIP_LABELS,
} from "@/lib/alma/peekReply";
import { ALMA_PEEK_DURATION_MS } from "@/lib/alma/whisperArrival";

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    functions: { invoke: vi.fn() },
    auth: { onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }), getUser: vi.fn() },
    from: vi.fn(),
  },
}));
vi.mock("@/lib/analytics", () => ({ trackEvent: vi.fn() }));

const read = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");
const FACT = "11111111-1111-4111-8111-111111111111";
const OTHER = "22222222-2222-4222-8222-222222222222";
const THIRD = "33333333-3333-4333-8333-333333333333";

const fact = (surface: string, factType: string, id: string = FACT) => ({
  type: "cultural_fact",
  surface,
  metadata: { fact_id: id, fact_type: factType },
});

describe("ALMA4 · puce de réponse sous l'aperçu", () => {
  it("une blague appelle « Une autre ! », un autre fait « Raconte »", () => {
    expect(replyChipForWhisper(fact("search", "animal_humor"))).toMatchObject({ kind: "another", label: "Une autre !", factId: FACT });
    expect(replyChipForWhisper(fact("city_page", "home_care_tip"))).toMatchObject({ kind: "tell", label: "Raconte" });
    expect(REPLY_CHIP_LABELS).toEqual({ another: "Une autre !", tell: "Raconte" });
  });

  it("zéro puce sur un écran d'action, sur une relance d'usage ou sans fait identifié", () => {
    expect(replyChipForWhisper(fact("sit_detail", "pet_care_tip"))).toBeNull();
    expect(replyChipForWhisper({ type: "usage_nudge", surface: "search", metadata: { fact_id: FACT } })).toBeNull();
    expect(replyChipForWhisper({ type: "cultural_fact", surface: "search", metadata: {} })).toBeNull();
    expect(replyChipForWhisper({ type: "cultural_fact", surface: "search", metadata: { fact_id: "abc", fact_type: "animal_humor" } })).toBeNull();
    expect(replyChipForWhisper({ type: "community_google_review", surface: "dashboard", metadata: { fact_id: FACT, fact_type: "animal_humor" } })).toBeNull();
    expect(replyChipForWhisper(null)).toBeNull();
  });

  it("aperçu : texte entier en découverte (quatre lignes au plus), une ligne sur la fiche d'une garde, 12 s", () => {
    expect(peekLines("search")).toBe(4);
    expect(peekLines("sitter_profile")).toBe(4);
    expect(peekLines("sit_detail")).toBe(1);
    expect(ALMA_PEEK_DURATION_MS).toBe(12000);
  });
});

describe("ALMA4 · réplique scriptée", () => {
  const pool = [
    { id: FACT, content: "Le fait d'origine.", context_filter: { animal_species: "cat" } },
    { id: OTHER, content: "Un autre fait sur le chat.", context_filter: { animal_species: "cat" } },
    { id: THIRD, content: "Un fait sur le chien.", context_filter: { animal_species: "dog" } },
  ];

  it("même famille, jamais le fait d'origine, conditions d'écran respectées", () => {
    const picked = pickReplyFact({
      factType: "cat_behavior_tip", sourceId: FACT, sourceFilter: { animal_species: "cat" },
      candidates: pool, recentIds: [], month: 11, random: () => 0.99,
    });
    expect(picked?.id).toBe(OTHER);
  });

  it("une blague propre à une espèce vient partout, comme au lot ALMA1", () => {
    expect(isReplyFactCompatible("animal_humor", {}, { animal_species: "dog" })).toBe(true);
    expect(isReplyFactCompatible("pet_care_tip", {}, { animal_species: "dog" })).toBe(false);
    expect(isReplyFactCompatible("breed_did_you_know", { animal_species: "dog", animal_breed: "teckel" }, { animal_species: "dog" })).toBe(true);
    expect(isReplyFactCompatible("city_did_you_know", { city: "lyon" }, { city: "annecy" })).toBe(false);
    expect(isReplyFactCompatible("home_care_tip", {}, {})).toBe(true);
  });

  it("écarte un fait reçu depuis 30 jours, hors saison ou à renvoi professionnel", () => {
    const base = { factType: "home_care_tip", sourceId: FACT, sourceFilter: {}, month: 11 };
    expect(pickReplyFact({ ...base, candidates: [{ id: OTHER, content: "Déjà lu." }], recentIds: [OTHER] })).toBeNull();
    expect(pickReplyFact({ ...base, candidates: [{ id: OTHER, content: "Été.", seasonal_start_month: 6, seasonal_end_month: 8 }], recentIds: [] })).toBeNull();
    expect(pickReplyFact({ ...base, candidates: [{ id: OTHER, content: "Voir un vétérinaire.", needs_pro_referral: true }], recentIds: [] })).toBeNull();
    expect(pickReplyFact({ ...base, candidates: [{ id: OTHER, content: "  " }], recentIds: [] })).toBeNull();
    expect(isInSeason(1, 11, 2)).toBe(true);
    expect(isInSeason(6, 11, 2)).toBe(false);
    expect(isInSeason(6, null, null)).toBe(true);
  });

  it("la réplique se clôt par une puce d'action interne, selon l'espace actif", () => {
    expect(replyActionChip("owner", "animal_humor")).toEqual({ label: "Publier une annonce", path: "/sits/create" });
    expect(replyActionChip("sitter", "animal_humor")).toEqual({ label: "Voir les gardes ouvertes", path: "/search" });
    expect(replyActionChip("sitter", "mutual_aid_tip").path).toBe("/petites-missions");
  });

  it("textes sans tiret long et sans tournure négative", () => {
    for (const text of [REPLY_CHIP_EMPTY_ANSWER, ...Object.values(REPLY_CHIP_LABELS), replyActionChip("owner", "x").label, replyActionChip("sitter", "x").label, replyActionChip("sitter", "mutual_aid_tip").label]) {
      expect(text).not.toMatch(/[—–]/);
      expect(text).not.toMatch(/\b(ne|n'|pas|jamais|aucun)\b/i);
    }
  });
});

describe("ALMA4 · fil de conversation", () => {
  it("le fait ouvre le fil, la puce est le message du membre, la réponse porte la puce d'action", async () => {
    const store = await import("@/lib/alma/conversation-store");
    store.resetAlmaConversation();
    const invoke = vi.fn().mockResolvedValue({
      data: { answer: "Une seconde blague.", chips: [{ label: "Voir les gardes ouvertes", path: "/search?via=alma" }] },
      error: null,
    });
    await store.sendAlmaReplyChip({
      factText: "Une première blague.", chipLabel: "Une autre !", factId: FACT,
      surface: "search", activeRole: "sitter", invoke: invoke as any,
    });
    expect(invoke).toHaveBeenCalledWith("alma-chat", expect.objectContaining({
      body: expect.objectContaining({ kind: "reply_chip", fact_id: FACT, surface: "search", active_role: "sitter" }),
    }));
    expect(invoke.mock.calls[0][1].body.message).toBeUndefined();
    const { messages, sending, open } = store.getAlmaConversationState();
    expect(open).toBe(true);
    expect(sending).toBe(false);
    expect(messages.map((m) => [m.role, m.content])).toEqual([
      ["alma", "Une première blague."],
      ["user", "Une autre !"],
      ["alma", "Une seconde blague."],
    ]);
    expect(messages[2].chips).toEqual([{ label: "Voir les gardes ouvertes", path: "/search?via=alma" }]);
  });

  it("une réponse en échec laisse le fil lisible et le dit", async () => {
    const store = await import("@/lib/alma/conversation-store");
    store.resetAlmaConversation();
    const invoke = vi.fn().mockResolvedValue({ data: null, error: new Error("réseau") });
    await store.sendAlmaReplyChip({
      factText: "Un fait.", chipLabel: "Raconte", factId: FACT, surface: "city_page", activeRole: "owner", invoke: invoke as any,
    });
    const state = store.getAlmaConversationState();
    expect(state.sending).toBe(false);
    expect(state.error).toBeTruthy();
    expect(state.messages).toHaveLength(2);
  });
});

describe("ALMA4 · câblage", () => {
  const dock = read("src/components/ai/alma/AlmaDock.tsx");
  const chat = read("supabase/functions/alma-chat/index.ts");

  it("le dock rend l'aperçu en entier, la puce de 44 px, et referme au défilement", () => {
    expect(dock).toContain('data-testid="alma-whisper-peek-chip"');
    expect(dock).toContain("line-clamp-4");
    expect(dock).toContain("max-w-[min(24rem,100%)]");
    expect(dock).toContain("min-h-11");
    expect(dock).toContain("PEEK_SCROLL_ARM_MS");
    expect(dock).toContain('"alma_whisper_reply_clicked"');
    expect(dock).toContain('openPanel("reply_chip"');
  });

  it("alma-chat répond à la puce avant toute réservation de tour et sans appel au modèle", () => {
    const start = chat.indexOf("if (isReplyChip) {");
    const end = chat.indexOf("// Lot J2-B : rejeu admin");
    expect(start).toBeGreaterThan(0);
    expect(end).toBeGreaterThan(start);
    const block = chat.slice(start, end);
    expect(block).not.toContain("callLovableAI");
    expect(block).not.toContain("reserveAlmaTurn");
    expect(block).toContain("input_mode: REPLY_CHIP_INPUT_MODE");
    expect(block).toContain("pickReplyFact(");
    expect(block).toContain("REPLY_CHIP_DAILY_LIMIT");
    expect(block).toContain('.eq("active", true)');
    // Le texte de la réplique vient de la base, jamais du navigateur.
    expect(block).not.toMatch(/body\?\.(answer|content|text|message)/);
    expect(chat.indexOf("getUser()")).toBeLessThan(start);
    expect(REPLY_CHIP_INPUT_MODE).toBe("reply_chip");
    expect(REPLY_CHIP_DAILY_LIMIT).toBe(10);
  });
});
