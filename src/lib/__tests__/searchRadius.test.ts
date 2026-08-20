import { describe, it, expect } from "vitest";
import {
  LEGACY_UNANSWERED_RADIUS_KM,
  EFFECTIVE_DEFAULT_RADIUS_KM,
  RADIUS_CHOICE_OPTIONS,
  isRadiusDeclared,
  effectiveSearchRadius,
  declarableRadius,
} from "../searchRadius";

describe("searchRadius, règle de lecture du rayon gardien (décision du 20/08/2026)", () => {
  it("30 est le marqueur de silence et 100 le défaut effectif", () => {
    expect(LEGACY_UNANSWERED_RADIUS_KM).toBe(30);
    expect(EFFECTIVE_DEFAULT_RADIUS_KM).toBe(100);
  });

  it("30 km et l'absence de valeur ne sont jamais des déclarations", () => {
    expect(isRadiusDeclared(30)).toBe(false);
    expect(isRadiusDeclared(null)).toBe(false);
    expect(isRadiusDeclared(undefined)).toBe(false);
    expect(isRadiusDeclared(0)).toBe(false);
  });

  it("toute autre valeur est une déclaration respectée au kilomètre près", () => {
    for (const v of [5, 10, 15, 25, 29, 31, 50, 100, 200]) {
      expect(isRadiusDeclared(v)).toBe(true);
      expect(effectiveSearchRadius(v)).toBe(v);
    }
  });

  it("le silence se lit comme 100 km", () => {
    expect(effectiveSearchRadius(null)).toBe(100);
    expect(effectiveSearchRadius(undefined)).toBe(100);
    expect(effectiveSearchRadius(30)).toBe(100);
  });

  it("les choix proposés ne contiennent jamais le marqueur de silence", () => {
    expect(RADIUS_CHOICE_OPTIONS).not.toContain(30);
    expect([...RADIUS_CHOICE_OPTIONS]).toEqual(
      [...RADIUS_CHOICE_OPTIONS].sort((a, b) => a - b),
    );
  });

  it("une interface ne peut jamais écrire 30", () => {
    expect(declarableRadius(30)).toBe(35);
    expect(declarableRadius(15)).toBe(15);
    expect(declarableRadius(100)).toBe(100);
  });
});
