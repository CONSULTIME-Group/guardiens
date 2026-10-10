import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { sitterCardLine, sitterDistinctLines } from "@/lib/sitterDistinctLine";
import { computeAffinityResultFull } from "@/lib/affinityScore";

const o = { omitSitsAndReviews: true };

describe("R2 sitterCardLine, savoir-faire d'abord", () => {
  it("savoir-faire avant centres d'intérêt", () => {
    const l = sitterCardLine({ sitter_type: "Solo", competences: ["Potager", "Administration de médicaments"],
      interests: ["Randonnée", "Yoga", "Cinéma"] }, o);
    expect(l).toBe("En solo · médicaments, potager");
    expect(l).not.toMatch(/intérêt/);
  });
  it("sans savoir-faire, centres d'intérêt conservés", () => {
    expect(sitterCardLine({ sitter_type: "Solo", interests: ["Randonnée", "Yoga"] }, o))
      .toBe("En solo · centres d'intérêt : randonnée, yoga");
  });
  it("ordre situation, savoir-faire, véhiculé, expérience ; 80 caractères au plus", () => {
    const l = sitterCardLine({ sitter_type: "Famille", has_vehicle: true, experience_years: "5+ ans",
      competences: ["Soins chevaux", "Potager", "Petites réparations", "Arrosage plantes"], interests: ["Ski"] }, o);
    expect(l.startsWith("En famille · chevaux")).toBe(true);
    expect(l).toMatch(/véhiculé/);
    expect(l.length).toBeLessThanOrEqual(80);
  });
  it("_card sert de repli (visiteur), valeur directe prioritaire", () => {
    expect(sitterCardLine({ sitter_type: "Couple", _card: { competences: ["Potager"] } }, o)).toBe("En couple · potager");
    expect(sitterCardLine({ interests: ["Ski"], _card: { interests: ["Yoga"] } }, o)).toBe("Centres d'intérêt : ski");
  });
  it("« Près de chez vous » : ordre inchangé", () => {
    expect(sitterDistinctLines([{ sitter_type: "Couple", has_vehicle: true, competences: ["Potager"] }]))
      .toEqual(["En couple · véhiculé · potager"]);
  });
  it("_card n'entre pas dans l'affinité", () => {
    const owner: any = { animals: [{ species: "dog" }], car_required: true };
    const base: any = { animal_types: ["Chiens"], has_vehicle: true };
    const a = computeAffinityResultFull(owner, base);
    const b = computeAffinityResultFull(owner, { ...base, _card: { interests: ["Ski"], experience_years: "5+ ans" } });
    expect(b?.score).toBe(a?.score);
    expect(b?.sortScore).toBe(a?.sortScore);
  });
});

describe("R2 recherche : aucune requête supplémentaire", () => {
  // Lot 1 international : la liste passe par la RPC search_sitter_pool (une
  // lecture paginée), le compteur par search_sitter_country_counts.
  const src = readFileSync("src/components/search/SearchOwner.tsx", "utf8");
  const lib = readFileSync("src/lib/sitterSearch.ts", "utf8");
  it("aucune lecture directe de public_sitter_profiles, une seule RPC de vivier", () => {
    expect(src.match(/\.from\("public_sitter_profiles"\)/g)).toBeNull();
    expect(lib.match(/rpc\("search_sitter_pool"/g)?.length).toBe(1);
  });
  it("colonnes de la carte lues dans la même lecture et rangées dans _card", () => {
    expect(lib).toMatch(/_card: \{\s*competences: r\.competences,\s*special_animal_skills: r\.special_animal_skills,\s*interests: r\.interests,\s*experience_years: r\.experience_years,/);
  });
});
