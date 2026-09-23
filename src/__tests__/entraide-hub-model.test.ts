import { describe, expect, it } from "vitest";
import {
  HELPERS_PAGE_SIZE,
  NEARBY_THRESHOLD_KM,
  categoryInitial,
  distanceFrom,
  isSectorQuiet,
  memberSubtitle,
  nearestDistanceKm,
  sortByDistance,
} from "@/lib/entraideHubModel";

const LYON: [number, number] = [45.75, 4.85];

describe("logique de la page Entraide", () => {
  it("calcule une distance seulement quand tout est connu", () => {
    expect(distanceFrom(null, 45.75, 4.85)).toBeNull();
    expect(distanceFrom(LYON, null, 4.85)).toBeNull();
    expect(Math.round(distanceFrom(LYON, 45.76, 4.86) ?? 0)).toBe(1);
  });

  it("trie par distance croissante et repousse les inconnues", () => {
    const items = [
      { id: "loin", d: 40 },
      { id: "inconnu", d: null as number | null },
      { id: "proche", d: 2 },
    ];
    expect(sortByDistance(items, (item) => item.d).map((item) => item.id)).toEqual(["proche", "loin", "inconnu"]);
  });

  it("retient la distance la plus courte", () => {
    expect(nearestDistanceKm([null, 18, 4])).toBe(4);
    expect(nearestDistanceKm([null, null])).toBeNull();
  });

  it("signale un secteur calme au-delà du seuil", () => {
    expect(NEARBY_THRESHOLD_KM).toBe(30);
    expect(isSectorQuiet(LYON, 12, 3)).toBe(false);
    expect(isSectorQuiet(LYON, 31, 3)).toBe(true);
    expect(isSectorQuiet(LYON, null, 0)).toBe(true);
    expect(isSectorQuiet(null, 90, 3)).toBe(false);
  });

  it("compose le sous-titre du membre", () => {
    expect(memberSubtitle("Lyon", 4.2)).toBe("Autour de Lyon. Le plus proche est à 4 km.");
    expect(memberSubtitle("Lyon", 1.9)).toBe("Autour de Lyon. Le plus proche est tout près de chez vous.");
    expect(memberSubtitle("Lyon", null)).toBe("Autour de Lyon.");
    expect(memberSubtitle(null, 4)).toBeNull();
  });

  it("donne l'initiale de la catégorie et un palier de douze personnes", () => {
    expect(categoryInitial("garden")).toBe("J");
    expect(categoryInitial(null)).toBe("A");
    expect(HELPERS_PAGE_SIZE).toBe(12);
  });
});
