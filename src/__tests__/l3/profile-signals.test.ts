import { describe, it, expect } from "vitest";
import {
  declaredHelpOffer, hasEntraideFacet, entraideOfferBandText, lastVisitLabel,
  RESPONSIVENESS_CONTRACT,
} from "@/lib/profileSignals";
import { buildTrustTimeline, buildActivityHeatmap } from "@/lib/trustTimeline";

describe("L3 entraide déclarée", () => {
  it("compétences seules ne valent jamais offre", () => {
    const o = declaredHelpOffer({ availableForHelp: null, skillCategories: ["jardin"], helpsWith: "Tonte" });
    expect(o.offered).toBe(false);
    expect(entraideOfferBandText(o, "A", "Lyon")).toBeNull();
    expect(declaredHelpOffer({ availableForHelp: false, skillCategories: ["jardin"], helpsWith: null }).offered).toBe(false);
  });
  it("offre à zéro mission : onglet et bandeau visibles, jardin et bricolage inclus", () => {
    const o = declaredHelpOffer({ availableForHelp: true, skillCategories: ["jardin", "coups_de_main", "inconnu"], helpsWith: null });
    expect(o.categories.map((c) => c.spot)).toEqual(["spot-jardin", "spot-bricolage"]);
    expect(hasEntraideFacet(o, 0)).toBe(true);
    expect(entraideOfferBandText(o, "Lou", "Lyon")).toBe("Lou propose un coup de main autour de Lyon : jardin, bricolage et coups de main.");
  });
  it("offre désactivée : l'historique garde l'onglet, sans bandeau", () => {
    const off = declaredHelpOffer({ availableForHelp: false, skillCategories: [], helpsWith: null });
    expect(hasEntraideFacet(off, 3)).toBe(true);
    expect(hasEntraideFacet(off, 0)).toBe(false);
    expect(entraideOfferBandText(off, "A", null)).toBeNull();
  });
  it("ligne libre prioritaire", () => {
    const o = declaredHelpOffer({ availableForHelp: true, skillCategories: [], helpsWith: " Courses " });
    expect(entraideOfferBandText(o, "A", null)).toBe("A l'écrit ainsi : « Courses »");
  });
});

describe("L3 dernière visite", () => {
  const now = new Date("2026-10-10T12:00:00Z");
  it("null, invalide, futur : neutre", () => {
    expect(lastVisitLabel(null, now)).toBeNull();
    expect(lastVisitLabel("pas une date", now)).toBeNull();
    expect(lastVisitLabel("2026-10-12T12:00:00Z", now)).toBeNull();
  });
  it("approximatif, jamais d'heure", () => {
    expect(lastVisitLabel("2026-10-09T08:13:00Z", now)).toBe("cette semaine");
    expect(lastVisitLabel("2026-03-02T08:13:00Z", now)).toBe("en mars 2026");
  });
});

describe("L3 réactivité et chronologie", () => {
  it("contrat unique 90 jours, 5 contacts", () => {
    expect(RESPONSIVENESS_CONTRACT).toEqual({ windowDays: 90, minContacts: 5 });
  });
  it("premier avis = premier 5 étoiles : un seul jalon", () => {
    const ev = buildTrustTimeline({ memberSince: null, reviews: [{ created_at: "2026-05-01", overall_rating: 5 }], badges: [], completedSits: 0, lastActivity: null } as any);
    expect(ev.filter((e) => e.kind === "first_five_star")).toHaveLength(0);
    expect(ev.find((e) => e.kind === "first_review")?.label).toBe("Premier avis reçu, 5 étoiles");
  });
  it("premier 5 étoiles distinct conservé", () => {
    const ev = buildTrustTimeline({ memberSince: null, reviews: [{ created_at: "2026-05-01", overall_rating: 4 }, { created_at: "2026-06-01", overall_rating: 5 }], badges: [], completedSits: 0, lastActivity: null } as any);
    expect(ev.filter((e) => e.kind === "first_five_star")).toHaveLength(1);
  });
  it("heatmap clairsemée : moins de 3 mois actifs", () => {
    const h = buildActivityHeatmap([{ created_at: new Date().toISOString(), overall_rating: 5 }], []);
    expect(h.filter((m) => m.count > 0).length).toBeLessThan(3);
  });
});
