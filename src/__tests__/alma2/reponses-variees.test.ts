import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import {
  ALMA_PROMPT_SURFACES,
  WHISPER_STARTERS,
  WHISPER_STARTER_VARIANTS,
  pickRotating,
  rememberStarters,
  resolvePromptStarters,
  resolveVariedStarters,
  starterPools,
  type AlmaPromptSurface,
} from "@/lib/alma/prompt-starters";
import { buildAlmaJournal } from "@/lib/alma/journal";

/**
 * Lot ALMA2b (10/11/2026, demande de Jérémie : « Alma ne peut pas écrire tout
 * le temps la même chose dans les réponses proposées et les échanges mis en
 * avant, ils doivent varier ») et comptage du lot ALMA1 limité au dock rendu.
 */

const CONTEXTS = [
  {},
  { hasDraftSit: true },
  { hasPublishedSitWithoutApplication: true },
  { activeRole: "sitter" as const },
  { activeRole: "owner" as const },
  { profileCompletion: 10 },
];

describe("réponses proposées variées", () => {
  it("graine 0 et aucune amorce récente : la table d'origine, au mot près", () => {
    for (const surface of ALMA_PROMPT_SURFACES) {
      for (const ctx of CONTEXTS) {
        expect(resolveVariedStarters({ surface, ctx })).toEqual(resolvePromptStarters({ surface, ctx }));
        expect(resolveVariedStarters({ surface, ctx, whisperType: "usage_nudge" })).toEqual(
          resolvePromptStarters({ surface, ctx, whisperType: "usage_nudge" }),
        );
      }
    }
  });

  it("chaque surface porte au moins deux formulations", () => {
    for (const surface of ALMA_PROMPT_SURFACES) {
      for (const ctx of CONTEXTS) {
        const pools = starterPools(surface as AlmaPromptSurface, ctx);
        expect(pools.leads.length).toBeGreaterThanOrEqual(2);
        expect(new Set([...pools.leads, ...pools.mores]).size).toBe(pools.leads.length + pools.mores.length);
      }
    }
    for (const [type, variants] of Object.entries(WHISPER_STARTER_VARIANTS)) {
      expect(variants[0]).toBe(WHISPER_STARTERS[type as keyof typeof WHISPER_STARTERS]);
      expect(variants.length).toBeGreaterThanOrEqual(2);
    }
  });

  it("deux ouvertures de suite montrent d'autres amorces", () => {
    for (const surface of ALMA_PROMPT_SURFACES) {
      let recent: string[] = [];
      const first = resolveVariedStarters({ surface, seed: 3, recent });
      recent = rememberStarters(recent, first);
      const second = resolveVariedStarters({ surface, seed: 3, recent });
      expect(second).not.toEqual(first);
      for (const s of second) expect(first.includes(s) && second.length > 1 && first.length > 1 ? second.indexOf(s) : -1).toBeLessThan(1);
    }
  });

  it("sur sept jours, le tableau de bord change de couple", () => {
    const pairs = new Set<string>();
    for (let day = 0; day < 7; day += 1) pairs.add(resolveVariedStarters({ surface: "dashboard", seed: day }).join("|"));
    expect(pairs.size).toBeGreaterThanOrEqual(3);
  });

  it("une amorce n'est jamais montrée deux fois dans la même paire", () => {
    for (let seed = 0; seed < 10; seed += 1) {
      const pair = resolveVariedStarters({ surface: "listings", seed, whisperType: "cultural_fact" });
      expect(new Set(pair).size).toBe(pair.length);
    }
  });

  it("rotation et mémoire bornées", () => {
    expect(pickRotating(["a", "b", "c"], 1, [])).toBe("b");
    expect(pickRotating(["a", "b", "c"], 1, ["b"])).toBe("c");
    expect(pickRotating(["a", "b"], 0, ["a", "b"])).toBe("a");
    expect(pickRotating(["a"], 0, [], ["a"])).toBeNull();
    expect(rememberStarters(["x", "y", "z", "w", "v", "u"], ["a", "x"])).toEqual(["a", "x", "y", "z", "w", "v"]);
  });

  it("le dock lit les amorces récentes hors ouverture et les note à l'affichage", () => {
    const dock = readFileSync("src/components/ai/alma/AlmaDock.tsx", "utf8");
    expect(dock).toContain("resolveVariedStarters({");
    expect(dock).toContain("seed: Math.floor(Date.now() / 86_400_000)");
    expect(dock).toContain("if (expanded) return;");
    expect(dock).toContain("rememberStarters(prev, shown)");
    expect(dock).toContain("onStartersShown={onStartersShown}");
  });

  it("seules les amorces à l'écran comptent (ALMA2c : page du jour affichée, amorces masquées)", () => {
    const conv = readFileSync("src/components/ai/alma/AlmaConversation.tsx", "utf8");
    expect(conv).toContain("const shownStarters = open && !(journal?.invitation && !state.open) && starters && starters.length > 0");
    expect(conv).toContain("onStartersShown?.(shownStartersKey.split(\"|\"))");
    const dock = readFileSync("src/components/ai/alma/AlmaDock.tsx", "utf8");
    expect(dock).not.toContain("if (!expanded || !startersKey) return;");
  });
});

describe("page du jour : invitations variées", () => {
  const facts = { activeRole: "owner" as const, unreadApplications: 2 };

  it("deux formulations selon le jour, la première reste celle d'origine", () => {
    const day0 = buildAlmaJournal({ ...facts, variantSeed: 0 }).invitation;
    const day1 = buildAlmaJournal({ ...facts, variantSeed: 1 }).invitation;
    expect(day0?.question).toBe("Vous voulez que je vous dise qui a écrit ?");
    expect(day1?.question).not.toBe(day0?.question);
    expect(day1?.replies).not.toEqual(day0?.replies);
  });

  it("textes sans tiret long", () => {
    const journal = readFileSync("src/lib/alma/journal.ts", "utf8");
    const starters = readFileSync("src/lib/alma/prompt-starters.ts", "utf8");
    expect(journal).not.toMatch(/[—–]/);
    expect(starters).not.toMatch(/[—–]/);
  });
});

describe("comptage seulement quand le dock est rendu", () => {
  it("Alma masquée ou fenêtre ouverte : ni aperçu ni fait compté", () => {
    const dock = readFileSync("src/components/ai/alma/AlmaDock.tsx", "utf8");
    expect(dock).toContain("const dockRendered = !hidden && !hiddenLoading && !isModalOpen;");
    expect(dock).toContain("const peekVisible = dockRendered &&");
    expect(dock).toContain("const panelShowsWhisper = dockRendered &&");
  });
});
