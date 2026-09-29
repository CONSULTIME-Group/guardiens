import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { contactSubjectLabel } from "@/lib/admin/labels";

describe("A11b correctif, texte des membres intact sur Messages contact", () => {
  it("un sujet membre en anglais s'affiche à l'identique", () => {
    expect(contactSubjectLabel("Quick question")).toBe("Quick question");
    expect(contactSubjectLabel("Feedback on my sit")).toBe("Feedback on my sit");
  });
  it("la catégorie technique « Feedback utilisateur » devient « Retour utilisateur »", () => {
    expect(contactSubjectLabel("Feedback utilisateur")).toBe("Retour utilisateur");
  });
  it("aucune traduction automatique sur les champs membres des écrans concernés", () => {
    for (const f of ["AdminContactMessages", "AdminMessages", "AdminReports", "AdminReviewDisputes"]) {
      expect(readFileSync(`src/pages/admin/${f}.tsx`, "utf8")).not.toMatch(/displayText\(/);
    }
  });
});
