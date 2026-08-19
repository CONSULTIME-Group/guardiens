import { describe, it, expect } from "vitest";
import { MISSION_CATEGORIES, MISSION_CATEGORY_LABEL } from "../missionCategories";
import { z } from "zod";

/**
 * Garde générique : les chips catégories de l'entraide doivent rester
 * exactement alignées sur l'enum Postgres `small_mission_category`.
 * Si l'enum évolue en base, ce test casse et force la mise à jour de la
 * source unique `missionCategories.ts`.
 */
const smallMissionCategoryEnum = z.enum(["animals", "garden", "house", "skills"]);

describe("missionCategories : alignement avec l'enum small_mission_category", () => {
  const enumValues = smallMissionCategoryEnum.options;

  it("expose exactement les valeurs de l'enum, sans catégorie fantôme", () => {
    const uiKeys = MISSION_CATEGORIES.map((c) => c.key).sort();
    expect(uiKeys).toEqual([...enumValues].sort());
  });

  it("chaque clé UI est une valeur valide de l'enum", () => {
    for (const c of MISSION_CATEGORIES) {
      expect(smallMissionCategoryEnum.safeParse(c.key).success).toBe(true);
    }
  });

  it("chaque catégorie a un libellé français non vide", () => {
    for (const c of MISSION_CATEGORIES) {
      expect(c.label.trim().length).toBeGreaterThan(0);
      expect(MISSION_CATEGORY_LABEL[c.key]).toBe(c.label);
    }
  });
});
