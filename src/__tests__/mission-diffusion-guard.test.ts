/**
 * Garde de diffusion de proximité de l'entraide : seul le statut open est
 * diffusable, et l'échéance se mesure en fin de journée heure de Paris.
 */
import { describe, it, expect } from "vitest";
import { proximityBlockReason } from "../../supabase/functions/_shared/mission-diffusion-guard";

describe("statut diffusable", () => {
  it("autorise une publication ouverte", () => {
    expect(proximityBlockReason({ status: "open" }, new Date("2026-10-10T12:00:00Z"))).toBeNull();
  });

  it("refuse in_progress pour tous les types", () => {
    const now = new Date("2026-10-10T12:00:00Z");
    for (const mission_type of ["besoin", "offre", "projet"]) {
      expect(proximityBlockReason({ status: "in_progress", mission_type }, now)).toBe(
        "Une personne est déjà retenue, diffusion impossible.",
      );
    }
  });
});

describe("échéance en heure de Paris", () => {
  it("heure d'été : date du jour encore autorisée à 23 h 30 Paris", () => {
    // 21:30 UTC = 23:30 Paris (été)
    const now = new Date("2026-07-15T21:30:00Z");
    expect(proximityBlockReason({ status: "open", end_date: "2026-07-15" }, now)).toBeNull();
    expect(
      proximityBlockReason({ status: "open", mission_type: "besoin", date_needed: "2026-07-15" }, now),
    ).toBeNull();
  });

  it("heure d'été : refusée à 00 h 30 Paris le lendemain", () => {
    // 22:30 UTC = 00:30 Paris le 16 juillet (été)
    const now = new Date("2026-07-15T22:30:00Z");
    expect(proximityBlockReason({ status: "open", end_date: "2026-07-15" }, now)).toBe(
      "Date de fin dépassée, diffusion impossible.",
    );
    expect(
      proximityBlockReason({ status: "open", mission_type: "besoin", date_needed: "2026-07-15" }, now),
    ).toBe("Date de besoin dépassée, diffusion impossible.");
  });

  it("heure d'hiver : date du jour encore autorisée à 23 h 30 Paris", () => {
    // 22:30 UTC = 23:30 Paris (hiver)
    const now = new Date("2026-12-15T22:30:00Z");
    expect(proximityBlockReason({ status: "open", end_date: "2026-12-15" }, now)).toBeNull();
  });

  it("heure d'hiver : refusée à 00 h 30 Paris le lendemain", () => {
    // 23:30 UTC = 00:30 Paris le 16 décembre (hiver)
    const now = new Date("2026-12-15T23:30:00Z");
    expect(proximityBlockReason({ status: "open", end_date: "2026-12-15" }, now)).toBe(
      "Date de fin dépassée, diffusion impossible.",
    );
  });

  it("une offre sans échéance reste autorisée", () => {
    expect(
      proximityBlockReason({ status: "open", mission_type: "offre" }, new Date("2026-10-10T12:00:00Z")),
    ).toBeNull();
  });

  it("une date invalide garde le comportement actuel (jamais dépassée)", () => {
    expect(
      proximityBlockReason({ status: "open", end_date: "pas-une-date" }, new Date("2026-10-10T12:00:00Z")),
    ).toBeNull();
  });
});
