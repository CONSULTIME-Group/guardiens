/**
 * Invariant central : le filtre anti non-race et le résolveur de fiche
 * partagent UNE SEULE définition du croisement, la constante
 * `CROISE_PREFIX` exportée par `breedFicheMatch.ts`. Aucun désaccord
 * possible entre les deux, contrairement au schéma corrigé le 23/08 sur
 * les tags d'ambiance.
 */
import { describe, it, expect } from "vitest";
import { isPlausibleBreedInput } from "@/lib/adminBreedGeneration";
import {
  CROISE_PREFIX,
  breedFicheKey,
  resolveBreedFiche,
} from "@/lib/breedFicheMatch";

/** Fiches réelles utiles au test : « bichon » mène à deux fiches. */
const fiches = [
  { species: "dog", breed: "bichon maltais" },
  { species: "dog", breed: "bichon frise" },
  { species: "dog", breed: "labrador retriever" },
  { species: "cat", breed: "norvégien" },
  { species: "cat", breed: "européen" },
];

const CROISEMENTS = ["croisé bichon", "croisé labrador", "x berger", "croise podenco"];

describe("croisement, définition unique et partagée", () => {
  it("le filtre utilise la constante exportée par le résolveur", () => {
    expect(CROISE_PREFIX).toBeInstanceOf(RegExp);
    for (const declared of CROISEMENTS) {
      expect(CROISE_PREFIX.test(breedFicheKey(declared))).toBe(true);
    }
  });

  it.each(CROISEMENTS)("« %s » est refusé par le filtre", (declared) => {
    expect(isPlausibleBreedInput(declared)).toBe(false);
  });

  it("« croisé bichon » ne résout aucune fiche, l'ambiguïté gagne", () => {
    expect(resolveBreedFiche("dog", "croisé bichon", fiches)).toBeNull();
  });

  it("« croisé labrador » résout encore la fiche de la race citée", () => {
    expect(resolveBreedFiche("dog", "croisé labrador", fiches)?.breed).toBe(
      "labrador retriever",
    );
  });
});

describe("termes génériques et robes", () => {
  it.each(["chien", "chat", "cheval", "lapin", "poule", "poules", "chevre", "chevres", "ane"])(
    "refuse le mot d'espèce « %s »",
    (declared) => {
      expect(isPlausibleBreedInput(declared)).toBe(false);
    },
  );

  it.each([
    "écaille de tortue",
    "tricolore",
    "bringé",
    "black smoke",
    "poils courts",
    "poils longs",
  ])("refuse la robe « %s »", (declared) => {
    expect(isPlausibleBreedInput(declared)).toBe(false);
  });

  it.each(["Cane corso", "Beldi", "Berger créole", "Norvégien", "Européen"])(
    "accepte la vraie race « %s »",
    (declared) => {
      expect(isPlausibleBreedInput(declared)).toBe(true);
    },
  );
});

describe("fusion du chat norvégien", () => {
  it("« chat des forêts norvégiennes » renvoie la fiche conservée", () => {
    const withAbsorbed = [
      ...fiches,
      { species: "cat", breed: "chat des forêts norvégiennes" },
    ];
    expect(
      resolveBreedFiche("cat", "chat des forêts norvégiennes", withAbsorbed)?.breed,
    ).toBe("norvégien");
  });
});
