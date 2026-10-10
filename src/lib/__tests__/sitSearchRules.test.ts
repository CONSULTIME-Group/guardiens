import { describe, it, expect } from "vitest";
import {
  parisTodayIso, isFranceSit, isOpenSit, isEndedSit, isPastSit, sitGeocodeKey, resolveSitPlace, isFrancePlace, isWithinRadius, fetchAllPages, fetchInChunks, applyOpenSitFilter, checkGeocodedPoint, pointUsable,
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

  it("source principale = propriétaire : Marlhes (propriétaire Saint-Étienne) cherché à Saint-Étienne", () => {
    const sit = { city: "Marlhes", country: "FR", departement_code: "42", owner: { city: "Saint-Étienne", country: "FR", postal_code: "42000", departement_code: "42" } };
    expect(resolveSitPlace(sit)).toEqual({ city: "Saint-Étienne", country: "FR", dept: "42", source: "owner" });
    expect(sitGeocodeKey(sit)).toEqual({ city: "Saint-Étienne", country: "FR" });
  });

  it("A11 : annonce « Paris » d'un propriétaire lyonnais, cherchée à Lyon (69), sans lieu incohérent", () => {
    const paris = { city: "Paris", country: "FR", departement_code: "69", owner: { city: "Lyon", country: "FR", postal_code: "69005", departement_code: null } };
    expect(resolveSitPlace(paris)).toEqual({ city: "Lyon", country: "FR", dept: "69", source: "owner" });
  });

  it("département du propriétaire jamais mélangé avec celui de l'annonce", () => {
    const p = resolveSitPlace({ city: "A", country: "FR", departement_code: "75", owner: { city: "Vienne", country: "FR", postal_code: "38200" } });
    expect(p.dept).toBe("38");
  });

  it("pays : lu sur le propriétaire, jamais FR déduit d'un pays absent", () => {
    expect(resolveSitPlace({ owner: { city: "Montréal", country: "CA", postal_code: "H2X1Y4" } })).toEqual({ city: "Montréal", country: "CA", dept: null, source: "owner" });
    // pays du propriétaire absent : ville du propriétaire gardée, pays de l'annonce en repli, dept du profil
    expect(resolveSitPlace({ city: "Lyon", country: "FR", departement_code: "38", owner: { city: "Lyon", country: null, postal_code: "69005" } }))
      .toEqual({ city: "Lyon", country: "FR", dept: "69", source: "owner" });
    // aucune source de pays : pas France
    expect(isFrancePlace({ city: null, country: null, owner: { city: "Lyon", country: null } })).toBe(false);
  });

  it("repli annonce si la ville du propriétaire manque, sans commune inventée", () => {
    const p = resolveSitPlace({ city: "Punaauia", country: "PF", departement_code: "987", owner: { city: "", country: "PF", postal_code: "98718" } });
    expect(p).toEqual({ city: "Punaauia", country: "PF", dept: null, source: "sit" });
    const cp = resolveSitPlace({ city: null, country: "FR", departement_code: "69", owner: { city: null, country: "FR", postal_code: "69380" } });
    expect(cp).toEqual({ city: null, country: "FR", dept: "69", source: "sit" });
    expect(sitGeocodeKey({ city: null, country: "FR", owner: { city: null, country: "FR" } })).toBeNull();
    expect(resolveSitPlace({}).source).toBe("none");
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

describe("L1 microcorrectif : ville propriétaire et point géocodé vérifié", () => {
  it("propriétaire Saint-Étienne sans pays, annonce Marlhes FR : Saint-Étienne", () => {
    const p = resolveSitPlace({ city: "Marlhes", country: "FR", departement_code: "42", owner: { city: "Saint-Étienne", country: null, postal_code: "42000" } });
    expect(p).toEqual({ city: "Saint-Étienne", country: "FR", dept: "42", source: "owner" });
  });
  it("propriétaire sans pays ni CP, annonce Marlhes 42 : jamais le département de l'annonce", () => {
    const p = resolveSitPlace({ city: "Marlhes", country: "FR", departement_code: "42", owner: { city: "Saint-Étienne", country: null } });
    expect(p.city).toBe("Saint-Étienne"); expect(p.dept).toBeNull();
  });
  it("propriétaire sans pays et annonce sans pays : pas FR déduit", () => {
    expect(resolveSitPlace({ city: "X", owner: { city: "Lyon", country: null } }).country).toBeNull();
  });
  it("propriétaire Lyon 69, annonce Paris 75 : reste Lyon", () => {
    expect(resolveSitPlace({ city: "Paris", country: "FR", departement_code: "75", owner: { city: "Lyon", country: "FR", postal_code: "69003" } }))
      .toEqual({ city: "Lyon", country: "FR", dept: "69", source: "owner" });
  });
  it("Montreuil 93 géocodé 62 : écarté ; géocodé 93 : retenu", () => {
    const place = resolveSitPlace({ owner: { city: "Montreuil", country: "FR", postal_code: "93100" } });
    expect(checkGeocodedPoint(place, "62")).toBe("mismatch");
    expect(pointUsable(checkGeocodedPoint(place, "62"))).toBe(false);
    expect(checkGeocodedPoint(place, "93")).toBe("verified");
    expect(pointUsable(checkGeocodedPoint(place, "93"))).toBe(true);
  });
  it("vérification NULL : le point ne devient pas vérifié", () => {
    const place = resolveSitPlace({ owner: { city: "Montreuil", country: "FR", postal_code: "93100" } });
    expect(checkGeocodedPoint(place, null)).toBe("unverifiable");
    expect(pointUsable("unverifiable")).toBe(false);
  });
  it("hors France ou sans département : rien à comparer", () => {
    expect(checkGeocodedPoint({ country: "CA", dept: null }, null)).toBe("not_applicable");
  });
});
