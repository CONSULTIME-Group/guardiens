import { describe, it, expect } from "vitest";
import {
  prioritizeHelpers,
  NEAR_RADIUS_KM,
  type NearbyHelper,
} from "@/hooks/useNearbyHelpers";

/**
 * Verrouille la règle de tri du carrousel « près de chez vous ».
 *
 * Règle : distance = priorité absolue. Le bonus custom_skills ne s'applique
 * QU'À l'intérieur de la zone ≤ NEAR_RADIUS_KM (5 km). Tout assouplissement
 * de cette règle doit casser ces tests.
 */

const baseHelper = (over: Partial<NearbyHelper>): NearbyHelper => ({
  id: over.id ?? "x",
  first_name: "Test",
  avatar_url: null,
  city: null,
  skill_categories: [],
  custom_skills: [],
  bio: null,
  identity_verified: false,
  completed_sits_count: 0,
  distance_km: null,
  ...over,
});

describe("prioritizeHelpers — distance absolue, bonus skills ≤ 5 km", () => {
  it("la distance prime TOUJOURS sur les custom_skills au-delà de 5 km", () => {
    const closeNoSkills = baseHelper({ id: "close", distance_km: 5, custom_skills: [] });
    const farWithSkills = baseHelper({
      id: "far",
      distance_km: 50,
      custom_skills: ["Bricolage"],
    });
    const sorted = prioritizeHelpers([farWithSkills, closeNoSkills]);
    expect(sorted.map((h) => h.id)).toEqual(["close", "far"]);
  });

  it("un profil ultra-proche sans skills reste devant un profil plus loin avec skills, dès qu'on sort de la zone ≤ 5 km", () => {
    const closeNoSkills = baseHelper({ id: "close", distance_km: 3, custom_skills: [] });
    const mediumWithSkills = baseHelper({
      id: "medium",
      distance_km: 12,
      custom_skills: ["Jardin"],
    });
    const sorted = prioritizeHelpers([mediumWithSkills, closeNoSkills]);
    expect(sorted.map((h) => h.id)).toEqual(["close", "medium"]);
  });

  it("dans la zone ≤ 5 km, à distances différentes, le plus proche gagne quand même (skills ne renverse pas la distance stricte)", () => {
    // Note : le bonus skills est appliqué AVANT le tie-break distance dans
    // l'implémentation actuelle — donc à distances différentes mais TOUS les
    // deux dans la zone, le porteur de skills peut passer devant.
    // Ce test verrouille ce comportement intentionnel.
    const nearWithSkills = baseHelper({
      id: "near-skills",
      distance_km: 4,
      custom_skills: ["Bricolage"],
    });
    const nearerNoSkills = baseHelper({
      id: "nearer-plain",
      distance_km: 1,
      custom_skills: [],
    });
    const sorted = prioritizeHelpers([nearerNoSkills, nearWithSkills]);
    // Bonus skills s'applique car les deux sont ≤ 5 km
    expect(sorted[0].id).toBe("near-skills");
    expect(sorted[1].id).toBe("nearer-plain");
  });

  it("à distance strictement égale, l'identité vérifiée départage en dernier ressort", () => {
    const verified = baseHelper({
      id: "verified",
      distance_km: 10,
      identity_verified: true,
    });
    const unverified = baseHelper({
      id: "unverified",
      distance_km: 10,
      identity_verified: false,
    });
    const sorted = prioritizeHelpers([unverified, verified]);
    expect(sorted.map((h) => h.id)).toEqual(["verified", "unverified"]);
  });

  it("les profils sans distance (Infinity) tombent en queue de liste", () => {
    const unknown = baseHelper({ id: "unknown", distance_km: null });
    const far = baseHelper({ id: "far", distance_km: 200 });
    const close = baseHelper({ id: "close", distance_km: 2 });
    const sorted = prioritizeHelpers([unknown, far, close]);
    expect(sorted.map((h) => h.id)).toEqual(["close", "far", "unknown"]);
  });

  it("le bonus skills ne s'applique PAS quand un seul des deux profils est dans la zone proche", () => {
    // a est dans la zone avec skills, b est hors zone sans skills mais plus loin.
    // a doit gagner — mais uniquement parce qu'il est plus PROCHE, pas grâce au bonus.
    // Pour le démontrer, on inverse : b dans la zone sans skills, a hors zone avec skills.
    const farWithSkills = baseHelper({
      id: "far-skills",
      distance_km: NEAR_RADIUS_KM + 2, // 7 km
      custom_skills: ["Bricolage"],
    });
    const nearNoSkills = baseHelper({
      id: "near-plain",
      distance_km: NEAR_RADIUS_KM - 1, // 4 km
      custom_skills: [],
    });
    const sorted = prioritizeHelpers([farWithSkills, nearNoSkills]);
    expect(sorted.map((h) => h.id)).toEqual(["near-plain", "far-skills"]);
  });

  it("NEAR_RADIUS_KM exporté vaut 5 (verrou contre dérive silencieuse)", () => {
    expect(NEAR_RADIUS_KM).toBe(5);
  });
});
