import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { computeAffinityResultFull } from "../affinityScore";

/**
 * ALIGNEMENT CHIFFRE AFFICHÉ / CHIFFRE DE TRI (décision du 23/08/2026).
 *
 * Côté PROPRIÉTAIRE, les listes sont triées par sortScore (score x
 * confiance) : le pourcentage AFFICHÉ doit être ce même sortScore, sinon le
 * deuxième de la liste peut porter un meilleur chiffre que le premier.
 * Côté GARDIEN (sa propre affinité avec une annonce), le chiffre reste le
 * score brut : le pondéré pénaliserait en permanence un profil peu
 * renseigné, ce que la règle 11 interdit.
 */

// Un propriétaire complet : tous les critères sont évaluables, donc la
// confiance d'un gardien ne dépend que de SES déclarations.
const OWNER_FULL = {
  life_pace: "calme",
  languages: ["Français", "Anglais"],
  interests: ["Lecture", "Jardinage"],
  presence_expected: "Télétravail OK",
  preferred_sitter_types: ["Retraité·e"],
  home_ambiance: ["Cocon casanier"],
  pets: [{ species: "cat" }, { species: "dog" }],
  car_required: true,
  accepts_sitter_pets: "yes",
  accepts_sitter_children: "yes",
  distance_km: 12,
};

// Gardien très déclarant, match moyen : score brut honnête, confiance haute.
const SITTER_FULL = {
  life_pace: "calme",
  languages: ["Français", "Anglais"],
  interests: ["Lecture"],
  work_during_sit: "full_remote",
  sitter_type: "Retraité·e voyageur·euse",
  animal_types: ["cat", "dog"],
  has_vehicle: true,
  experience_years: "5 ans et plus",
  special_animal_skills: ["Soins"],
  travels_with_children: false,
  travels_with_own_animals: false,
};

// Gardien quasi vide : un seul critère évaluable, match parfait dessus.
// Score brut 100, confiance très basse, sortScore bas.
const SITTER_EMPTY = {
  life_pace: "calme",
};

describe("alignement chiffre affiché / chiffre de tri (côté propriétaire)", () => {
  it("le fixture prouve que brut et pondéré peuvent diverger (sinon le test ne protège rien)", () => {
    const full = computeAffinityResultFull(OWNER_FULL, SITTER_FULL);
    const empty = computeAffinityResultFull(OWNER_FULL, SITTER_EMPTY);
    // Le profil vide a un BRUT plus élevé mais un PONDÉRÉ plus faible.
    expect(empty.score).toBeGreaterThan(full.score);
    expect(empty.sortScore).toBeLessThan(full.sortScore);
  });

  it("liste triée par sortScore : les chiffres AFFICHÉS (sortScore) sont décroissants", () => {
    const sitters = [SITTER_FULL, SITTER_EMPTY, { life_pace: "sportif" }, {}];
    const ranked = sitters
      .map((s) => computeAffinityResultFull(OWNER_FULL, s))
      .sort((a, b) => b.sortScore - a.sortScore);
    const displayed = ranked.map((r) => r.sortScore);
    for (let i = 1; i < displayed.length; i++) {
      expect(
        displayed[i] <= displayed[i - 1],
        `inversion d'affichage à la position ${i} : ${displayed.join(", ")}`,
      ).toBe(true);
    }
    // Contre-épreuve : avec le BRUT comme chiffre affiché, la même liste
    // triée par sortScore montre une inversion. C'est le défaut corrigé.
    const raw = ranked.map((r) => r.score);
    const hasInversion = raw.some((v, i) => i > 0 && v > raw[i - 1]);
    expect(hasInversion).toBe(true);
  });
});

describe("verrouillage des surfaces (scan statique)", () => {
  const read = (p: string) => readFileSync(join(process.cwd(), p), "utf8");

  it("surfaces PROPRIÉTAIRE : le chiffre montré est le sortScore", () => {
    const ownerSurfaces: Array<[string, string]> = [
      ["src/components/matching/OwnerToSitterAffinity.tsx", "displayScore={full.sortScore}"],
      ["src/components/dashboard/owner/OwnerStarSection.tsx", "affinity!.sortScore"],
      ["src/components/search/SitterResultCard.tsx", "affinity!.sortScore"],
      ["src/components/favorites/SitterCard.tsx", "displayScore={affinity.sortScore}"],
      ["src/components/ai/alma/AlmaFitGardien.tsx", "affinity.sortScore"],
    ];
    for (const [file, needle] of ownerSurfaces) {
      expect(read(file), `${file} doit afficher le sortScore`).toContain(needle);
    }
    // ApplicationsList : la couleur de la puce suit le chiffre montré.
    expect(read("src/components/sits/ApplicationsList.tsx")).toContain("?.sortScore");
  });

  it("surfaces GARDIEN : le chiffre montré reste le score brut (décision en attente)", () => {
    const sitterSurfaces = [
      "src/components/sits/views/SitterAffinitySection.tsx",
      "src/components/dashboard/sitter/SitterMatchSection.tsx",
      "src/components/dashboard/SitterFirstNBA.tsx",
      "src/components/matching/AffinitySection.tsx",
      "src/components/sits/ApplicationModal.tsx",
    ];
    for (const file of sitterSurfaces) {
      expect(
        read(file),
        `${file} ne doit pas afficher le sortScore tant que la décision gardien n'est pas tranchée`,
      ).not.toContain("displayScore");
      expect(read(file), `${file} ne doit pas trier l'affichage sur le pondéré`).not.toContain(
        "sortScore",
      );
    }
  });
});
