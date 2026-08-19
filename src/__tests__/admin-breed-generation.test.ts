import { describe, it, expect } from "vitest";
import {
  validateGenerationInput,
  findDuplicateFiche,
  isPlausibleBreedInput,
  computeMissingBreeds,
} from "@/lib/adminBreedGeneration";

const fiches = [
  { species: "cat", breed: "européen" },
  { species: "dog", breed: "labrador retriever" },
  { species: "dog", breed: "jack russell" },
  { species: "bird", breed: "perroquet gris du gabon" },
  { species: "dog", breed: "staffordshire bull terrier" },
  { species: "dog", breed: "american staffordshire terrier" },
];

describe("validateGenerationInput", () => {
  it("refuse une race vide ou blanche", () => {
    expect(validateGenerationInput("dog", "").ok).toBe(false);
    expect(validateGenerationInput("dog", "   ").ok).toBe(false);
    expect(validateGenerationInput("dog", null).ok).toBe(false);
  });
  it("refuse une race d'un seul caractère", () => {
    expect(validateGenerationInput("dog", "x").ok).toBe(false);
  });
  it("refuse une espèce vide", () => {
    expect(validateGenerationInput("", "Cane corso").ok).toBe(false);
  });
  it("accepte et trimme une saisie valide", () => {
    const r = validateGenerationInput("dog", "  Cane corso ");
    expect(r).toEqual({ ok: true, species: "dog", breed: "Cane corso" });
  });
});

describe("findDuplicateFiche", () => {
  it("détecte le doublon exact insensible à la casse et aux accents", () => {
    expect(findDuplicateFiche("dog", "Labrador  Retriever ", fiches)?.breed).toBe(
      "labrador retriever",
    );
  });
  it("détecte le doublon via alias (« Gris du Gabon » → « perroquet gris du gabon »)", () => {
    expect(findDuplicateFiche("bird", "Gris du Gabon", fiches)?.breed).toBe(
      "perroquet gris du gabon",
    );
  });
  it("détecte le doublon via fusion (« jack russel » → « jack russell »)", () => {
    expect(findDuplicateFiche("dog", "Jack russel", fiches)?.breed).toBe("jack russell");
  });
  it("détecte le doublon via préfixe (« Labrador » → « labrador retriever »)", () => {
    expect(findDuplicateFiche("dog", "labrador", fiches)?.breed).toBe("labrador retriever");
  });
  it("ne croise jamais les espèces", () => {
    expect(findDuplicateFiche("cat", "labrador", fiches)).toBeNull();
  });
  it("retourne null pour une race sans fiche", () => {
    expect(findDuplicateFiche("dog", "Cane corso", fiches)).toBeNull();
  });
});

describe("isPlausibleBreedInput", () => {
  it.each([
    "16 kgs ",
    "Le plus beau!",
    "La plus belle!",
    "2 Bergers de crau, 1 patou, 1 abalai, 1 kangale",
    "Une caniche nain, un shitsu et un morki",
    "x",
    "ab",
    "croisé dog",
    "X berger",
    "Inconnu",
  ])("rejette la saisie parasite « %s »", (declared) => {
    expect(isPlausibleBreedInput(declared)).toBe(false);
  });
  it.each([
    "Cane corso",
    "Berger Hollandais",
    "Appaloosa",
    "Poule pondeuse",
    "Beldi",
    "Spitz japonais",
  ])("accepte la race plausible « %s »", (declared) => {
    expect(isPlausibleBreedInput(declared)).toBe(true);
  });
});

describe("computeMissingBreeds", () => {
  const pet = (species: string, breed: string | null, property_id: string | null) => ({
    species,
    breed,
    property_id,
  });

  it("exclut les races couvertes par une fiche (exact, alias, préfixe)", () => {
    const pets = [
      pet("dog", "Labrador", "p1"),
      pet("bird", "Gris du Gabon", "p2"),
      pet("dog", "Cane corso", "p3"),
    ];
    const rows = computeMissingBreeds(pets, fiches, new Set());
    expect(rows).toHaveLength(1);
    expect(rows[0].displayBreed).toBe("Cane corso");
  });

  it("exclut les saisies parasites citées (chiffres, superlatifs, énumérations)", () => {
    const pets = [
      pet("dog", "16 kgs ", "p1"),
      pet("cat", "Le plus beau!", "p2"),
      pet("cat", "La plus belle!", "p3"),
      pet("dog", "2 Bergers de crau, 1 patou, 1 abalai, 1 kangale", "p4"),
      pet("dog", null, "p5"),
      pet("dog", "  ", "p6"),
    ];
    expect(computeMissingBreeds(pets, fiches, new Set())).toEqual([]);
  });

  it("regroupe les graphies proches et retient la plus fréquente", () => {
    const pets = [
      pet("dog", "Beldi", "p1"),
      pet("dog", "BELDI", "p2"),
      pet("dog", "Beldi ", "p3"),
    ];
    const rows = computeMissingBreeds(pets, fiches, new Set());
    expect(rows).toHaveLength(1);
    expect(rows[0].displayBreed).toBe("Beldi");
    expect(rows[0].animals).toBe(3);
  });

  it("compte les annonces en ligne une seule fois par logement", () => {
    const pets = [
      pet("dog", "Cane corso", "p1"),
      pet("dog", "Cane corso", "p1"), // même logement, 2 animaux
      pet("dog", "Cane corso", "p2"),
      pet("dog", "Cane corso", "p3"), // logement sans annonce en ligne
    ];
    const rows = computeMissingBreeds(pets, fiches, new Set(["p1", "p2"]));
    expect(rows).toHaveLength(1);
    expect(rows[0].animals).toBe(4);
    expect(rows[0].liveSits).toBe(2);
  });

  it("trie par annonces en ligne décroissantes puis par nombre d'animaux", () => {
    const pets = [
      pet("dog", "Cane corso", "p1"),
      pet("horse", "Appaloosa", "p2"),
      pet("horse", "Appaloosa", "p3"),
      pet("farm_animal", "Poule pondeuse", "p4"),
    ];
    const rows = computeMissingBreeds(pets, fiches, new Set(["p1", "p4"]));
    expect(rows.map((r) => r.displayBreed)).toEqual([
      "Cane corso",
      "Poule pondeuse",
      "Appaloosa",
    ]);
  });
});
