import { describe, it, expect } from "vitest";
import {
  radiusLadder,
  resolveDigestScope,
  shouldSendDigest,
  wideningSentence,
  orderAndCap,
  WEEKLY_MAX_ITEMS,
} from "../../supabase/functions/_shared/weekly-digest-rules";

const c = (distanceKm: number | null, id = Math.random().toString(36).slice(2)) => ({
  id,
  distanceKm,
});

describe("weekly digest rules", () => {
  it("ne descend jamais en dessous du rayon choisi et plafonne a 100 km", () => {
    expect(radiusLadder(30)).toEqual([30, 50, 100]);
    expect(radiusLadder(50)).toEqual([50, 100]);
    expect(radiusLadder(100)).toEqual([100]);
    expect(radiusLadder(15)).toEqual([15, 30, 50, 100]);
    expect(radiusLadder(500)).toEqual([100]);
  });

  it("reste au rayon de base quand il y a assez de matiere", () => {
    const scope = resolveDigestScope([c(5), c(10), c(20), c(80)], 30);
    expect(scope.radiusKm).toBe(30);
    expect(scope.widened).toBe(false);
    expect(scope.items).toHaveLength(3);
  });

  it("elargit par paliers jusqu'a trouver trois elements", () => {
    const scope = resolveDigestScope([c(10), c(45), c(48)], 30);
    expect(scope.radiusKm).toBe(50);
    expect(scope.widened).toBe(true);
    expect(scope.items).toHaveLength(3);
  });

  it("s'arrete a 100 km meme sans atteindre le seuil", () => {
    const scope = resolveDigestScope([c(95)], 30);
    expect(scope.radiusKm).toBe(100);
    expect(scope.widened).toBe(true);
    expect(scope.items).toHaveLength(1);
  });

  it("ignore les elements sans distance calculable", () => {
    const scope = resolveDigestScope([c(null), c(null)], 30);
    expect(scope.items).toHaveLength(0);
    expect(shouldSendDigest(scope.items.length)).toBe(false);
  });

  it("ne laisse jamais partir un resume vide", () => {
    expect(shouldSendDigest(0)).toBe(false);
    expect(shouldSendDigest(1)).toBe(true);
  });

  it("annonce l'elargissement, et se tait quand il n'y en a pas", () => {
    expect(wideningSentence(30, 30)).toBeNull();
    expect(wideningSentence(30, 100)).toContain("30 km");
    expect(wideningSentence(30, 100)).toContain("100 km");
    expect(wideningSentence(30, 100)).not.toContain("—");
  });

  it("classe par proximite et plafonne le nombre d'elements", () => {
    const many = Array.from({ length: 20 }, (_, i) => c(i + 1, `i${i}`));
    const out = orderAndCap(many);
    expect(out).toHaveLength(WEEKLY_MAX_ITEMS);
    expect(out[0].distanceKm).toBe(1);
    expect(out[out.length - 1].distanceKm).toBe(WEEKLY_MAX_ITEMS);
  });
});
