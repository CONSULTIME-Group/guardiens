import { describe, it, expect } from "vitest";
import { reviewListingRef } from "@/pages/admin/AdminReviews";

describe("reviewListingRef", () => {
  it("garde jointe : titre, ville, dates, lien réel", () => {
    const r = reviewListingRef({ sit_id: "s1", sit: { id: "s1", title: "Maison à Lyon", city: "Lyon", start_date: "2026-07-01", end_date: "2026-07-10" } });
    expect(r).toMatchObject({ kind: "garde", available: true, title: "Maison à Lyon", city: "Lyon", href: "/sits/s1" });
    expect(r.dates).toContain("au");
  });
  it("entraide : lien vers la mission jointe par mission_id", () => {
    const r = reviewListingRef({ review_type: "mission", mission_id: "m1", mission: { id: "m1", title: "Promener Rex", city: "Nantes", date_needed: "2026-05-02" } });
    expect(r).toMatchObject({ kind: "entraide", available: true, href: "/petites-missions/m1", city: "Nantes" });
  });
  it("entraide sans mission jointe : jamais rattachée à la garde", () => {
    const r = reviewListingRef({ review_type: "mission", mission_id: "m9", sit_id: "s1", sit: { id: "s1", title: "X" }, mission: null });
    expect(r).toMatchObject({ kind: "entraide", available: false, href: null, reference: "m9" });
  });
  it("source supprimée : indisponible, référence gardée, aucun lien", () => {
    const r = reviewListingRef({ review_type: "annulation", sit_id: "abc", sit: null });
    expect(r).toMatchObject({ available: false, href: null, reference: "abc" });
  });
});
