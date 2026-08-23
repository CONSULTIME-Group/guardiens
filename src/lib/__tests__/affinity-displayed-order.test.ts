import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { computeAffinityResultFull } from "../affinityScore";
import {
  AFFINITY_DISPLAY_REGISTRY,
  type AffinityDisplayKey,
} from "../affinityDisplayRegistry";

/**
 * ALIGNEMENT CHIFFRE AFFICHÉ / CHIFFRE DE TRI (décisions des 20 et 23/08/2026).
 *
 * Un seul chiffre par surface, le même pour trier et pour afficher :
 *  - surfaces de CLASSEMENT (recherche, Top 3) : tri et affichage sur le
 *    sortScore (score x confiance) ;
 *  - surfaces CANDIDATURES (ApplicationsList, OwnerStarSection) : tri et
 *    affichage sur le score BRUT. 53 candidatures au total, 2,5 par
 *    annonce : le chiffre ne sert pas à trier, il sert à oser dire oui ;
 *  - côté GARDIEN : le brut, inchangé (règle 11, le silence ne se punit pas).
 *
 * Ce test est GÉNÉRIQUE : il pilote le registre
 * `src/lib/affinityDisplayRegistry.ts`. Toute nouvelle surface affichant un
 * pourcentage d'affinité DOIT y être déclarée ; elle est alors couverte par
 * les assertions ci-dessous sans modifier ce fichier.
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

// Génération déterministe de profils gardiens variés (mix déclarants,
// partiels, vides) pour éprouver la monotonie sur des couples réalistes.
function makeSitters(n: number): Array<Record<string, unknown>> {
  const paces = ["calme", "actif", "equilibre", undefined];
  const langs = [["Français"], ["Français", "Anglais"], ["Français", "Espagnol"], undefined];
  const interests = [["Lecture"], ["Jardinage", "Randonnée"], ["Cuisine"], undefined];
  const works = ["full_remote", "partial_remote", "on_site", "out_daytime", "flexible", undefined];
  const types = ["Retraité·e voyageur·euse", "Étudiant·e", "Famille nombreuse", undefined];
  const animals = [["cat", "dog"], ["dog"], ["cat"], ["horse"], ["Tous"], undefined];
  const out: Array<Record<string, unknown>> = [];
  for (let i = 0; i < n; i++) {
    out.push({
      life_pace: paces[i % paces.length],
      languages: langs[Math.floor(i / 2) % langs.length],
      interests: interests[Math.floor(i / 3) % interests.length],
      work_during_sit: works[Math.floor(i / 5) % works.length],
      sitter_type: types[Math.floor(i / 7) % types.length],
      animal_types: animals[Math.floor(i / 11) % animals.length],
      has_vehicle: i % 3 === 0 ? true : i % 3 === 1 ? false : null,
      has_license: i % 2 === 0,
      experience_years: i % 4 === 0 ? "5 ans et plus" : undefined,
      special_animal_skills: i % 5 === 0 ? ["Soins"] : undefined,
      travels_with_children: i % 6 === 0 ? true : i % 6 === 1 ? false : null,
      travels_with_own_animals: i % 7 === 0 ? true : i % 7 === 1 ? false : null,
    });
  }
  return out;
}

describe("divergence brut / pondéré (la raison d'être de l'alignement)", () => {
  it("un profil quasi vide a un brut plus élevé mais un pondéré plus faible", () => {
    const full = computeAffinityResultFull(OWNER_FULL, {
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
    });
    const empty = computeAffinityResultFull(OWNER_FULL, { life_pace: "calme" });
    expect(empty.score).toBeGreaterThan(full.score);
    expect(empty.sortScore).toBeLessThan(full.sortScore);
  });
});

describe("registre des surfaces d'affinité (pilote générique)", () => {
  const read = (p: string) => readFileSync(join(process.cwd(), p), "utf8");

  it("chaque surface déclarée affiche la clé qu'elle déclare (scan statique)", () => {
    for (const s of AFFINITY_DISPLAY_REGISTRY) {
      const content = read(s.file);
      expect(
        content,
        `${s.surface} (${s.file}) doit contenir la preuve "${s.proof}"`,
      ).toContain(s.proof);
      if (s.forbidden) {
        expect(
          content,
          `${s.surface} (${s.file}) ne doit pas contenir "${s.forbidden}"`,
        ).not.toContain(s.forbidden);
      }
    }
  });

  it("surfaces CANDIDATURES : la clé déclarée est le score brut, verrouillé", () => {
    const candidatures = AFFINITY_DISPLAY_REGISTRY.filter(
      (s) => s.category === "candidatures",
    );
    expect(candidatures.length).toBeGreaterThanOrEqual(2);
    for (const s of candidatures) {
      expect(
        s.displayKey,
        `${s.surface} affiche le score BRUT : à 2,5 candidatures par annonce, ` +
          "le chiffre sert à oser dire oui, pas à trier (décision du 23/08/2026).",
      ).toBe("score");
    }
  });

  it("surfaces de CLASSEMENT : la clé déclarée est le sortScore (clé de tri)", () => {
    const classement = AFFINITY_DISPLAY_REGISTRY.filter(
      (s) => s.category === "classement",
    );
    expect(classement.length).toBeGreaterThanOrEqual(1);
    for (const s of classement) {
      expect(
        s.displayKey,
        `${s.surface} trie sur le sortScore, elle doit l'afficher`,
      ).toBe("sortScore");
    }
  });

  it("pour toute collection ordonnée, la suite des chiffres affichés est non croissante", () => {
    const sitters = makeSitters(60);
    const governed = AFFINITY_DISPLAY_REGISTRY.filter(
      (s) => s.category === "classement" || s.category === "candidatures",
    );
    for (const s of governed) {
      const sortKey: AffinityDisplayKey =
        s.category === "candidatures" ? "score" : "sortScore";
      const ranked = sitters
        .map((x) => computeAffinityResultFull(OWNER_FULL, x))
        .sort((a, b) => b[sortKey] - a[sortKey]);
      const displayed = ranked.map((r) => r[s.displayKey]);
      for (let i = 1; i < displayed.length; i++) {
        expect(
          displayed[i] <= displayed[i - 1],
          `${s.surface} : inversion d'affichage à la position ${i} ` +
            `(${displayed.join(", ")})`,
        ).toBe(true);
      }
    }
  });
});

describe("côté GARDIEN : rien ne change (décision gardien non tranchée)", () => {
  const read = (p: string) => readFileSync(join(process.cwd(), p), "utf8");

  it("les surfaces gardien continuent d'afficher le score brut", () => {
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
