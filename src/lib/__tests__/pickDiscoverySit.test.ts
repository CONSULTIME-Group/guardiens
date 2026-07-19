import { describe, it, expect } from "vitest";
import { pickDiscoverySit } from "../pickDiscoverySit";

const card = (
  id: string,
  city: string | null,
  pet_species: string[] = [],
) => ({ id, city, pet_species });

describe("pickDiscoverySit", () => {
  it("retourne null quand le pool est vide", () => {
    expect(
      pickDiscoverySit([], { topIds: [], topCities: [], sitterSpecies: [] }),
    ).toBeNull();
  });

  it("retourne null quand aucun candidat n'est nouveau", () => {
    const pool = [card("a", "Lyon", ["chien"])];
    expect(
      pickDiscoverySit(pool, {
        topIds: [],
        topCities: ["Lyon"],
        sitterSpecies: ["chien"],
      }),
    ).toBeNull();
  });

  it("exclut un id déjà présent dans le top", () => {
    const pool = [card("top-1", "Paris", ["nac"])];
    expect(
      pickDiscoverySit(pool, {
        topIds: ["top-1"],
        topCities: ["Lyon"],
        sitterSpecies: ["chien"],
      }),
    ).toBeNull();
  });

  it("retient une ville nouvelle", () => {
    const pool = [card("b", "Marseille", ["chien"])];
    const found = pickDiscoverySit(pool, {
      topIds: [],
      topCities: ["Lyon"],
      sitterSpecies: ["chien"],
    });
    expect(found?.id).toBe("b");
  });

  it("retient une espèce nouvelle même en ville connue", () => {
    const pool = [card("c", "Lyon", ["furet"])];
    const found = pickDiscoverySit(pool, {
      topIds: [],
      topCities: ["Lyon"],
      sitterSpecies: ["chien", "chat"],
    });
    expect(found?.id).toBe("c");
  });

  it("gardien universel: ne s'appuie que sur la ville", () => {
    const pool = [card("d", "Lyon", ["furet"])];
    expect(
      pickDiscoverySit(pool, {
        topIds: [],
        topCities: ["Lyon"],
        sitterSpecies: ["all"],
      }),
    ).toBeNull();
  });

  it("gardien sans espèces déclarées: ne s'appuie que sur la ville", () => {
    const pool = [card("e", "Lyon", ["furet"])];
    expect(
      pickDiscoverySit(pool, {
        topIds: [],
        topCities: ["Lyon"],
        sitterSpecies: [],
      }),
    ).toBeNull();
  });

  it("retourne le premier candidat honnête (ordre du pool)", () => {
    const pool = [
      card("a", "Lyon", ["chien"]), // rien de nouveau
      card("b", "Nice", ["chien"]), // ville nouvelle
      card("c", "Nice", ["furet"]), // aussi nouveau, mais après
    ];
    const found = pickDiscoverySit(pool, {
      topIds: [],
      topCities: ["Lyon"],
      sitterSpecies: ["chien"],
    });
    expect(found?.id).toBe("b");
  });

  it("insensible à la casse et aux espaces (villes)", () => {
    const pool = [card("f", "  lyon  ", ["chien"])];
    expect(
      pickDiscoverySit(pool, {
        topIds: [],
        topCities: ["Lyon"],
        sitterSpecies: ["chien"],
      }),
    ).toBeNull();
  });
});
