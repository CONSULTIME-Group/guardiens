import { describe, it, expect } from "vitest";
import { breedFicheKey, normalizeBreedName, resolveBreedFiche } from "@/lib/breedFicheMatch";

// Sous-ensemble représentatif des fiches réellement en base (août 2026),
// complété par les fiches générées pour les races observées dans le vivier.
const fiches = [
  { species: "cat", breed: "européen" },
  { species: "cat", breed: "chartreux" },
  { species: "cat", breed: "chat des forêts norvégiennes" },
  { species: "cat", breed: "norvégien" },
  { species: "cat", breed: "maine coon" },
  { species: "dog", breed: "labrador retriever" },
  { species: "dog", breed: "berger allemand" },
  { species: "dog", breed: "berger australien" },
  { species: "dog", breed: "berger belge malinois" },
  { species: "dog", breed: "malinois" },
  { species: "dog", breed: "jack russel" },
  { species: "dog", breed: "jack russell" },
  { species: "dog", breed: "yorkshire terrier" },
  { species: "dog", breed: "rottweiler" },
  { species: "dog", breed: "staffordshire bull terrier" },
  { species: "dog", breed: "border collie" },
  { species: "dog", breed: "golden retriever" },
  { species: "dog", breed: "bouledogue français" },
  { species: "dog", breed: "bouledogue anglais" },
  { species: "dog", breed: "american staffordshire terrier" },
  { species: "dog", breed: "berger roumain" },
  { species: "dog", breed: "croisé bichon" },
  { species: "horse", breed: "âne du cotentin" },
  { species: "rodent", breed: "rat" },
];

describe("normalizeBreedName", () => {
  it("retire espaces de bordure, réduit les espaces multiples, minuscules, sans accents", () => {
    expect(normalizeBreedName("  Européen ")).toBe("europeen");
    expect(normalizeBreedName("Maine  coon")).toBe("maine coon");
    expect(normalizeBreedName("Gouttière ")).toBe("gouttiere");
    expect(normalizeBreedName("BELDI")).toBe("beldi");
  });
});

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

describe("resolveBreedFiche : normalisation des saisies réelles", () => {
  it.each([
    ["Européen "],
    ["Européen"],
    ["Européenne "],
    ["Europeen"],
    ["européen"],
  ])("chat %s → fiche européen", (declared) => {
    expect(resolveBreedFiche("cat", declared, fiches)?.breed).toBe("européen");
  });
  it("préfixe inverse : « européen poils courts » et « poils longs » → européen", () => {
    expect(resolveBreedFiche("cat", "européen poils courts", fiches)?.breed).toBe("européen");
    expect(resolveBreedFiche("cat", "européen poils longs ", fiches)?.breed).toBe("européen");
  });
  it("« Labrador » → labrador retriever (préfixe)", () => {
    expect(resolveBreedFiche("dog", "Labrador", fiches)?.breed).toBe("labrador retriever");
  });
  it("« Bouledogue francais » sans cédille → bouledogue français", () => {
    expect(resolveBreedFiche("dog", "Bouledogue francais", fiches)?.breed).toBe("bouledogue français");
  });
});

describe("resolveBreedFiche : alias explicites (saisies réelles)", () => {
  it.each([
    ["cat", "Gouttière ", "européen"],
    ["cat", "goutière", "européen"],
    ["cat", "Chat ", "européen"],
    ["cat", "Européenne black smoke", "européen"],
    ["cat", "Charteux", "chartreux"],
    ["dog", "Yorshire", "yorkshire terrier"],
    ["dog", "Rotweiler ", "rottweiler"],
    ["dog", "Staf", "staffordshire bull terrier"],
    ["dog", "Border ", "border collie"],
    ["dog", "golden", "golden retriever"],
    ["dog", "American stafford terrier", "american staffordshire terrier"],
    ["dog", "Roumain", "berger roumain"],
    ["dog", "roumain ", "berger roumain"],
  ])("%s « %s » → fiche « %s »", (species, declared, expected) => {
    expect(resolveBreedFiche(species, declared, fiches)?.breed).toBe(expected);
  });
  it("un alias sans fiche cible en base ne produit aucun lien", () => {
    // « Westie » → west highland white terrier, fiche absente du jeu de test.
    expect(resolveBreedFiche("dog", "Westie", fiches)).toBeNull();
  });
});

describe("resolveBreedFiche : règle du croisement", () => {
  it("« croisé labrador » → labrador retriever", () => {
    expect(resolveBreedFiche("dog", "croisé labrador", fiches)?.breed).toBe("labrador retriever");
  });
  it("« Croisé Maine Coon » → maine coon", () => {
    expect(resolveBreedFiche("cat", "Croisé Maine Coon ", fiches)?.breed).toBe("maine coon");
  });
  it("une fiche exacte « croisé bichon » prime sur la règle du croisement", () => {
    expect(resolveBreedFiche("dog", "Croisé bichon ", fiches)?.breed).toBe("croisé bichon");
  });
  it("« X berger » ne matche rien : race citée ambiguë", () => {
    expect(resolveBreedFiche("dog", "X berger", fiches)).toBeNull();
  });
  it("« croisé dog » ne matche rien : race citée inexploitable", () => {
    expect(resolveBreedFiche("dog", "croisé dog", fiches)).toBeNull();
  });
});

describe("resolveBreedFiche : garde-fou, jamais de faux rapprochement", () => {
  it.each([
    "16 kgs ",
    "Le plus beau!",
    "La plus belle!",
    "2 Bergers de crau, 1 patou, 1 abalai, 1 kangale",
    "Une caniche nain, un shitsu et un morki",
    "Croisé Podenco",
    "Bouledogue américain",
    "bouvien d'appenzell",
    "Royal Bourbon",
    "Spitz japonais",
  ])("aucun lien pour la saisie réelle « %s »", (declared) => {
    expect(resolveBreedFiche("dog", declared, fiches)).toBeNull();
  });
  it("refuse l'ambiguïté entre plusieurs fiches", () => {
    expect(resolveBreedFiche("dog", "berger", fiches)).toBeNull();
  });
  it("refuse les clés trop courtes en préfixe", () => {
    expect(resolveBreedFiche("cat", "sia", fiches)).toBeNull();
  });
  it("ne croise jamais les espèces", () => {
    // L'âne déclaré en animal de ferme ne renvoie pas vers la fiche cheval.
    expect(resolveBreedFiche("farm_animal", "Âne", fiches)).toBeNull();
    // Le lapin (NAC) ne renvoie pas vers la fiche rat (rongeur).
    expect(resolveBreedFiche("nac", "Lapin", fiches)).toBeNull();
  });
  it("préfère l'exact au préfixe", () => {
    expect(resolveBreedFiche("dog", "malinois", fiches)?.breed).toBe("malinois");
  });
  it("départage les quasi-homonymes par l'exact", () => {
    expect(resolveBreedFiche("dog", "jack russel", fiches)?.breed).toBe("jack russel");
  });
  it("retourne null sans candidat", () => {
    expect(resolveBreedFiche("dog", "yorshire", [])).toBeNull();
  });
  it("retourne null sur saisie vide", () => {
    expect(resolveBreedFiche("dog", " ", fiches)).toBeNull();
  });
});
