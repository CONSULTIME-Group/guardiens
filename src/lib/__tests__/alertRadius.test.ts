import { describe, it, expect } from "vitest";
import {
  ALLOWED_ALERT_RADII,
  isAllowedRadius,
  snapToAllowedRadius,
} from "../alertRadius";

describe("alertRadius — snap to RPC-allowed values", () => {
  it("exposes exactly the 5 RPC-accepted values", () => {
    expect([...ALLOWED_ALERT_RADII]).toEqual([5, 15, 30, 50, 100]);
  });

  it("keeps allowed values unchanged", () => {
    for (const r of ALLOWED_ALERT_RADII) {
      expect(snapToAllowedRadius(r)).toBe(r);
    }
  });

  it("snaps every UI slider value (5→100, step 5) to an allowed value", () => {
    // Reproduces the slider domain previously used in SearchOwner / SearchSitter
    const sliderValues: number[] = [];
    for (let v = 5; v <= 100; v += 5) sliderValues.push(v);

    for (const v of sliderValues) {
      const snapped = snapToAllowedRadius(v);
      expect(
        isAllowedRadius(snapped),
        `value ${v}km snapped to ${snapped}km, which is not in the RPC whitelist`,
      ).toBe(true);
    }
  });

  it("snaps known intermediate values to the nearest neighbour", () => {
    // Known transition points
    expect(snapToAllowedRadius(10)).toBe(5); // tie 5/15 → smaller wins (reduce keeps prev)
    expect(snapToAllowedRadius(11)).toBe(15);
    expect(snapToAllowedRadius(20)).toBe(15);
    expect(snapToAllowedRadius(25)).toBe(30); // |25-30|=5 < |25-15|=10
    expect(snapToAllowedRadius(35)).toBe(30);
    expect(snapToAllowedRadius(40)).toBe(30); // tie 30/50 → prev wins (30)
    expect(snapToAllowedRadius(45)).toBe(50);
    expect(snapToAllowedRadius(55)).toBe(50);
    expect(snapToAllowedRadius(75)).toBe(50); // tie 50/100 → prev wins (50)
    expect(snapToAllowedRadius(80)).toBe(100);
    expect(snapToAllowedRadius(95)).toBe(100);
  });

  it("handles out-of-range and invalid inputs safely", () => {
    expect(snapToAllowedRadius(0)).toBe(5);
    expect(snapToAllowedRadius(-50)).toBe(5);
    expect(snapToAllowedRadius(9999)).toBe(100);
    expect(snapToAllowedRadius(NaN)).toBe(15); // safe default
    expect(snapToAllowedRadius(Infinity)).toBe(15);
  });

  it("never produces a value rejected by the RPC for any 0–200 km integer", () => {
    for (let v = 0; v <= 200; v++) {
      expect(isAllowedRadius(snapToAllowedRadius(v))).toBe(true);
    }
  });
});
