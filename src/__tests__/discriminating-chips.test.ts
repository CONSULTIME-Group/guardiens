/**
 * Chips discriminantes du Top 3 gardiens (25/08/2026).
 *
 * Verrouille la doctrine : quand les 2 critères de poids maximal sont
 * matchés à l'identique par les 3 candidats affichés, les chips doivent se
 * différencier via les critères secondaires, jamais répéter les deux mêmes
 * phrases sur les trois cartes.
 */
import { describe, it, expect } from "vitest";
import {
  pickDiscriminatingChips,
  type ChipCandidate,
} from "@/components/dashboard/shared/discriminatingChips";

const crit = (key: string, weight: number, points: number): { key: string; weight: number; points: number; phrase: string } => ({
  key,
  weight,
  points,
  phrase: `phrase-${key}`,
});

const candidate = (id: string, criteria: ReturnType<typeof crit>[]): ChipCandidate => ({
  id,
  affinity: { matchedDetailed: criteria },
});

describe("pickDiscriminatingChips", () => {
  it("deux candidats au même duo de tête affichent des chips différentes via leurs critères secondaires", () => {
    const shared = [crit("animaux", 3, 3), crit("presence", 2, 2)];
    const trio = [
      candidate("a", [...shared, crit("vehicule", 1, 1)]),
      candidate("b", [...shared, crit("langues", 1, 1)]),
      candidate("c", [...shared, crit("distance", 1, 1)]),
    ];
    const chips = pickDiscriminatingChips(trio);
    expect(chips.get("a")).toContain("phrase-vehicule");
    expect(chips.get("b")).toContain("phrase-langues");
    expect(chips.get("c")).toContain("phrase-distance");
    // Les trois cartes ne sont pas identiques.
    const rendered = [chips.get("a")!.join("|"), chips.get("b")!.join("|"), chips.get("c")!.join("|")];
    expect(new Set(rendered).size).toBe(3);
  });

  it("un critère matché par les trois à l'identique recule derrière un critère qui départage", () => {
    const trio = [
      candidate("a", [crit("animaux", 3, 3), crit("presence", 2, 2), crit("vehicule", 1, 1)]),
      candidate("b", [crit("animaux", 3, 3), crit("presence", 2, 2)]),
    ];
    const chips = pickDiscriminatingChips(trio);
    // Le critère véhicule, seul à distinguer le duo, passe en tête chez « a ».
    expect(chips.get("a")![0]).toBe("phrase-vehicule");
  });

  it("un critère matché par tous mais avec des points différents reste discriminant", () => {
    const trio = [
      candidate("a", [crit("animaux", 3, 3), crit("distance", 1, 1)]),
      candidate("b", [crit("animaux", 3, 2), crit("distance", 1, 0.5)]),
    ];
    const chips = pickDiscriminatingChips(trio);
    expect(chips.get("a")![0]).toBe("phrase-animaux");
  });

  it("sans aucun critère discriminant, le repli par poids puis points est inchangé", () => {
    const shared = [crit("animaux", 3, 3), crit("presence", 2, 2), crit("vehicule", 1, 1)];
    const trio = [candidate("a", shared), candidate("b", shared), candidate("c", shared)];
    const chips = pickDiscriminatingChips(trio);
    for (const id of ["a", "b", "c"]) {
      expect(chips.get(id)).toEqual(["phrase-animaux", "phrase-presence"]);
    }
  });

  it("jamais de chip pour un critère non matché par le candidat concerné", () => {
    const trio = [
      candidate("a", [crit("animaux", 3, 3)]),
      candidate("b", [crit("langues", 1, 1)]),
    ];
    const chips = pickDiscriminatingChips(trio);
    expect(chips.get("a")).toEqual(["phrase-animaux"]);
    expect(chips.get("b")).toEqual(["phrase-langues"]);
  });

  it("plafonne à deux chips par candidat", () => {
    const trio = [
      candidate("a", [crit("animaux", 3, 3), crit("presence", 2, 2), crit("vehicule", 1, 1), crit("langues", 1, 1)]),
    ];
    expect(pickDiscriminatingChips(trio).get("a")).toHaveLength(2);
  });
});
