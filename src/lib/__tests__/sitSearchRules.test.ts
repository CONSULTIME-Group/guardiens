import { describe, it, expect } from "vitest";
import {
  parisTodayIso, isFranceSit, isOpenSit, isEndedSit, isPastSit, sitGeocodeKey, sitDeptCode, resolveSitPlace, isWithinRadius, fetchAllPages, fetchInChunks, applyOpenSitFilter,
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

  it("commune absente : pas de géocodage, département de l'annonce seul, jamais le code postal du propriétaire", () => {
    expect(sitGeocodeKey({ city: null, country: "FR" })).toBeNull();
    expect(sitDeptCode({ city: null, country: "FR", departement_code: null, owner: { postal_code: "69380" } })).toBeNull();
    expect(sitDeptCode({ country: "FR", departement_code: "42", owner: { postal_code: "69005" } })).toBe("42");
    expect(sitDeptCode({ country: "CA", owner: { postal_code: "G0M1W0" } })).toBeNull();
  });

  it("A11 : commune Paris (75) et département 69 en désaccord, lieu incohérent sans département", () => {
    const paris = { city: "Paris", country: "FR", departement_code: "69", owner: { postal_code: "69005" } };
    expect(resolveSitPlace(paris, "75")).toEqual({ dept: null, incoherent: true });
    expect(resolveSitPlace({ city: "Marlhes", country: "FR", departement_code: "42" }, "42")).toEqual({ dept: "42", incoherent: false });
    // département de la commune quand l'annonce n'en a pas
    expect(resolveSitPlace({ city: "Marlhes", country: "FR", departement_code: null }, "42")).toEqual({ dept: "42", incoherent: false });
    // département inconnu de la commune : celui de l'annonce
    expect(resolveSitPlace({ city: "X", country: "FR", departement_code: "1" }, null)).toEqual({ dept: "01", incoherent: false });
  });

  it("rayon : seule une distance vérifiée <= rayon inclut (Pusignan 18 km exclu à 15 km)", () => {
    expect(isWithinRadius(18, 15)).toBe(false);
    expect(isWithinRadius(15, 15)).toBe(true);
    expect(isWithinRadius(null, 15)).toBe(false);
    expect(isWithinRadius(undefined, 15)).toBe(false);
    expect(isWithinRadius(NaN, 15)).toBe(false);
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

  it("parité filtre serveur / isOpenSit / isPastSit sur accepting true, false, NULL et dates", () => {
    // Mini évaluateur des filtres PostgREST utilisés par applyOpenSitFilter.
    type Row = { status: string; accepting_applications: boolean | null; end_date: string | null };
    const preds: Array<(r: Row) => boolean> = [];
    const q: any = {
      eq: (c: keyof Row, v: any) => (preds.push((r) => r[c] === v), q),
      not: (c: keyof Row, op: string, v: any) => {
        expect(op).toBe("is");
        preds.push((r) => (v === false ? r[c] !== false : r[c] !== v));
        return q;
      },
      or: (expr: string) => {
        const parts = expr.split(",").map((p) => p.split("."));
        preds.push((r) => parts.some(([c, op, ...rest]) => {
          const v = rest.join(".");
          const val = (r as any)[c];
          if (op === "is" && v === "null") return val === null;
          if (op === "gte") return val !== null && String(val) >= v;
          throw new Error(`op ${op}`);
        }));
        return q;
      },
    };
    const today = "2026-10-10";
    applyOpenSitFilter(q, today);
    const statuses = ["published", "draft", "confirmed", "in_progress", "completed", "cancelled", "archived", "expired"];
    const accepts = [true, false, null];
    const ends = [null, "2026-10-09", "2026-10-10", "2026-10-11"];
    let n = 0;
    for (const status of statuses) for (const accepting_applications of accepts) for (const end_date of ends) {
      const r: Row = { status, accepting_applications, end_date };
      const server = preds.every((p) => p(r));
      expect(server).toBe(isOpenSit(r, today));
      if (status !== "confirmed" && status !== "in_progress") expect(isPastSit(r, today)).toBe(!server);
      n++;
    }
    expect(n).toBe(96);
    // NULL est ouvert comme true (sémantique historique `!== false`)
    expect(isOpenSit({ status: "published", accepting_applications: null, end_date: today }, today)).toBe(true);
    expect(isOpenSit({ status: "published", accepting_applications: false, end_date: today }, today)).toBe(false);
  });

  it("lecture .in() découpée et paginée : aucun identifiant ni ligne perdus au-delà de 1 000", async () => {
    const ids = Array.from({ length: 420 }, (_, i) => `u${i}`);
    const calls: Array<[number, number, number]> = [];
    // 5 lignes par identifiant : 750 par paquet de 150, plus de 1 000 au total.
    const res = await fetchInChunks<string>(ids, async (chunk, from, to) => {
      calls.push([chunk.length, from, to]);
      const all = chunk.flatMap((id) => Array.from({ length: 5 }, (_, k) => `${id}:${k}`));
      return { data: all.slice(from, to + 1), error: null };
    });
    expect(res.error).toBeNull();
    expect(res.data).toHaveLength(2100);
    expect(new Set(res.data).size).toBe(2100);
    expect(calls.every(([len]) => len <= 150)).toBe(true);
    // paquet de 7 000 lignes : pagination interne
    const big = await fetchInChunks<number>(["a"], async (_c, from, to) => {
      const n = Math.max(0, Math.min(to, 6999) - from + 1);
      return { data: Array.from({ length: n }, (_, i) => from + i), error: null };
    });
    expect(big.data).toHaveLength(7000);
  });
});
