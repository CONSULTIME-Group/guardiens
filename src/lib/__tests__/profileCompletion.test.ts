/**
 * Test « firewall » : fige le barème SQL de calculate_profile_completion
 * côté client. Toute divergence entre le SQL et src/lib/profileCompletion.ts
 * doit casser ce test.
 */
import { describe, it, expect } from "vitest";
import {
  computeSitterCompletion,
  computeOwnerCompletion,
  computeProfileCompletion,
} from "@/lib/profileCompletion";

const emptySitter = { role: "sitter" as const };
const emptyOwner = { role: "owner" as const };

const fullSitter = {
  role: "sitter" as const,
  first_name: "Alma",
  postal_code: "75001",
  country: "FR",
  avatar_url: "u",
  bio: "x".repeat(60),
  competences: ["chats"],
  lifestyle: ["actif"],
  geographic_radius: 20,
  has_sitter_gallery: true,
  identity_verified: true,
  interests: ["a", "b", "c"],
  languages: ["fr"],
  life_pace: "posé",
  animal_types: ["chien"],
};

const fullOwner = {
  role: "owner" as const,
  first_name: "Alma",
  postal_code: "75001",
  country: "FR",
  avatar_url: "u",
  bio: "x".repeat(60),
  owner_competences: ["accueil"],
  has_pet: true,
  property_description: "y".repeat(60),
  has_owner_gallery: true,
  identity_verified: true,
  interests: ["a", "b", "c"],
  languages: ["fr"],
  life_pace: "posé",
  home_ambiance: ["chaleureux"],
  preferred_sitter_types: ["retraité"],
};

describe("profileCompletion, barème SQL", () => {
  it("Gardien vide donne 0", () => {
    expect(computeSitterCompletion(emptySitter).score).toBe(0);
  });
  it("Propriétaire vide donne 0", () => {
    expect(computeOwnerCompletion(emptyOwner).score).toBe(0);
  });
  it("Gardien complet donne 100", () => {
    expect(computeSitterCompletion(fullSitter).score).toBe(100);
  });
  it("Propriétaire complet donne 100", () => {
    expect(computeOwnerCompletion(fullOwner).score).toBe(100);
  });

  it("Barème Gardien : essentiels 15+15+10+15+10+15 = 80, bonus 5+5+10 = 20", () => {
    const items = computeSitterCompletion(fullSitter).items;
    const byKey = Object.fromEntries(items.map(i => [i.key, i.points]));
    expect(byKey.location).toBe(15);
    expect(byKey.avatar).toBe(15);
    expect(byKey.bio).toBe(10);
    expect(byKey.competences).toBe(15);
    expect(byKey.lifestyle).toBe(10);
    expect(byKey.radius).toBe(15);
    expect(byKey.gallery).toBe(5);
    expect(byKey.identity).toBe(5);
    expect(byKey.affinity).toBe(10);
    expect(items.reduce((s, i) => s + i.points, 0)).toBe(100);
  });

  it("Barème Propriétaire : total = 100", () => {
    const items = computeOwnerCompletion(fullOwner).items;
    const byKey = Object.fromEntries(items.map(i => [i.key, i.points]));
    expect(byKey.location).toBe(10);
    expect(byKey.avatar).toBe(10);
    expect(byKey.bio).toBe(10);
    expect(byKey.owner_competences).toBe(10);
    expect(byKey.pet).toBe(20);
    expect(byKey.property_desc).toBe(10);
    expect(byKey.gallery).toBe(15);
    expect(byKey.identity).toBe(5);
    expect(byKey.affinity).toBe(10);
    expect(items.reduce((s, i) => s + i.points, 0)).toBe(100);
  });

  it("Affinité partielle donne 3/6 points sous le seuil", () => {
    const twoSignals = { ...emptySitter, interests: ["a", "b", "c"], languages: ["fr"] };
    // 2 signaux -> 6 pts affinité partielle
    expect(computeSitterCompletion(twoSignals).score).toBe(6);
  });

  it("Hors France, la ville suffit pour la localisation", () => {
    const belgian = { ...emptySitter, first_name: "A", city: "Bruxelles", country: "BE" };
    expect(computeSitterCompletion(belgian).score).toBe(15);
  });

  it("Compte 'both' prend le MAX des deux branches", () => {
    // Ce profil est complet côté gardien mais quasi vide côté proprio.
    const { score } = computeProfileCompletion("both", fullSitter);
    expect(score).toBe(100);
  });

  it("Missing list ne contient que les items non ok", () => {
    const partial = { ...emptySitter, first_name: "A", postal_code: "75001", avatar_url: "u" };
    const { missing } = computeSitterCompletion(partial);
    const keys = missing.map(m => m.key);
    expect(keys).not.toContain("location");
    expect(keys).not.toContain("avatar");
    expect(keys).toContain("bio");
    expect(keys).toContain("radius");
  });
});
