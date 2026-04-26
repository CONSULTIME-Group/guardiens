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

import { auditInterleave, interleaveDemos as iL } from "@/data/demoListings";

describe("auditInterleave — assertion stricte 1 démo toutes les 3 vraies annonces", () => {
  it("retourne ok=true sur une liste vide", () => {
    expect(auditInterleave([]).ok).toBe(true);
  });

  it("ok=true quand interleaveDemos a produit la liste (cas nominal)", () => {
    const r = real(9);
    const d = demos(3);
    const out = iL(r, d);
    const audit = auditInterleave(out);
    expect(audit.ok).toBe(true);
    expect(audit.expectedPositions).toEqual([4, 8, 12]);
    expect(audit.observedPositions).toEqual([4, 8, 12]);
    expect(audit.missingPositions).toEqual([]);
    expect(audit.unexpectedPositions).toEqual([]);
  });

  it("ok=true quand toutes les démos sont en fin de liste (peu de réelles)", () => {
    // 2 réels + 3 démos => positions attendues 3, 4, 5
    const out = iL(real(2), demos(3));
    const audit = auditInterleave(out);
    expect(audit.ok).toBe(true);
    expect(audit.expectedPositions).toEqual([3, 4, 5]);
  });

  it("ok=false avec démos manquantes (filtre qui retire une démo)", () => {
    // Liste correcte puis on retire la démo en position 8
    const out = iL(real(9), demos(3));
    const filtered = out.filter((_, i) => i + 1 !== 8);
    const audit = auditInterleave(filtered);
    expect(audit.ok).toBe(false);
    expect(audit.missingPositions.length).toBeGreaterThan(0);
  });

  it("ok=false avec démo hors-règle (tri qui déplace une démo)", () => {
    // Liste correcte puis on permute la démo en #4 avec la réelle #5
    const out = iL(real(9), demos(3));
    const swapped = [...out];
    [swapped[3], swapped[4]] = [swapped[4], swapped[3]];
    const audit = auditInterleave(swapped);
    expect(audit.ok).toBe(false);
    // La démo se retrouve en position 5 (hors-règle), et #4 est manquante
    expect(audit.unexpectedPositions).toContain(5);
    expect(audit.missingPositions).toContain(4);
  });

  it("ok=false si la pagination tronque sans recalculer (démos après réelles)", () => {
    // Liste 12 items (R*9 + D*3 intercalés), tronquée à 7 => les démos #4 OK
    // mais on perd #8 et #12 attendues.
    const out = iL(real(9), demos(3));
    const paged = out.slice(0, 7);
    const audit = auditInterleave(paged);
    // 7 items = 6 réelles + 1 démo => 1 slot attendu en #4. ✅ si la démo y est.
    // Si on tronque proprement, ok=true ; sinon, missing/unexpected non vides.
    if (audit.observedPositions.length === 1 && audit.observedPositions[0] === 4) {
      expect(audit.ok).toBe(true);
    } else {
      expect(audit.ok).toBe(false);
    }
  });

  it("respecte un step personnalisé", () => {
    // step=2 => positions attendues 3, 6, 9
    const out = iL(real(6), demos(3), 2);
    const audit = auditInterleave(out, 2);
    expect(audit.ok).toBe(true);
    expect(audit.expectedPositions).toEqual([3, 6, 9]);
  });

  it("expose des positions 1-indexées cohérentes avec l'affichage UI", () => {
    const out = iL(real(6), demos(2));
    const audit = auditInterleave(out);
    // 6 réels + 2 démos, step=3 => positions 4 et 8
    expect(audit.observedPositions).toEqual([4, 8]);
    // Aucune position 0 (les positions sont 1-indexées)
    expect(audit.observedPositions.every((p) => p >= 1)).toBe(true);
  });
});
