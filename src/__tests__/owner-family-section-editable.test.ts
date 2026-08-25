/**
 * Verrouille l'éditabilité du widget « Votre famille » (25/08/2026).
 *
 * Les tuiles compagnons du dashboard propriétaire ne sont plus en lecture
 * seule : clic sur un animal = PetsEditor scopé au logement de cet animal,
 * « Ajouter un compagnon » = même éditeur sur le premier logement. Sans
 * logement déclaré, le repli /owner-profile doit rester.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const widgetSrc = readFileSync(
  resolve(__dirname, "../components/dashboard/owner/OwnerFamilySection.tsx"),
  "utf8",
);
const dashboardSrc = readFileSync(
  resolve(__dirname, "../components/dashboard/OwnerDashboard.tsx"),
  "utf8",
);
const hookSrc = readFileSync(
  resolve(__dirname, "../hooks/useOwnerDashboardData.ts"),
  "utf8",
);

describe("Widget Votre famille, édition des compagnons", () => {
  it("les tuiles ouvrent PetsEditor scopé au logement de l'animal cliqué", () => {
    expect(widgetSrc).toContain('import PetsEditor from "@/components/pets/PetsEditor"');
    expect(widgetSrc).toContain("openEditor(pet.property_id)");
    expect(widgetSrc).toContain("propertyId={editorPropertyId}");
  });

  it("« Ajouter un compagnon » ouvre l'éditeur quand un logement existe", () => {
    expect(widgetSrc).toContain("openEditor(propertyIds[0])");
    expect(widgetSrc).toContain("Ajouter un compagnon");
  });

  it("sans logement déclaré, le repli /owner-profile subsiste", () => {
    expect(widgetSrc).toContain('to="/owner-profile"');
    expect(widgetSrc).toContain("propertyIds.length > 0");
  });

  it("le dashboard ne recharge ses données que sur mutation réelle", () => {
    expect(widgetSrc).toContain("onPetsChanged");
    expect(widgetSrc).toContain("petSignature");
    expect(dashboardSrc).toContain("onPetsChanged={reload}");
    expect(dashboardSrc).toContain("propertyIds={data.propertyIds}");
  });

  it("le hook expose les logements du propriétaire", () => {
    expect(hookSrc).toContain("propertyIds: propIds");
  });
});
