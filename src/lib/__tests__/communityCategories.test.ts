import { describe, it, expect } from "vitest";
import { z } from "zod";
import {
  COMMUNITY_CATEGORIES,
  questionCategoryLabel,
  questionCategoryToMissionCategory,
} from "../communityCategories";
import { isMissionCategory } from "../missionCategories";

/**
 * Garde de cohérence entre les deux taxonomies de l'entraide.
 * Les questions utilisent l'enum Postgres `community_question_category`
 * (français, cinq valeurs), les missions l'enum `small_mission_category`
 * (anglais, huit valeurs). Les chips de catégorie du fil sont celles des
 * missions : chaque valeur de question doit donc avoir une image dans le
 * mapping, sinon la question devient invisible dès qu'on filtre.
 * Les cinq valeurs sont listées en dur : si quelqu'un ajoute une valeur à
 * l'enum sans compléter le pont, ce test échoue.
 */
const communityQuestionCategoryEnum = z.enum([
  "animaux",
  "jardin",
  "maison",
  "garde",
  "autre",
]);

describe("communityCategories : alignement avec l'enum community_question_category", () => {
  const enumValues = communityQuestionCategoryEnum.options;

  it("expose exactement les valeurs de l'enum, sans catégorie fantôme", () => {
    const uiKeys = COMMUNITY_CATEGORIES.map((c) => c.key).sort();
    expect(uiKeys).toEqual([...enumValues].sort());
  });

  it("chaque valeur de l'enum a une image valide dans les catégories de missions", () => {
    for (const value of enumValues) {
      const mapped = questionCategoryToMissionCategory(value);
      expect(isMissionCategory(mapped)).toBe(true);
    }
  });

  it("chaque valeur de l'enum a un libellé français non vide", () => {
    for (const value of enumValues) {
      expect(questionCategoryLabel(value).trim().length).toBeGreaterThan(0);
    }
  });

  it("le mapping est total : une valeur inconnue renvoie other, jamais undefined", () => {
    expect(questionCategoryToMissionCategory("valeur_future")).toBe("other");
    expect(questionCategoryToMissionCategory(null)).toBe("other");
    expect(questionCategoryToMissionCategory(undefined)).toBe("other");
  });

  it("le libellé retombe sur Autre pour une valeur inconnue", () => {
    expect(questionCategoryLabel("valeur_future")).toBe("Autre");
    expect(questionCategoryLabel(null)).toBe("Autre");
    expect(questionCategoryLabel(undefined)).toBe("Autre");
  });

  it("garde et autre rejoignent other, rangement qui ne ment pas", () => {
    expect(questionCategoryToMissionCategory("garde")).toBe("other");
    expect(questionCategoryToMissionCategory("autre")).toBe("other");
  });
});
