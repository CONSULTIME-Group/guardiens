import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { sitterDistinctLines } from "@/lib/sitterDistinctLine";
import { nearbyPlaceLabel, nearbyExitLabel } from "@/lib/ownerNearbyLabels";
import { sitterSideReason } from "@/lib/sitterSideReason";

// Données réelles (sitter_profiles_affinity + competences publiques), relevées le 28/09/2026.
const ingrid = {
  completed_sits_count: 0, reviews_count: 0, reviews_avg: null,
  sitter_type: "Famille", experience_years: "5+ ans",
  animal_types: ["Chiens", "Chats", "Chevaux", "Oiseaux", "Animaux de ferme", "NAC"],
  competences: ["Promenade chiens", "Soins chats", "Soins chevaux", "Administration médicaments animaux", "Éducation canine", "Arrosage plantes", "Aide aux devoirs", "Courses pour personne âgée", "Aide administrative", "Soins animaux de ferme"],
  special_animal_skills: ["Administration de médicaments", "Chiot / chaton non propre", "Cheval / poney", "Animaux de ferme", "Éducation positive", "Chien réactif ou peureux", "Animal âgé ou en fin de vie"],
  interests: ["Lecture", "Ski", "Sports nautiques", "Méditation"],
};
const apolline = {
  completed_sits_count: 0, reviews_count: 0, reviews_avg: null,
  sitter_type: "Couple", experience_years: "",
  animal_types: ["Chiens", "Chats"],
  competences: ["Promenade chiens", "Potager", "Arrosage plantes", "Courses pour personne âgée", "Ménage occasionnel"],
  special_animal_skills: [],
  interests: ["Lecture", "Voyage", "Randonnée"],
};
// e9abd09e-715d-4e8a-b977-76b9a616170d, absente de public_sitter_profiles (competences inconnues).
const lavanya = {
  sitter_type: "Couple", experience_years: "",
  animal_types: ["Tous", "Chiens", "Chats", "Chevaux", "Oiseaux", "Animaux de ferme", "NAC"],
  special_animal_skills: [],
  interests: ["Musique", "Cuisine", "Course à pied", "Randonnée", "Voyage", "Art", "Jardinage"],
};

describe("D3.1 lignes distinctives sur le vivier complet", () => {
  it("Ingrid, Apolline, Lavanya", () => {
    expect(sitterDistinctLines([ingrid, apolline, lavanya])).toEqual([
      "En famille · plus de 5 ans d'expérience · animaux de ferme, chevaux, NAC",
      "En couple · potager, arrosage des plantes, promenades",
      "En couple · oiseaux · centres d'intérêt : musique, cuisine, course à pied",
    ]);
  });
  it("le composant lit sitter_profiles_affinity, compétences fusionnées", () => {
    const src = readFileSync("src/components/dashboard/owner/OwnerNearbySitters.tsx", "utf8");
    expect(src).toContain('from("sitter_profiles_affinity"');
    expect(src).toContain('select("user_id, competences")');
  });
});

describe("D3.2 distance", () => {
  it("sous 1 km : la ville seule", () => {
    expect(nearbyPlaceLabel("Lyon", 0.4)).toBe("Lyon");
    expect(nearbyPlaceLabel("Lyon", 0)).toBe("Lyon");
    expect(nearbyPlaceLabel("Lyon", 3.2)).toBe("Lyon, 3 km");
    expect(nearbyPlaceLabel("Lyon", 1)).toBe("Lyon, 1 km");
  });
});

describe("D3.3 lien de sortie", () => {
  it("compte du rayon, jamais le vivier national", () => {
    expect(nearbyExitLabel({ totalCount: 42, radiusUsed: 30, hasGeo: true })).toBe("Voir les 42 gardiens à moins de 30 km");
    expect(nearbyExitLabel({ totalCount: 1289, radiusUsed: null, hasGeo: false })).toBe("Voir tous les gardiens");
    expect(nearbyExitLabel({ totalCount: 900, radiusUsed: 100, hasGeo: true, isBeyond: true })).toBe("Voir tous les gardiens");
    expect(nearbyExitLabel(null)).toBe("Voir tous les gardiens");
  });
  it("aucun totalPool accolé à « près de » dans le tableau de bord", () => {
    const src = readFileSync("src/components/dashboard/owner/OwnerNearbySitters.tsx", "utf8");
    expect(src).not.toMatch(/totalPool/);
    expect(src).not.toMatch(/gardiens\$\{[^}]*\}? ?près de/);
    expect(src).toContain('to="/search?role=sitter"');
  });
});

describe("D3.4 raisons côté gardien", () => {
  it("les 5 phrases du moteur", () => {
    expect(sitterSideReason("Véhiculé, comme vous le souhaitez")).toBe("Véhiculé, comme demandé");
    expect(sitterSideReason("Gardien expérimenté, comme vous le demandez")).toBe("Expérimenté, comme demandé");
    expect(sitterSideReason("Débutant motivé, comme vous le demandez")).toBe("Débutant motivé, comme demandé");
    expect(sitterSideReason("Télétravailleur, comme vous le souhaitez")).toBe("Télétravailleur, comme demandé");
    expect(sitterSideReason("Sur place, comme vous le souhaitez")).toBe("Sur place, comme demandé");
    expect(sitterSideReason("Chiens, chats")).toBe("Chiens, chats");
  });
});

describe("D3.5 et D3.6", () => {
  it("« Bienvenue » seulement tant que la liste d'ouverture est visible", () => {
    const src = readFileSync("src/components/dashboard/SitterDashboard.tsx", "utf8");
    expect(src).toContain('greeting={openingVisible ? "Bienvenue" : undefined}');
  });
  it("anneau : espace insécable fine avant %", () => {
    const src = readFileSync("src/components/matching/AffinityRing.tsx", "utf8");
    expect(src).toContain('{clamped}{"\\u202F"}%');
  });
});
