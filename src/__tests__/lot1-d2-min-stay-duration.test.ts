import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { MIN_STAY_DURATION_OPTIONS, mobilityPublicLabel } from "@/lib/mobilityOptions";

/**
 * D2 : la fiche publique doit lire min_stay_duration (colonne réellement écrite
 * par le formulaire), jamais la colonne legacy min_duration, et ne jamais
 * afficher « Durée flexible » à tort.
 */
describe("D2 : min_stay_duration sur la fiche publique", () => {
  const publicPage = readFileSync("src/pages/PublicSitterProfile.tsx", "utf8");

  it("la fiche publique lit min_stay_duration et pas min_duration", () => {
    expect(publicPage).toContain("min_stay_duration");
    expect(publicPage).not.toMatch(/min_duration\b/);
    expect(publicPage).not.toContain("MIN_DURATION_LABELS");
  });

  it("« flexible » ne produit jamais de ligne « Durée flexible »", () => {
    expect(mobilityPublicLabel(MIN_STAY_DURATION_OPTIONS, "flexible")).toBe("");
    expect(mobilityPublicLabel(MIN_STAY_DURATION_OPTIONS, "")).toBe("");
  });

  it("les valeurs réelles ont un libellé français explicite", () => {
    expect(mobilityPublicLabel(MIN_STAY_DURATION_OPTIONS, "1_3_days")).toBe("1 à 3 jours minimum");
    expect(mobilityPublicLabel(MIN_STAY_DURATION_OPTIONS, "1_week")).toBe("1 semaine minimum");
    expect(mobilityPublicLabel(MIN_STAY_DURATION_OPTIONS, "2_weeks")).toBe("2 semaines minimum");
    expect(mobilityPublicLabel(MIN_STAY_DURATION_OPTIONS, "1_month")).toBe("1 mois minimum");
  });
});
