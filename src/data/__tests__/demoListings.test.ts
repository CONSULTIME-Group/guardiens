import { describe, it, expect } from "vitest";
import {
  interleaveDemos,
  DEMO_SITS,
  DEMO_MISSIONS,
} from "@/data/demoListings";

type Item = { id: string; is_demo?: boolean };

const real = (n: number): Item[] =>
  Array.from({ length: n }, (_, i) => ({ id: `r${i + 1}` }));
const demos = (n: number): Item[] =>
  Array.from({ length: n }, (_, i) => ({ id: `d${i + 1}`, is_demo: true }));

describe("interleaveDemos — algorithme d'intercalation", () => {
  it("retourne la liste réelle inchangée quand il n'y a aucune démo", () => {
    const r = real(5);
    expect(interleaveDemos(r, [])).toEqual(r);
  });

  it("place les démos toutes les 3 positions par défaut (positions 4, 8, 12…)", () => {
    const out = interleaveDemos(real(9), demos(3));
    // Attendu : R R R D R R R D R R R D
    const positions = out
      .map((it, i) => (it.is_demo ? i + 1 : -1))
      .filter((p) => p !== -1);
    expect(positions).toEqual([4, 8, 12]);
    expect(out).toHaveLength(12);
  });

  it("supporte un pas (step) personnalisé", () => {
    const out = interleaveDemos(real(4), demos(2), 2);
    // Attendu : R R D R R D
    const positions = out
      .map((it, i) => (it.is_demo ? i + 1 : -1))
      .filter((p) => p !== -1);
    expect(positions).toEqual([3, 6]);
  });

  it("préserve l'ordre relatif des annonces réelles", () => {
    const r = real(7);
    const out = interleaveDemos(r, demos(2));
    const realIds = out.filter((it) => !it.is_demo).map((it) => it.id);
    expect(realIds).toEqual(r.map((it) => it.id));
  });

  it("préserve l'ordre relatif des démos", () => {
    const d = demos(3);
    const out = interleaveDemos(real(9), d);
    const demoIds = out.filter((it) => it.is_demo).map((it) => it.id);
    expect(demoIds).toEqual(d.map((it) => it.id));
  });

  it("ajoute les démos restantes en fin si la liste réelle est trop courte", () => {
    // 2 réels + 3 démos, step=3 => aucune insertion intercalée, toutes en fin
    const out = interleaveDemos(real(2), demos(3));
    expect(out).toHaveLength(5);
    expect(out.slice(0, 2).every((it) => !it.is_demo)).toBe(true);
    expect(out.slice(2).every((it) => it.is_demo)).toBe(true);
  });

  it("place toutes les démos en fin quand la liste réelle est vide", () => {
    const out = interleaveDemos([], demos(3));
    expect(out).toHaveLength(3);
    expect(out.every((it) => it.is_demo)).toBe(true);
  });

  it("n'écrase ni ne duplique aucune annonce réelle ou démo", () => {
    const r = real(10);
    const d = demos(3);
    const out = interleaveDemos(r, d);
    const ids = out.map((it) => it.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(out).toHaveLength(r.length + d.length);
  });

  it("intercale aussi quand il y a plus de démos disponibles que de slots", () => {
    // 3 réels => 1 slot d'insertion (position 4), 2 démos restantes en fin
    const out = interleaveDemos(real(3), demos(3));
    const positions = out
      .map((it, i) => (it.is_demo ? i + 1 : -1))
      .filter((p) => p !== -1);
    expect(positions).toEqual([4, 5, 6]);
  });
});

describe("Badge « Annonce d'exemple » — flag is_demo", () => {
  // Le badge est conditionné dans toute l'app par `item.is_demo === true`
  // (SearchSitter, SearchMapView, DemoSitDetail). On vérifie donc que toutes
  // les démos exportées portent bien ce flag, sur tous les types de résultats.

  it("toutes les DEMO_SITS portent is_demo: true", () => {
    expect(DEMO_SITS.length).toBeGreaterThan(0);
    for (const sit of DEMO_SITS) {
      expect(sit.is_demo).toBe(true);
    }
  });

  it("toutes les DEMO_MISSIONS portent is_demo: true", () => {
    expect(DEMO_MISSIONS.length).toBeGreaterThan(0);
    for (const mission of DEMO_MISSIONS) {
      expect((mission as any).is_demo).toBe(true);
    }
  });

  it("après intercalation, chaque démo conserve is_demo: true (gardes)", () => {
    const out = interleaveDemos(real(9), DEMO_SITS as any);
    const demoItems = out.filter((it: any) => it.is_demo);
    expect(demoItems.length).toBe(DEMO_SITS.length);
    for (const it of demoItems) {
      expect((it as any).is_demo).toBe(true);
    }
  });

  it("après intercalation, chaque démo conserve is_demo: true (missions)", () => {
    const out = interleaveDemos(real(9), DEMO_MISSIONS as any);
    const demoItems = out.filter((it: any) => it.is_demo);
    expect(demoItems.length).toBe(DEMO_MISSIONS.length);
    for (const it of demoItems) {
      expect((it as any).is_demo).toBe(true);
    }
  });

  it("aucune annonce réelle ne porte is_demo: true (pas de faux positif badge)", () => {
    const r = real(6);
    const out = interleaveDemos(r, DEMO_SITS as any);
    const realItems = out.filter((it: any) => !it.is_demo);
    expect(realItems).toHaveLength(r.length);
    for (const it of realItems) {
      expect((it as any).is_demo).toBeUndefined();
    }
  });
});
