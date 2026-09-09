/**
 * Garde-fou : un seul référentiel par espace.
 *
 * Le pourcentage affiché et les items listés doivent toujours sortir du MEME
 * calcul (barème de l'espace rendu), jamais de `profiles.profile_completion`
 * qui stocke le maximum des deux barèmes pour les comptes role='both'.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  computeOwnerCompletion,
  computeSitterCompletion,
  topMissingItem,
  type ProfileCompletionInput,
} from "@/lib/profileCompletion";
import { sitterNextStep, ownerNextStep, topMissingHref } from "@/lib/dashboardNextStep";

const read = (p: string) => readFileSync(resolve(__dirname, "../..", p), "utf-8");

/** Compte both réel : owner 90, sitter 94, stocké 94. */
const divergent: ProfileCompletionInput = {
  role: "sitter",
  first_name: "Alma",
  postal_code: "75001",
  country: "FR",
  avatar_url: "u",
  bio: "x".repeat(60),
  competences: ["chats"],
  lifestyle: ["actif"],
  sitter_gallery_count: 3,
  identity_verified: true,
  interests: ["a", "b", "c"],
  languages: ["fr"],
  life_pace: "posé",
  animal_types: ["chien"],
  owner_competences: ["accueil"],
  has_pet: true,
  property_description: "y".repeat(60),
  has_owner_gallery: false,
  home_ambiance: ["chaleureux"],
  preferred_sitter_types: ["retraité"],
};

describe("cohérence du score de complétion", () => {
  it("les deux barèmes divergent bien sur un compte both", () => {
    const owner = computeOwnerCompletion({ ...divergent, role: "owner" });
    const sitter = computeSitterCompletion({ ...divergent, role: "sitter" });
    expect(owner.score).not.toBe(sitter.score);
  });

  it("la carte gardien affiche le score gardien et les items gardien", () => {
    const sitter = computeSitterCompletion({ ...divergent, role: "sitter" });
    const step = sitterNextStep({
      nextGuard: null,
      postalCode: "75001",
      hasAvatar: true,
      hasBio: true,
      profileCompletion: sitter.score,
      missing: sitter.missing,
    });
    if (sitter.score >= 100) throw new Error("Jeu de données invalide : score plein.");
    expect(step?.progressPct).toBe(sitter.score);
    expect(step?.title).toContain("gardien");
    expect(step?.ctaTo).toBe(topMissingItem(sitter)?.href);
    expect(step?.ctaTo?.startsWith("/profile")).toBe(true);
  });

  it("la carte propriétaire affiche le score propriétaire et les items propriétaire", () => {
    const owner = computeOwnerCompletion({ ...divergent, role: "owner" });
    const step = ownerNextStep({ profileCompletion: owner.score, missing: owner.missing });
    expect(step?.progressPct).toBe(owner.score);
    expect(step?.title).toContain("propriétaire");
    expect(step?.ctaTo).toBe(topMissingItem(owner)?.href);
    expect(step?.ctaTo?.startsWith("/owner-profile")).toBe(true);
  });

  it("le CTA cible la touche manquante la plus rentable", () => {
    expect(
      topMissingHref([
        { label: "a", points: 5, href: "/owner-profile?section=identity" },
        { label: "b", points: 20, href: "/owner-profile?section=animals" },
      ]),
    ).toBe("/owner-profile?section=animals");
  });

  it("les dashboards alimentent la carte avec le score ET les items du même calcul", () => {
    for (const f of [
      "components/dashboard/SitterDashboard.tsx",
      "components/dashboard/OwnerDashboard.tsx",
    ]) {
      const src = read(f);
      expect(src).toContain("completionMissing.score");
      expect(src).toContain("completionMissing.missing");
    }
  });

  it("les pages profil dérivent du module partagé, sans barème local", () => {
    const sitter = read("pages/SitterProfile.tsx");
    expect(sitter).toContain("computeSitterCompletion");
    expect(sitter).toContain("const liveScore = completionResult.score;");
    const owner = read("pages/OwnerProfile.tsx");
    expect(owner).toContain("computeOwnerCompletion");
    expect(owner).toContain("const liveScore = completionResult.score;");
    // Le rayon d'intervention est sorti du barème : plus aucun point associé.
    expect(sitter).not.toContain("criteria.radius");
  });
});
