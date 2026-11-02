/** Lot perf 15 : phases de l'INP envoyées avec la mesure, et recherche d'un membre. */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { vitalAttribution } from "@/lib/webVitals";

describe("attribution de l'INP (lot perf 15)", () => {
  it("garde la cible, les trois phases et l'état de chargement", () => {
    const m = { name: "INP", attribution: { interactionTarget: "button.a", inputDelay: 300.4, processingDuration: 20.6, presentationDelay: 80, loadState: "dom-interactive", longAnimationFrameEntries: [{}] } };
    expect(vitalAttribution(m as never)).toEqual({ target: "button.a", input_delay: 300, processing: 21, presentation: 80, load_state: "dom-interactive" });
  });
  it("sans donnée, aucune attribution", () => {
    expect(vitalAttribution({ name: "INP", attribution: {} } as never)).toBeUndefined();
  });
});

describe("recherche (lot perf 15)", () => {
  const src = readFileSync("src/components/search/SearchSitter.tsx", "utf8");
  it("la liste n'attend que les lieux français", () => {
    expect(src).toContain("settleWithin(run.frenchDone, LOCATE_BUDGET_MS)");
  });
  it("un membre lance sa première recherche après son profil, jamais sans lui", () => {
    expect(src).toContain("if (!user || userCoords || profileSettled)");
    expect(src).not.toContain('user && userCity === ""');
  });
});
