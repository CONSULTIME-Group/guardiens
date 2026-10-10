import { describe, it, expect } from "vitest";
import {
  parisTodayIso, isFranceSit, isOpenSit, isEndedSit, sitGeocodeKey, sitDeptCode, fetchAllPages, applyOpenSitFilter,
} from "@/lib/sitSearchRules";

describe("moteur d'annonces, règles L1", () => {
  it("date du jour à Paris, pas en UTC", () => {
    // 23 h 30 UTC le 10/10 = 01 h 30 le 11/10 à Paris (heure d'été)
    expect(parisTodayIso(new Date("2026-10-10T23:30:00Z"))).toBe("2026-10-11");
    expect(parisTodayIso(new Date("2026-12-31T22:59:00Z"))).toBe("2026-12-31");
  });

  it("fin aujourd'hui incluse, hier passée", () => {
    const today = "2026-10-10";
    const base = { status: "published", accepting_applications: true };
    expect(isOpenSit({ ...base, end_date: "2026-10-10" }, today)).toBe(true);
    expect(isOpenSit({ ...base, end_date: "2026-10-09" }, today)).toBe(false);
    expect(isEndedSit({ end_date: "2026-10-10" }, today)).toBe(false);
    expect(isOpenSit({ ...base, end_date: null }, today)).toBe(true);
    expect(isOpenSit({ ...base, accepting_applications: false, end_date: "2027-01-01" }, today)).toBe(false);
    expect(isOpenSit({ status: "confirmed", accepting_applications: true, end_date: "2027-01-01" }, today)).toBe(false);
  });

  it("France = FR strict : Québec, Polynésie et pays absent exclus", () => {
    expect(isFranceSit({ country: "FR" })).toBe(true);
    expect(isFranceSit({ country: "CA" })).toBe(false);
    expect(isFranceSit({ country: "PF" })).toBe(false);
    expect(isFranceSit({ country: null })).toBe(false);
  });

  it("Marlhes est situé à Marlhes, jamais à la ville du propriétaire", () => {
    const sit = { city: "Marlhes", country: "FR", departement_code: "42", owner: { postal_code: "42000" } } as any;
    (sit.owner as any).city = "Saint-Étienne";
    expect(sitGeocodeKey(sit)).toEqual({ city: "Marlhes", country: "FR" });
  });

  it("commune absente : pas de géocodage, département de l'annonce puis code postal en France", () => {
    expect(sitGeocodeKey({ city: null, country: "FR" })).toBeNull();
    expect(sitDeptCode({ city: null, country: "FR", departement_code: null, owner: { postal_code: "69380" } })).toBe("69");
    expect(sitDeptCode({ country: "FR", departement_code: "42", owner: { postal_code: "69005" } })).toBe("42");
    // code postal étranger : aucun département français déduit
    expect(sitDeptCode({ country: "CA", owner: { postal_code: "G0M1W0" } })).toBeNull();
  });

  it("pagination au-delà de 500 et de 1 000, sans perte", async () => {
    const TOTAL = 2345; const seen: Array<[number, number]> = [];
    const { rows, truncated } = await fetchAllPages<number>(async (a, b) => {
      seen.push([a, b]);
      const n = Math.max(0, Math.min(b, TOTAL - 1) - a + 1);
      return { data: Array.from({ length: n }, (_, i) => a + i), error: null };
    });
    expect(rows).toHaveLength(TOTAL);
    expect(new Set(rows).size).toBe(TOTAL);
    expect(seen).toEqual([[0, 999], [1000, 1999], [2000, 2999]]);
    expect(truncated).toBe(false);
  });

  it("filtre serveur : publiée, candidatures ouvertes, fin >= aujourd'hui ou absente", () => {
    const calls: any[] = [];
    const q: any = { eq: (...a: any[]) => (calls.push(["eq", ...a]), q), or: (...a: any[]) => (calls.push(["or", ...a]), q) };
    applyOpenSitFilter(q, "2026-10-10");
    expect(calls).toEqual([
      ["eq", "status", "published"],
      ["eq", "accepting_applications", true],
      ["or", "end_date.is.null,end_date.gte.2026-10-10"],
    ]);
  });
});
