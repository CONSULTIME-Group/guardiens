/**
 * RÉVERSAL du lot D1 (23/08/2026, décision Jérémie) : `vehicle_type` est un
 * champ MORT : 3 profils renseignés sur 1 037, jamais scoré par le moteur
 * (doctrine règle 6), et la doctrine interdit explicitement de l'utiliser.
 * La colonne DB reste en place (règle 17 : pas de DROP COLUMN sans
 * validation), mais le champ est retiré du formulaire, de la fiche publique
 * et de la vue public_sitter_profiles. La mobilité se déclare désormais via
 * les tri-états `has_license` / `has_vehicle`, qui sont les entrées scorées.
 */
import { describe, it, expect } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";

const read = (p: string) => fs.readFileSync(path.resolve(p), "utf8");

describe("vehicle_type : champ mort retiré du produit (23/08/2026)", () => {
  it("absent du formulaire mobilité (StepMobility)", () => {
    const step = read("src/components/profile/StepMobility.tsx");
    expect(step).not.toContain("vehicle_type");
    expect(step).not.toContain("VEHICLE_OPTIONS");
    // Les entrées réellement scorées restent demandées.
    expect(step).toContain("has_license");
    expect(step).toContain("has_vehicle");
  });

  it("absent de la fiche publique (ni sélectionné, ni affiché)", () => {
    const page = read("src/pages/PublicSitterProfile.tsx");
    expect(page).not.toContain("vehicle_type");
    expect(page).not.toContain("VEHICLE_OPTIONS");
  });

  it("absent de la vue public_sitter_profiles (types régénérés)", () => {
    const types = read("src/integrations/supabase/types.ts");
    const i = types.indexOf("public_sitter_profiles: {");
    const j = types.indexOf("Relationships:", i);
    expect(i).toBeGreaterThan(-1);
    expect(j).toBeGreaterThan(i);
    expect(types.slice(i, j)).not.toContain("vehicle_type");
  });

  it("colonne DB sitter_profiles conservée (règle 17 : pas de DROP COLUMN)", () => {
    const types = read("src/integrations/supabase/types.ts");
    const i = types.indexOf("      sitter_profiles: {");
    const j = types.indexOf("Relationships:", i);
    expect(i).toBeGreaterThan(-1);
    expect(types.slice(i, j)).toContain("vehicle_type");
  });
});
