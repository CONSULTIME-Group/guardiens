/**
 * Lot I1b (13/10/2026) : la porte d'affinité laisse passer l'entraide.
 *
 * Alerte A1 du 13/10 : 13 inscrits du 06 au 12/10 ont vu le questionnaire sans
 * le terminer. 5 d'entre eux venaient de publier un besoin (garder un chat, un
 * chien, rendre visite à un chat) et la porte les renvoyait au questionnaire
 * gardien dès l'ouverture de leur propre besoin.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { isGateAlwaysOpenPath } from "@/lib/onboardingGateRules";

describe("I1b, entraide jamais interrompue", () => {
  it("page Entraide, besoin publié et formulaire", () => {
    expect(isGateAlwaysOpenPath("/petites-missions")).toBe(true);
    expect(isGateAlwaysOpenPath("/petites-missions/garder-mon-chat-pendant-mes-vacances")).toBe(true);
    expect(isGateAlwaysOpenPath("/petites-missions/creer?titre=Arroser")).toBe(true);
  });

  it("les autres pages gardent la porte", () => {
    expect(isGateAlwaysOpenPath("/petites-missionsx")).toBe(false);
    expect(isGateAlwaysOpenPath("/dashboard")).toBe(false);
    expect(isGateAlwaysOpenPath("/profile")).toBe(false);
  });

  it("la porte lit bien la règle", () => {
    const gate = readFileSync("src/components/onboarding/OnboardingGate.tsx", "utf8");
    expect(gate).toContain("isGateAlwaysOpenPath(path)");
  });
});
