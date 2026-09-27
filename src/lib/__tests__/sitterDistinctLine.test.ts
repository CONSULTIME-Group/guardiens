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

describe("sitterDistinctLine", () => {
  it("trois gardiennes réelles : lignes deux à deux différentes, Ingrid en tête attendue", () => {
    const lines = sitterDistinctLines([ingrid, apolline, anneSophie]);
    expect(lines[0].startsWith("En famille · plus de 5 ans d'expérience")).toBe(true);
    expect(new Set(lines).size).toBe(3);
    lines.forEach((l) => expect(l.length).toBeGreaterThan(0));
  });

  it("déduplication : « En couple » n'est affiché qu'une fois", () => {
    const lines = sitterDistinctLines([apolline, anneSophie]);
    expect(lines[0]).toMatch(/^En couple/);
    expect(lines[1]).not.toMatch(/En couple/);
  });

  it("jamais plus de 3 fragments, jamais le fragment générique", () => {
    const line = sitterDistinctLine({ ...ingrid, completed_sits_count: 4, reviews_count: 3, reviews_avg: 4.67 }, new Set());
    expect(line.split(" · ")).toHaveLength(3);
    expect(line).toBe("4 gardes réalisées · 3 avis, 4,7 · En famille");
    for (const s of [ingrid, apolline, anneSophie]) {
      expect(distinctFragments(s).join(" ")).not.toMatch(/déjà gardé des chiens et des chats/i);
    }
  });

  it("expérience : débutant et vide ne produisent rien, 3-5 ans équivaut à 2 à 5", () => {
    expect(distinctFragments({ experience_years: "Débutant" })).toEqual([]);
    expect(distinctFragments({ experience_years: "3-5 ans" })).toEqual(["de 2 à 5 ans d'expérience"]);
  });
});
