import { describe, it, expect } from "vitest";
import {
  LEVEL_BADGE_CLASS,
  SPECIES_ORDER,
  extractDifficultyLevel,
  groupBreedsBySpecies,
  isMergedBreedSource,
  searchBreeds,
  visibleBreeds,
  type BreedListingEntry,
} from "@/lib/breedsListingModel";

const entry = (
  species: string,
  breed: string,
  extra: Partial<BreedListingEntry> = {},
): BreedListingEntry => ({
  species,
  breed,
  image_url: null,
  image_alt: null,
  difficulty_level: null,
  ...extra,
});

describe("extractDifficultyLevel", () => {
  it("extrait le premier mot avant la ponctuation (point ou virgule)", () => {
    expect(
      extractDifficultyLevel(
        "Exigeant. La garde d'un Gris du Gabon est exigeante en raison de son intelligence élevée.",
      ),
    ).toBe("Exigeant");
    expect(extractDifficultyLevel("Facile, Le Shih Tzu est un chien calme.")).toBe("Facile");
    expect(extractDifficultyLevel("Modéré, car ce chien demande de l'exercice.")).toBe("Modéré");
    expect(extractDifficultyLevel("Modéré. Le Jack Russell est vif.")).toBe("Modéré");
  });
  it("normalise la casse et les accents", () => {
    expect(extractDifficultyLevel("modere")).toBe("Modéré");
    expect(extractDifficultyLevel("FACILE.")).toBe("Facile");
  });
  it("accepte les deux chaînes réelles générées avec une virgule (cane corso, poule pondeuse)", () => {
    // Chaînes réellement écrites en base le 19/08/2026 : virgule au lieu
    // du point attendu après le niveau. La pastille doit quand même
    // extraire le premier mot.
    expect(
      extractDifficultyLevel(
        "Exigeant, car le Cane Corso est un chien puissant qui demande une éducation ferme et cohérente, ainsi qu'une excellente socialisation dès son plus jeune âge. Sa force physique et son tempérament protecteur nécessitent un gardien expérimenté, capable de gérer des situations potentiellement complexes et de maintenir une autorité douce mais inébranlable. Il ne convient pas aux personnes n'ayant aucune expérience avec les chiens de grande taille ou les races ayant un fort caractère.",
      ),
    ).toBe("Exigeant");
    expect(
      extractDifficultyLevel(
        "Modéré, la garde d'une poule pondeuse est modérée pour un gardien débutant. Bien que l'animal soit autonome pour de nombreux aspects, la surveillance de sa santé, la gestion de son environnement extérieur sécurisé et la propreté du poulailler demandent une attention et une régularité qui peuvent surprendre un novice. La gestion des œufs et la compréhension de leur comportement social nécessitent également un apprentissage.",
      ),
    ).toBe("Modéré");
  });
  it("accepte deux-points et espace comme séparateurs", () => {
    expect(extractDifficultyLevel("Exigeant : la garde demande de l'expérience.")).toBe("Exigeant");
    expect(extractDifficultyLevel("Facile pour un gardien débutant")).toBe("Facile");
  });
  it("n'affiche rien plutôt qu'une valeur fausse", () => {
    expect(extractDifficultyLevel("Plutôt facile à garder")).toBeNull();
    expect(extractDifficultyLevel("Difficile")).toBeNull();
    expect(extractDifficultyLevel("")).toBeNull();
    expect(extractDifficultyLevel(null)).toBeNull();
    expect(extractDifficultyLevel(undefined)).toBeNull();
  });
  it("chaque niveau a une classe de pastille définie", () => {
    for (const level of ["Facile", "Modéré", "Exigeant"] as const) {
      expect(LEVEL_BADGE_CLASS[level]).toBeTruthy();
    }
  });
});

describe("fiches fusionnées", () => {
  it("« gris du gabon » et « jack russel » sont des fiches absorbées", () => {
    expect(isMergedBreedSource(entry("bird", "gris du gabon"))).toBe(true);
    expect(isMergedBreedSource(entry("dog", "jack russel"))).toBe(true);
  });
  it("la détection ignore la casse et les espaces", () => {
    expect(isMergedBreedSource(entry("bird", "Gris Du Gabon "))).toBe(true);
    expect(isMergedBreedSource(entry("dog", "Jack  Russel"))).toBe(true);
  });
  it("les fiches cibles restent visibles", () => {
    expect(isMergedBreedSource(entry("bird", "perroquet gris du gabon"))).toBe(false);
    expect(isMergedBreedSource(entry("dog", "jack russell"))).toBe(false);
  });
  it("la fusion ne croise pas les espèces", () => {
    expect(isMergedBreedSource(entry("cat", "jack russel"))).toBe(false);
  });
  it("visibleBreeds retire uniquement les fiches absorbées", () => {
    const list = [
      entry("bird", "gris du gabon"),
      entry("bird", "perroquet gris du gabon"),
      entry("dog", "jack russel"),
      entry("dog", "jack russell"),
      entry("dog", "labrador retriever"),
    ];
    expect(visibleBreeds(list).map((b) => b.breed)).toEqual([
      "perroquet gris du gabon",
      "jack russell",
      "labrador retriever",
    ]);
  });
});

describe("groupBreedsBySpecies", () => {
  it("ordonne les sections par volume réel d'animaux gardés", () => {
    const list = [
      entry("bird", "inséparable"),
      entry("cat", "maine coon"),
      entry("rodent", "rat"),
      entry("dog", "beagle"),
      entry("horse", "appaloosa"),
      entry("farm_animal", "poule"),
      entry("nac", "lapin"),
    ];
    expect(groupBreedsBySpecies(list).map((s) => s.species)).toEqual([
      "dog",
      "cat",
      "horse",
      "farm_animal",
      "rodent",
      "nac",
      "bird",
    ]);
  });
  it("une espèce inconnue part en fin de page", () => {
    const list = [entry("fish", "poisson rouge"), entry("dog", "beagle")];
    expect(groupBreedsBySpecies(list).map((s) => s.species)).toEqual(["dog", "fish"]);
  });
  it("trie les races en français à l'intérieur d'une section", () => {
    const list = [
      entry("dog", "shih tzu"),
      entry("dog", "beagle"),
      entry("dog", "épagneul breton"),
    ];
    expect(groupBreedsBySpecies(list)[0].breeds.map((b) => b.breed)).toEqual([
      "beagle",
      "épagneul breton",
      "shih tzu",
    ]);
  });
  it("ignore les espèces sans fiche", () => {
    expect(groupBreedsBySpecies([])).toEqual([]);
    expect(SPECIES_ORDER[0]).toBe("dog");
  });
});

describe("searchBreeds", () => {
  const list = [
    entry("cat", "Européen"),
    entry("cat", "Maine Coon"),
    entry("dog", "Bouledogue Français"),
  ];
  it("tolère casse, accents et espaces superflus", () => {
    expect(searchBreeds(list, "europeen").map((b) => b.breed)).toEqual(["Européen"]);
    expect(searchBreeds(list, "  maine  COON ").map((b) => b.breed)).toEqual(["Maine Coon"]);
    expect(searchBreeds(list, "bouledogue francais")).toHaveLength(1);
  });
  it("une recherche vide retourne tout", () => {
    expect(searchBreeds(list, "")).toHaveLength(3);
    expect(searchBreeds(list, "   ")).toHaveLength(3);
  });
  it("sans correspondance, liste vide", () => {
    expect(searchBreeds(list, "whippet")).toEqual([]);
  });
});
