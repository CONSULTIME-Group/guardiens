import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { VEHICLE_OPTIONS, mobilityPublicLabel } from "@/lib/mobilityOptions";

/**
 * D1 : le champ véhicule doit être enregistré (colonne sitter_profiles.vehicle_type,
 * interface, liste blanche saveStep) et branché sur la fiche publique.
 * Ce test échoue si le champ redevient non persisté ou invisible.
 */
describe("D1 : vehicle_type persisté et affiché", () => {
  const hook = readFileSync("src/hooks/useSitterProfile.ts", "utf8");
  const step = readFileSync("src/components/profile/StepMobility.tsx", "utf8");
  const publicPage = readFileSync("src/pages/PublicSitterProfile.tsx", "utf8");

  it("le hook expose vehicle_type, une valeur par défaut et la liste blanche saveStep", () => {
    expect(hook).toContain("vehicle_type: string;");
    expect(hook).toContain('vehicle_type: ""');
    expect(hook).toContain('"vehicle_type"');
  });

  it("le formulaire Mobilité écrit vehicle_type", () => {
    expect(step).toContain("vehicle_type");
  });

  it("la fiche publique lit et affiche vehicle_type", () => {
    expect(publicPage).toContain("vehicle_type");
    expect(publicPage).toContain("vehicleLabel");
  });

  it("les libellés véhicule sont stables et français", () => {
    expect(mobilityPublicLabel(VEHICLE_OPTIONS, "car")).toBe("Se déplace en voiture");
    expect(mobilityPublicLabel(VEHICLE_OPTIONS, "motorcycle")).toBe("Se déplace en moto");
    expect(mobilityPublicLabel(VEHICLE_OPTIONS, "transit")).toBe("Se déplace en transports en commun");
    expect(mobilityPublicLabel(VEHICLE_OPTIONS, "bike")).toBe("Se déplace à vélo");
    expect(mobilityPublicLabel(VEHICLE_OPTIONS, "")).toBe("");
    expect(mobilityPublicLabel(VEHICLE_OPTIONS, "inconnu")).toBe("");
  });
});
