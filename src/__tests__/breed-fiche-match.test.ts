import { describe, it, expect } from "vitest";
import { breedFicheKey, resolveBreedFiche } from "@/lib/breedFicheMatch";

const fiches = [
  { species: "cat", breed: "européen" },
  { species: "cat", breed: "chartreux" },
  { species: "cat", breed: "chat des forêts norvégiennes" },
  { species: "cat", breed: "norvégien" },
  { species: "dog", breed: "labrador retriever" },
  { species: "dog", breed: "berger allemand" },
  { species: "dog", breed: "berger australien" },
  { species: "dog", breed: "berger belge malinois" },
  { species: "dog", breed: "malinois" },
  { species: "dog", breed: "jack russel" },
  { species: "dog", breed: "jack russell" },
  { species: "horse", breed: "âne du cotentin" },
];

describe("breedFicheKey", () => {
  it("neutralise casse, accents et espaces multiples", () => {
    expect(breedFicheKey("  Labrador   Retriever ")).toBe("labrador-retriever");
  });
  it("rapproche le féminin du masculin", () => {
    expect(breedFicheKey("Européenne")).toBe(breedFicheKey("européen"));
  });
  it("neutralise le pluriel", () => {
    expect(breedFicheKey("européen poils longs")).toBe("europeen-poil-long");
  });
});

describe("resolveBreedFiche", () => {
  it("exact après normalisation (féminin)", () => {
    expect(resolveBreedFiche("cat", "Européenne", fiches)?.breed).toBe("européen");
  });
  it("préfixe : nom déclaré préfixe du nom de fiche", () => {
    expect(resolveBreedFiche("dog", "Labrador", fiches)?.breed).toBe("labrador retriever");
  });
  it("préfixe inverse : nom de fiche préfixe du nom déclaré", () => {
    expect(resolveBreedFiche("cat", "européen poils courts", fiches)?.breed).toBe("européen");
  });
  it("préfixe inverse avec féminin et complément", () => {
    expect(resolveBreedFiche("cat", "Européenne black smoke", fiches)?.breed).toBe("européen");
  });
  it("refuse l'ambiguïté entre plusieurs fiches", () => {
    expect(resolveBreedFiche("dog", "berger", fiches)).toBeNull();
  });
  it("refuse les clés trop courtes en préfixe", () => {
    expect(resolveBreedFiche("cat", "chat", fiches)).toBeNull();
  });
  it("ne croise jamais les espèces", () => {
    expect(resolveBreedFiche("farm_animal", "âne", fiches)).toBeNull();
  });
  it("préfère l'exact au préfixe", () => {
    expect(resolveBreedFiche("dog", "malinois", fiches)?.breed).toBe("malinois");
  });
  it("départage les quasi-homonymes par l'exact", () => {
    expect(resolveBreedFiche("dog", "jack russel", fiches)?.breed).toBe("jack russel");
  });
  it("retourne null sans candidat", () => {
    expect(resolveBreedFiche("dog", "yorshire", fiches)).toBeNull();
  });
  it("retourne null sur saisie vide", () => {
    expect(resolveBreedFiche("dog", " ", fiches)).toBeNull();
  });
});
