/**
 * Lot L7 (09/11/2026, arène tableau de bord v2) : entrée du récit gardien.
 * La garde mise en avant est la première des gardes classées, hors
 * candidatures déjà envoyées et hors dates déjà prises ; la recherche
 * s'ouvre sur la France entière ; seuls les faits déclarés sont cités.
 */
import { describe, it, expect } from "vitest";
import { buildSitterStoryInput, datesOverlap, pickSitterOpening } from "@/lib/sitterStoryInput";
import { resolveSitterStory, NATIONAL_SEARCH_HREF } from "@/lib/dashboardStory";

const TODAY = "2026-11-09";
const ranked = [
  { id: "deja", city: "Lyon", start_date: "2026-12-01", end_date: "2026-12-05", owner_first_name: "Anne", distance_km: 3, pet_names: ["Figue"] },
  { id: "noel", city: "ÉCULLY", start_date: "2026-12-20", end_date: "2026-12-28", owner_first_name: "Laurence Martin", distance_km: 8.6, pet_names: ["Pompon"] },
  { id: "janv", city: "tassin-la-demi-lune", start_date: "2027-01-06", end_date: "2027-01-18", owner_first_name: "Hélène", distance_km: 12, pet_names: ["Biscuit", "Olive"] },
];

describe("L7, garde mise en avant", () => {
  it("chevauchement de dates, bornes incluses", () => {
    expect(datesOverlap({ start_date: "2026-12-20", end_date: "2026-12-28" }, { start_date: "2026-12-28", end_date: "2027-01-02" })).toBe(true);
    expect(datesOverlap({ start_date: "2026-12-20", end_date: "2026-12-27" }, { start_date: "2026-12-28", end_date: "2027-01-02" })).toBe(false);
    expect(datesOverlap({ start_date: null, end_date: null }, { start_date: "2026-12-28", end_date: "2027-01-02" })).toBe(false);
  });

  it("écarte une annonce déjà candidatée, garde le classement, met la commune en forme", () => {
    const o = pickSitterOpening({ rankedSits: ranked, appliedSitIds: ["deja"], ongoingGuard: null, nextGuard: null });
    expect(o).toEqual({
      id: "noel", ownerFirstName: "Laurence", city: "Écully", distanceKm: 8.6,
      start_date: "2026-12-20", end_date: "2026-12-28", petNames: ["Pompon"],
    });
  });

  it("écarte une annonce aux dates d'une garde déjà confirmée", () => {
    const o = pickSitterOpening({
      rankedSits: ranked, appliedSitIds: ["deja"], ongoingGuard: null,
      nextGuard: { id: "g1", start_date: "2026-12-24", end_date: "2027-01-02" },
    });
    expect(o?.id).toBe("janv");
    expect(o?.city).toBe("Tassin-la-Demi-Lune");
  });

  it("aucune garde libre : pas de garde mise en avant", () => {
    expect(pickSitterOpening({ rankedSits: ranked, appliedSitIds: ["deja", "noel", "janv"] })).toBeNull();
  });
});

