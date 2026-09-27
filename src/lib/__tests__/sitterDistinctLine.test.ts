import { describe, it, expect } from "vitest";
import { sitterDistinctLine, sitterDistinctLines, distinctFragments } from "@/lib/sitterDistinctLine";

// Données réelles lues en base le 27/09/2026 (sitter_profiles, profiles, reviews publiés).
const ingrid = {
  // 8ed71b00-7296-4413-8d94-9608f5177ff9
  completed_sits_count: 0, reviews_count: 0, reviews_avg: null,
  sitter_type: "Famille", experience_years: "5+ ans",
  animal_types: ["Chiens", "Chats", "Chevaux", "Oiseaux", "Animaux de ferme", "NAC"],
  competences: ["Promenade chiens", "Soins chats", "Soins chevaux", "Administration médicaments animaux", "Éducation canine", "Arrosage plantes", "Aide aux devoirs", "Courses pour personne âgée", "Aide administrative", "Soins animaux de ferme"],
  special_animal_skills: ["Administration de médicaments", "Chiot / chaton non propre", "Cheval / poney", "Animaux de ferme", "Éducation positive", "Chien réactif ou peureux", "Animal âgé ou en fin de vie"],
  interests: ["Lecture", "Ski", "Sports nautiques", "Méditation"],
};
const apolline = {
  // 68ef3937-6b0c-4d02-84b4-f182182f5b0c
  completed_sits_count: 0, reviews_count: 0, reviews_avg: null,
  sitter_type: "Couple", experience_years: "",
  animal_types: ["Chiens", "Chats"],
  competences: ["Promenade chiens", "Potager", "Arrosage plantes", "Courses pour personne âgée", "Ménage occasionnel"],
  special_animal_skills: [],
  interests: ["Lecture", "Voyage", "Randonnée"],
};
const anneSophie = {
  // 274f7e47-2ffa-4950-912d-c147c5474d9f
  completed_sits_count: 0, reviews_count: 0, reviews_avg: null,
  sitter_type: "Couple", experience_years: "",
  animal_types: ["Chiens", "Chats", "Chevaux", "Animaux de ferme", "NAC"],
  competences: [], special_animal_skills: [],
  interests: ["Lecture", "Cuisine", "Jardinage", "Bricolage"],
};

describe("sitterDistinctLine (D1b)", () => {
  it("trois gardiennes réelles : lignes exactes de la maquette validée", () => {
    expect(sitterDistinctLines([ingrid, apolline, anneSophie])).toEqual([
      "En famille · plus de 5 ans d'expérience · animaux de ferme, chevaux, NAC",
      "En couple · potager, arrosage des plantes, promenades",
      "En couple · centres d'intérêt : cuisine, jardinage, bricolage",
    ]);
  });

  it("ce que tous partagent n'apparaît sur aucune ligne (chiens, chats, lecture)", () => {
    for (const order of [[ingrid, apolline, anneSophie], [anneSophie, apolline, ingrid]]) {
      const lines = sitterDistinctLines(order);
      expect(new Set(lines).size).toBe(lines.length);
      for (const l of lines) {
        expect(l).not.toMatch(/\bchiens\b|\bchats\b|lecture|déjà gardé/i);
        expect(l.length).toBeLessThanOrEqual(80);
      }
    }
  });

  it("un savoir-faire cité une fois n'est pas répété sur la ligne suivante", () => {
    const [first, , third] = sitterDistinctLines([ingrid, apolline, anneSophie]);
    expect(first).toMatch(/chevaux/);
    expect(third).not.toMatch(/chevaux/);
  });

  it("confiance réelle en tête, 3 fragments au plus", () => {
    const line = sitterDistinctLine({ ...ingrid, completed_sits_count: 4, reviews_count: 3, reviews_avg: 4.67 });
    expect(line).toBe("4 gardes réalisées · 3 avis, moyenne 4,7 · en famille");
  });

  it("profils sans rien de distinctif : ligne vide, jamais de phrase générique ni de doublon", () => {
    const bare = { animal_types: ["Chiens", "Chats"] };
    expect(sitterDistinctLines([bare, bare])).toEqual(["", ""]);
    const couple = { sitter_type: "Couple", animal_types: ["Chiens", "Chats"] };
    expect(sitterDistinctLines([couple, couple])).toEqual(["En couple", ""]);
  });

  it("jamais la simple garde de chiens ou de chats", () => {
    expect(distinctFragments({ animal_types: ["Chiens", "Chats"] })).toEqual([]);
  });

  it("expérience : débutant et vide ne produisent rien, 3-5 ans équivaut à 2 à 5", () => {
    expect(distinctFragments({ experience_years: "Débutant" })).toEqual([]);
    expect(distinctFragments({ experience_years: "3-5 ans" })).toEqual(["de 2 à 5 ans d'expérience"]);
  });
});
