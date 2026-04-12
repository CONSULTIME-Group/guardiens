import { describe, it, expect } from "vitest";
import { haversineDistance, toSlug } from "../geo";

describe("haversineDistance", () => {
  it("returns 0 for same point", () => {
    const p = { lat: 48.8566, lng: 2.3522 };
    expect(haversineDistance(p, p)).toBe(0);
  });

  it("calculates Paris–Lyon ≈ 392 km", () => {
    const paris = { lat: 48.8566, lng: 2.3522 };
    const lyon = { lat: 45.764, lng: 4.8357 };
    const d = haversineDistance(paris, lyon);
    expect(d).toBeGreaterThan(380);
    expect(d).toBeLessThan(400);
  });
});

describe("toSlug", () => {
  it("lowercases and strips accents", () => {
    expect(toSlug("Château-Thierry")).toBe("chateau-thierry");
  });

  it("replaces spaces and special chars", () => {
    expect(toSlug("Saint Étienne du Rouvray")).toBe("saint-etienne-du-rouvray");
  });

  it("trims leading/trailing hyphens", () => {
    expect(toSlug("--hello--")).toBe("hello");
  });
});
