import { describe, it, expect } from "vitest";
import { isPhotoRequiredByRule } from "@/lib/missionPhotoRule";
import { MISSION_CATEGORIES } from "@/lib/missionCategories";

describe("photo à la publication d'une entraide", () => {
  const required = ["animals", "garden", "house"];

  it("demande : photo attendue seulement quand l'objet se montre", () => {
    for (const c of MISSION_CATEGORIES) {
      expect(isPhotoRequiredByRule("besoin", c.key)).toBe(required.includes(c.key));
    }
  });

  it("offre : jamais de photo exigée, la photo de profil illustre l'offre", () => {
    for (const c of MISSION_CATEGORIES) {
      expect(isPhotoRequiredByRule("offre", c.key)).toBe(false);
    }
  });


  it("catégorie absente : photo facultative pour une demande", () => {
    expect(isPhotoRequiredByRule("besoin", "")).toBe(false);
    expect(isPhotoRequiredByRule("besoin", null)).toBe(false);
  });
});
