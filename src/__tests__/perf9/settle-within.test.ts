/** Lot perf 9 : attente bornée d'un travail réseau. */
import { describe, expect, it } from "vitest";
import { LOCATE_BUDGET_MS, hasNewCoords, settleWithin } from "@/lib/settleWithin";

describe("settleWithin (lot perf 9)", () => {
  it("rend la valeur quand le travail finit dans le délai", async () => {
    await expect(settleWithin(Promise.resolve(7), 50)).resolves.toEqual({ done: true, value: 7 });
  });
  it("rend la main au délai sans annuler le travail", async () => {
    let release: (v: number) => void = () => {};
    const work = new Promise<number>((r) => { release = r; });
    await expect(settleWithin(work, 10)).resolves.toEqual({ done: false });
    release(3);
    await expect(work).resolves.toBe(3);
  });
  it("garde un budget court, sous 2 s", () => {
    expect(LOCATE_BUDGET_MS).toBeGreaterThan(0);
    expect(LOCATE_BUDGET_MS).toBeLessThanOrEqual(2000);
  });
  it("hasNewCoords ne voit que les clés nouvelles", () => {
    const shown = new Map([["a", 1]]);
    expect(hasNewCoords(new Map([["a", 1]]), shown)).toBe(false);
    expect(hasNewCoords(new Map([["a", 1], ["b", 2]]), shown)).toBe(true);
  });
});
