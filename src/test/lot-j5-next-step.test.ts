import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import {
  sitterNextStep,
  ownerNextStep,
  NEXT_STEP_ACTION_THRESHOLD,
} from "@/lib/dashboardNextStep";
import { ALMA_PROFILE_NUDGE_THRESHOLD } from "@/lib/alma/profileNudge";
import { rewriteForbiddenWords } from "../../supabase/functions/_shared/alma-output";

const galleryMissing = [{ label: "Galerie de 3 photos ou plus", hint: "1 photo pour l'instant", points: 5, href: "/profile?tab=galerie" }];
const base = { postalCode: "69001", hasAvatar: true, hasBio: true, identityAction: null };
const mission = { id: "m1", title: "Arroser les tomates", city: "Lyon", category: "jardin", status: "open" };

describe("Lot J5, carte « Votre prochain pas »", () => {
  it("le seuil vient de profileNudge.ts, importé et jamais recopié", () => {
    expect(NEXT_STEP_ACTION_THRESHOLD).toBe(ALMA_PROFILE_NUDGE_THRESHOLD);
    const src = readFileSync("src/lib/dashboardNextStep.ts", "utf8");
    expect(src).toMatch(/from "@\/lib\/alma\/profileNudge"/);
    expect(src).not.toMatch(/>=\s*40\b/);
  });

  it("profil à 30 % : carte profil inchangée", () => {
    const step = sitterNextStep({ ...base, profileCompletion: 30, missing: galleryMissing, action: { nearbyListings: [], nearbyMissions: [mission] } })!;
    expect(step.ctaLabel).toBe("Compléter mon profil");
    expect(step.progressPct).toBe(30);
    expect(step.secondaryLink).toBeUndefined();
  });

  it("profil à 94 %, gardien, mission proche : Proposer mon aide, lien galerie, sans barre", () => {
    const step = sitterNextStep({ ...base, profileCompletion: 94, missing: galleryMissing, action: { nearbyListings: [], nearbyMissions: [mission] } })!;
    expect(step.title).toBe("Un coup de main près de chez vous");
    expect(step.ctaLabel).toBe("Proposer mon aide");
    expect(step.ctaTo).toBe("/petites-missions/m1");
    expect(step.secondaryLink).toEqual({ label: "Ajouter des photos à ma galerie", to: "/profile?tab=galerie" });
    expect(step.progressPct).toBeUndefined();
  });

  it("ordre gardien : garde, puis projet, puis annonces", () => {
    const sit = { id: "s2", title: "Deux chats", city: "Annecy", start_date: "2026-10-03", end_date: "2026-10-10" };
    const withSit = sitterNextStep({ ...base, profileCompletion: 80, action: { nearbyListings: [sit], nearbyMissions: [mission] } })!;
    expect(withSit.ctaLabel).toBe("Voir cette garde");
    expect(withSit.phrase).toContain("Annecy");
    const project = sitterNextStep({ ...base, profileCompletion: 80, action: { nearbyListings: [], nearbyMissions: [{ ...mission, category: "projet" }] } })!;
    expect(project.ctaLabel).toBe("Voir le projet");
    const none = sitterNextStep({ ...base, profileCompletion: 80, action: { nearbyListings: [], nearbyMissions: [] } })!;
    expect(none.ctaLabel).toBe("Voir les annonces près de chez vous");
  });

  it("ne reprend jamais la garde de « Une garde faite pour vous »", () => {
    const star = { id: "star", title: "Vedette", city: "Lyon" };
    const other = { id: "s3", title: "Suivante", city: "Lyon" };
    const step = sitterNextStep({ ...base, profileCompletion: 94, action: { nearbyListings: [star, other], nearbyMissions: [], starSitId: "star" } })!;
    expect(step.ctaTo).toBe("/sits/s3");
    const only = sitterNextStep({ ...base, profileCompletion: 94, action: { nearbyListings: [star], nearbyMissions: [mission], starSitId: "star" } })!;
    expect(only.ctaTo).not.toContain("star");
    expect(only.ctaLabel).toBe("Proposer mon aide");
  });

  it("propriétaire sans annonce active : Publier mon annonce de garde", () => {
    const step = ownerNextStep({ profileCompletion: 94, action: { hasActiveSit: false, nearbySittersCount: 5 } })!;
    expect(step.ctaLabel).toBe("Publier mon annonce de garde");
    expect(step.progressPct).toBeUndefined();
  });

  it("propriétaire : pas de doublon avec la vedette, gardiens à proximité avec annonce active", () => {
    expect(ownerNextStep({ profileCompletion: 94, action: { hasActiveSit: false, nearbySittersCount: 5, starVariant: "publish" } })!.ctaLabel).toBe("Demander un coup de main");
    expect(ownerNextStep({ profileCompletion: 94, action: { hasActiveSit: true, nearbySittersCount: 5 } })!.ctaLabel).toBe("Voir les gardiens à proximité");
    expect(ownerNextStep({ profileCompletion: 94, action: { hasActiveSit: true, nearbySittersCount: 0 } })!.ctaLabel).toBe("Demander un coup de main");
  });

  it("textes sans mot proscrit ni tiret long", () => {
    const src = readFileSync("src/lib/dashboardNextStep.ts", "utf8");
    expect(src).not.toMatch(/[\u2013\u2014]/);
    expect(src).not.toMatch(/gratuit|voisin/i);
  });
});

describe("Lot J5, filtre de sortie d'Alma grammatical", () => {
  it.each([
    ["Vos voisins peuvent vous aider.", "Les gens du coin peuvent vous aider."],
    ["Une voisine peut passer.", "Une personne du coin peut passer."],
    ["Une garde gratuite.", "Une garde sans frais."],
    ["C'est gratuit.", "C'est sans frais."],
    ["La gratuité du logement.", "L'absence de frais du logement."],
    ["J'ai demandé à mes voisins.", "J'ai demandé aux gens du coin."],
    ["Des voisins passent.", "Les gens du coin passent."],
    ["Un voisin arrose.", "Une personne du coin arrose."],
  ])("%s", (input, expected) => {
    expect(rewriteForbiddenWords(input)).toBe(expected);
  });
});
