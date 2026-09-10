import { describe, it, expect } from "vitest";
import { departementNameFromCode, formatCityDepartement } from "@/lib/locationLabel";

const NAMES = new Map<string, string>([
  ["19", "Corrèze"],
  ["58", "Nièvre"],
  ["987", "Polynésie française"],
]);

describe("libellé ville et département sur les cartes d'annonce", () => {
  it("associe la ville et le département quand les deux existent", () => {
    const label = formatCityDepartement("Jugeals-Nazareth", departementNameFromCode("19", NAMES));
    expect(label).toBe("Jugeals-Nazareth, Corrèze");
  });

  it("affiche la ville seule quand le code de département est absent", () => {
    const label = formatCityDepartement("Champlemy", departementNameFromCode(null, NAMES));
    expect(label).toBe("Champlemy");
    expect(label).not.toContain(",");
  });

  it("affiche la ville seule quand le code est inconnu de la table", () => {
    const label = formatCityDepartement("Champlemy", departementNameFromCode("999", NAMES));
    expect(label).toBe("Champlemy");
    expect(label).not.toContain(",");
  });

  it("rend Polynésie française et jamais Outre-mer", () => {
    const label = formatCityDepartement("Papeete", departementNameFromCode("987", NAMES));
    expect(label).toBe("Papeete, Polynésie française");
    expect(label).not.toContain("Outre-mer");
  });

  it("affiche le département seul quand la ville manque", () => {
    expect(formatCityDepartement(null, "Corrèze")).toBe("Corrèze");
  });

  it("ne rend jamais undefined ni null", () => {
    const label = formatCityDepartement(undefined, undefined);
    expect(label).toBe("");
    expect(label).not.toMatch(/undefined|null/);
  });

  it("tolère un code numérique non normalisé", () => {
    expect(departementNameFromCode("19", NAMES)).toBe("Corrèze");
    expect(departementNameFromCode(" 19 ", NAMES)).toBe("Corrèze");
  });
});
