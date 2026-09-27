import { describe, it, expect } from "vitest";
import { formatDateRangeFr, formatDateFr } from "@/lib/formatDateRangeFr";
import { formatCityLabel } from "@/lib/cityLabel";
import { canShowAffinityPercent, AFFINITY_MIN_COMPARED_CRITERIA } from "@/lib/affinityDisplay";
import { nearbyWaitingSentence, nearbyRegisteredSentence } from "@/lib/nearbySittersSentence";

describe("formatDateRangeFr", () => {
  const today = new Date(2026, 8, 27);
  it("année sur la fin, 1er", () => {
    expect(formatDateRangeFr("2026-10-09", "2026-11-01", today)).toBe("du 9 octobre au 1er novembre 2026");
  });
  it("année sur le début si elle diffère", () => {
    expect(formatDateRangeFr("2026-12-20", "2027-01-03", today)).toBe("du 20 décembre 2026 au 3 janvier 2027");
  });
  it("garde d'août 2027 : même mois, un seul mois écrit, l'année visible (lot D1)", () => {
    expect(formatDateRangeFr("2027-08-13", "2027-08-30", today)).toBe("du 13 au 30 août 2027");
    expect(formatDateRangeFr("2026-10-01", "2026-10-02", today)).toBe("du 1er au 2 octobre 2026");
  });
  it("sans décalage de fuseau, dates seules et vides", () => {
    expect(formatDateRangeFr("2026-10-01T00:00:00", "2026-10-02", today)).toBe("du 1er au 2 octobre 2026");
    expect(formatDateRangeFr("2027-01-05", null, today)).toBe("le 5 janvier 2027");
    expect(formatDateRangeFr(null, null, today)).toBeNull();
    expect(formatDateFr("2026-10-04", today)).toBe("4 octobre");
    expect(formatDateFr("2027-10-04", today)).toBe("4 octobre 2027");
  });
});

describe("formatCityLabel", () => {
  it("met en forme les communes composées", () => {
    expect(formatCityLabel("poleymieux au mont'dor")).toBe("Poleymieux-au-Mont-d'Or");
    expect(formatCityLabel("saint etienne")).toBe("Saint-Etienne");
    expect(formatCityLabel("LYON")).toBe("Lyon");
    expect(formatCityLabel("new york")).toBe("New York");
    expect(formatCityLabel(null)).toBe("");
  });
});

describe("canShowAffinityPercent", () => {
  it("exige au moins 4 critères comparés", () => {
    expect(AFFINITY_MIN_COMPARED_CRITERIA).toBe(4);
    expect(canShowAffinityPercent({ total: 3 })).toBe(false);
    expect(canShowAffinityPercent({ total: 4 })).toBe(true);
    expect(canShowAffinityPercent(null)).toBe(false);
  });
});

describe("phrases de proximité", () => {
  it("accords et absence de revendication", () => {
    expect(nearbyWaitingSentence(1, 30)).toBe("1 gardien à 30 km attend votre prochaine annonce.");
    expect(nearbyWaitingSentence(88, 30)).toBe("88 gardiens à 30 km attendent votre prochaine annonce.");
    expect(nearbyRegisteredSentence(1, 50)).toBe("1 gardien inscrit à 50 km.");
    expect(nearbyRegisteredSentence(12, 50)).toBe("12 gardiens inscrits à 50 km.");
    expect(nearbyWaitingSentence(88, 30)).not.toMatch(/vérifi/);
  });
});
