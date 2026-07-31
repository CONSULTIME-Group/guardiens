/**
 * Test 3 — `speciesIntersects`.
 * Codes EN côté annonce (pets.species) contre libellés FR côté gardien
 * (sitter_profiles.animal_types), gardien « Tous », ombrelle NAC.
 */
import { describe, it, expect } from "vitest";
import { speciesIntersects } from "@/lib/affinityScore";
import { NAC_UMBRELLA } from "@/lib/affinityVocab";

describe("speciesIntersects", () => {
  it("croise les codes EN de l'annonce avec les libellés FR du gardien", () => {
    expect(speciesIntersects(["dog"], ["Chiens"])).toBe(1);
    expect(speciesIntersects(["cat"], ["Chats"])).toBe(1);
    expect(speciesIntersects(["dog", "cat"], ["Chiens", "Chats"])).toBe(2);
    expect(speciesIntersects(["horse"], ["Chevaux"])).toBe(1);
  });

  it("ne croise pas des espèces réellement différentes", () => {
    expect(speciesIntersects(["dog"], ["Chats"])).toBe(0);
  });

  it("un gardien déclarant « Tous » couvre toutes les espèces", () => {
    expect(speciesIntersects(["dog", "cat", "reptile"], ["Tous"])).toBe(3);
    expect(speciesIntersects(["farm_animal"], ["tous"])).toBe(1);
  });

  it("l'ombrelle NAC couvre rongeurs, reptiles, oiseaux et NAC", () => {
    for (const sp of NAC_UMBRELLA) {
      expect(speciesIntersects([sp], ["NAC"]), `NAC devrait couvrir ${sp}`).toBe(1);
    }
    expect(speciesIntersects(["dog"], ["NAC"])).toBe(0);
  });

  it("est insensible à la casse et aux libellés FR au singulier", () => {
    expect(speciesIntersects(["dog"], ["chien"])).toBe(1);
    expect(speciesIntersects(["rodent"], ["Rongeurs"])).toBe(1);
  });

  it("renvoie 0 sur listes vides", () => {
    expect(speciesIntersects([], ["Chiens"])).toBe(0);
    expect(speciesIntersects(["dog"], [])).toBe(0);
  });
});
