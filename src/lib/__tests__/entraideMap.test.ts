import { describe, expect, it } from "vitest";
import { offsetApproximatePoint, offsetDistanceMeters } from "../entraideMap";

describe("entraideMap", () => {
  it("produit un décalage stable compris entre 200 et 500 mètres", () => {
    const source = { lat: 45.764, lng: 4.8357 };
    const first = offsetApproximatePoint("00000000-0000-0000-0000-000000000001", source.lat, source.lng);
    const second = offsetApproximatePoint("00000000-0000-0000-0000-000000000001", source.lat, source.lng);
    const distance = offsetDistanceMeters(source, first);
    expect(first).toEqual(second);
    expect(distance).toBeGreaterThanOrEqual(199);
    expect(distance).toBeLessThanOrEqual(501);
  });
});