describe("L7, récit gardien à partir des données du tableau de bord", () => {
  it("B-08 · nouvelle garde, recherche France entière en second", () => {
    const s = resolveSitterStory(buildSitterStoryInput({ today: TODAY, rankedSits: ranked, appliedSitIds: ["deja"], openCount: 23 }));
    expect(s.chapter).toBe("opening");
    expect(s.eyebrow).toBe("Nouvelle garde, à 9 km");
    expect(s.title).toBe("Pompon attend son gardien à Écully.");
    expect(s.cta).toEqual({ label: "Découvrir chez Laurence", href: "/sits/noel" });
    expect(s.secondary).toEqual({ label: "Voir les 23 gardes ouvertes", href: NATIONAL_SEARCH_HREF });
    expect(NATIONAL_SEARCH_HREF).toBe("/search?zone=france");
  });

  it("B-12 · candidature envoyée aujourd'hui : le mot est chez la propriétaire", () => {
    const s = resolveSitterStory(buildSitterStoryInput({
      today: TODAY, rankedSits: ranked, appliedSitIds: ["deja"], openCount: 23,
      pendingApplication: { sitId: "deja", ownerFirstName: "Anne Dupont", created_at: "2026-11-09T08:00:00Z" },
    }));
    expect(s.chapter).toBe("applied");
    expect(s.title).toBe("Votre mot est chez Anne.");
    expect(s.cta.href).toBe(NATIONAL_SEARCH_HREF);
  });

  it("B-17 · cinq jours plus tard : une autre garde, jamais celle déjà candidatée", () => {
    const s = resolveSitterStory(buildSitterStoryInput({
      today: "2026-11-14", rankedSits: ranked, appliedSitIds: ["deja"], openCount: 23,
      pendingApplication: { sitId: "deja", ownerFirstName: "Anne", created_at: "2026-11-09T08:00:00Z" },
    }));
    expect(s.chapter).toBe("second_application");
    expect(s.title).toBe("Pendant qu'Anne choisit, Pompon vous attend à Écully.");
    expect(s.cta.href).toBe("/sits/noel");
  });

  it("B-13 · garde confirmée : animaux déclarés, prénom, commune", () => {
    const s = resolveSitterStory(buildSitterStoryInput({
      today: TODAY, rankedSits: ranked, appliedSitIds: ["deja"], openCount: 23,
      nextGuard: { id: "g1", start_date: "2026-12-19", end_date: "2027-01-03", city: "ANNECY", property_id: "p1", ownerName: "Anne", pets: [{ name: "figue" }, { name: "Olive" }] },
    }));
    expect(s.chapter).toBe("confirmed");
    expect(s.eyebrow).toBe("Annecy · dans 40 jours");
    expect(s.title).toBe("Figue et Olive vous attendent le 19 décembre.");
    expect(s.cta.label).toBe("Écrire à Anne");
    expect(s.lead).toContain("si vous le souhaitez");
  });

  it("garde en cours, puis avis à laisser", () => {
    const ongoing = resolveSitterStory(buildSitterStoryInput({
      today: TODAY, rankedSits: [], appliedSitIds: [], openCount: 0,
      ongoingGuard: { id: "g0", start_date: "2026-11-05", end_date: "2026-11-12", ownerName: "Marc", pets: [] },
    }));
    expect(ongoing.chapter).toBe("ongoing");
    expect(ongoing.title).toBe("Vous veillez sur la maison de Marc.");
    const review = resolveSitterStory(buildSitterStoryInput({
      today: TODAY, rankedSits: [], appliedSitIds: [], openCount: 0,
      reviewDue: { sitId: "g0", ownerFirstName: "Marc" },
    }));
    expect(review.chapter).toBe("review");
    expect(review.cta.href).toBe("/review/g0");
  });

  it("rien à raconter : la recherche France entière", () => {
    const s = resolveSitterStory(buildSitterStoryInput({ today: TODAY, rankedSits: [], appliedSitIds: [], openCount: 23 }));
    expect(s.chapter).toBe("discover");
    expect(s.cta.href).toBe(NATIONAL_SEARCH_HREF);
  });
});

describe("L7, élision des prénoms", () => {
  it("qu'Anne, d'Hélène, que Laurence, de Marc", async () => {
    const { queName, deName } = await import("@/lib/dashboardStory");
    expect(queName("Anne")).toBe("qu'Anne");
    expect(queName("Laurence")).toBe("que Laurence");
    expect(deName("Hélène")).toBe("d'Hélène");
    expect(deName("Marc")).toBe("de Marc");
    const s = resolveSitterStory(buildSitterStoryInput({
      today: TODAY, rankedSits: [], appliedSitIds: [], openCount: 0,
      nextGuard: { id: "g1", start_date: "2026-11-12", end_date: "2026-11-20", property_id: "p1", ownerName: "Élodie", pets: [] },
    }));
    expect(s.title).toBe("La maison d'Élodie vous attend le 12 novembre.");
    expect(s.lead).toBe("Le guide de la maison d'Élodie est ouvert.");
  });
});
