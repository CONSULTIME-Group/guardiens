import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { computeAffinityResultFull } from "@/lib/affinityScore";

/**
 * Même défaut que celui corrigé sur send-sitter-daily-digest : le gabarit
 * d'accueil des nouveaux inscrits affichait un chiffre d'affinité que le
 * moteur juge lui même non fiable. Un chiffre bas et faux nuit plus qu'un
 * chiffre absent, a fortiori au premier email reçu.
 */

const SRC = readFileSync("supabase/functions/send-onboarding-j1/index.ts", "utf8");

describe("send-onboarding-j1 : chiffre d'affinité seulement si fiable", () => {
  it("le verdict d'affichage du moteur conditionne le chiffre transmis", () => {
    expect(SRC).toContain("affinity_score: result.displayed ? result.score : null");
  });

  it("le cas fautif d'origine ne revient pas : score poussé brut", () => {
    expect(SRC).not.toMatch(/affinity_score:\s*result\.score\s*,/);
  });

  it("un couple dont le moteur se tait ne produit jamais de chiffre", () => {
    const owner: any = {
      pets: [{ species: "dog", special_needs: null }],
      work_during_sit: null,
      lifestyle: null,
      life_pace: null,
      languages: null,
      interests: null,
      home_ambiance: null,
      car_required: null,
      accepts_sitter_pets: null,
      accepts_sitter_children: null,
      distance_km: null,
    };
    const result = computeAffinityResultFull(owner, {} as any, { mode: "distribution" });
    expect(result.displayed).toBe(false);

    const item = { affinity_score: result.displayed ? result.score : null };
    expect(item.affinity_score).toBeNull();
    expect(item.affinity_score).not.toBe(0);
  });
});
