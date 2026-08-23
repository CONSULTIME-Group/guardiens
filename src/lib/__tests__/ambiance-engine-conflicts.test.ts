/**
 * Verrou moteur ↔ formulaire sur les contradictions d'ambiance
 * (défaut remonté par Jérémie, 23/08/2026).
 *
 * Le formulaire empêche la saisie de tags opposés (HOME_AMBIANCE_CONFLICTS,
 * dernier choix gagne) et le moteur score fidèlement ce qui reste. Les deux
 * doivent être d'accord sur ce qui se contredit : l'ensemble des tags qui
 * lèvent `anyBad` dans evalAmbiance doit être strictement égal aux clés de
 * HOME_AMBIANCE_CONFLICTS. Ajouter un conflit d'un seul côté casse ce test.
 *
 * Cas d'origine : « Campagne » levait anyBad face à un gardien calme alors
 * que le formulaire ne le déclare contradictoire avec rien. Résultat : un
 * propriétaire « Campagne + Calme et posé » perdait sa chip d'ambiance face
 * à un gardien calme, sans frein affiché. Silence inexplicable.
 */
import { describe, it, expect } from "vitest";
import {
  computeAffinityResultFull,
  type AffinitySitterInput,
} from "@/lib/affinityScore";
import {
  AMBIANCE_CAMPAGNE,
  AMBIANCE_CALME_POSE,
  AMBIANCE_SPORTIF,
  HOME_AMBIANCE_SCORED_TAGS,
  LIFESTYLE_SPORTIF_TAG,
} from "@/lib/affinityVocab";
import { HOME_AMBIANCE_CONFLICTS } from "../profileMatchingOptions";

// Gardien calme déclaré, aucun intérêt (donc aucun intérêt rural).
const SITTER_CALME: AffinitySitterInput = {
  lifestyle: ["Tranquille / casanier"],
  interests: [],
};

// Gardien actif déclaré, aucun intérêt (donc aucun intérêt sportif outdoor).
const SITTER_ACTIF: AffinitySitterInput = {
  lifestyle: [LIFESTYLE_SPORTIF_TAG],
  interests: [],
};

/**
 * La chip d'ambiance est-elle produite ? Les entrées ne remplissent QUE
 * l'ambiance côté propriétaire et QUE le rythme côté gardien : tout ce qui
 * sort dans `matched` vient du critère ambiance.
 */
function ambianceChipPresent(ownerTags: string[], sitter: AffinitySitterInput): boolean {
  const res = computeAffinityResultFull({ home_ambiance: ownerTags }, sitter);
  return res.matched.length > 0;
}

/**
 * Détecte si un tag lève anyBad dans le moteur : on l'associe à un tag que
 * le gardien matche à coup sûr (anyGood garanti). Si la chip disparaît,
 * c'est que le tag testé a levé anyBad.
 */
function raisesAnyBad(tag: string): boolean {
  // Face à un gardien actif, « Sportif outdoor » matche : seuls Cocon et
  // Calme et posé peuvent annuler la chip.
  const badVsActif = !ambianceChipPresent([tag, AMBIANCE_SPORTIF], SITTER_ACTIF);
  // Face à un gardien calme, « Calme et posé » matche : seul Sportif outdoor
  // peut annuler la chip.
  const badVsCalme = !ambianceChipPresent([tag, AMBIANCE_CALME_POSE], SITTER_CALME);
  return badVsActif || badVsCalme;
}

describe("invariant moteur ↔ formulaire (contradictions d'ambiance)", () => {
  it("les tags qui lèvent anyBad dans evalAmbiance sont exactement les clés de HOME_AMBIANCE_CONFLICTS", () => {
    const engineBad = [...HOME_AMBIANCE_SCORED_TAGS].filter(raisesAnyBad).sort();
    const formBad = Object.keys(HOME_AMBIANCE_CONFLICTS).sort();
    expect(engineBad).toEqual(formBad);
  });

  it("« Campagne » ne lève jamais anyBad : c'est un lieu, pas un tempo", () => {
    expect(raisesAnyBad(AMBIANCE_CAMPAGNE)).toBe(false);
  });
});

describe("cas d'origine : Campagne + Calme et posé face à un gardien calme", () => {
  it("produit la chip « Calme, comme vous », pas le silence", () => {
    const res = computeAffinityResultFull(
      { home_ambiance: [AMBIANCE_CAMPAGNE, AMBIANCE_CALME_POSE] },
      SITTER_CALME,
    );
    expect(res.matched).toContain("Calme, comme vous");
  });

  it("le chemin positif campagne ne bouge pas : un intérêt rural matche toujours", () => {
    const res = computeAffinityResultFull(
      { home_ambiance: [AMBIANCE_CAMPAGNE, AMBIANCE_CALME_POSE] },
      { lifestyle: ["Tranquille / casanier"], interests: ["Jardinage"] },
    );
    expect(res.matched).toContain("Campagne et calme, comme vous");
  });

  it("un gardien actif matche toujours la campagne", () => {
    const res = computeAffinityResultFull(
      { home_ambiance: [AMBIANCE_CAMPAGNE] },
      SITTER_ACTIF,
    );
    expect(res.matched).toContain("Campagne, comme vous");
  });

  it("les vraies contradictions restent des freins : Sportif outdoor face à un gardien calme", () => {
    const res = computeAffinityResultFull(
      { home_ambiance: [AMBIANCE_SPORTIF, AMBIANCE_CALME_POSE] },
      SITTER_CALME,
    );
    expect(res.matched).toHaveLength(0);
  });
});
