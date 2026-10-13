import { describe, expect, it } from "vitest";
import { composeHomeListings, rankShowcaseGuards, showcaseScore } from "@/components/landing/LiveListingsStrip";

type Listing = Parameters<typeof composeHomeListings>[0][number];

const NOW = Date.parse("2026-10-14T00:00:00Z");
const daysAgo = (n: number) => new Date(NOW - n * 24 * 60 * 60 * 1000).toISOString();

const listing = (id: string, kind: "garde" | "besoin", distance: number, extra: Partial<Listing> = {}): Listing => ({
  id,
  kind,
  title: id,
  city: "Lyon",
  date: null,
  endDate: null,
  photo: "https://example.test/photo.jpg",
  href: `/${id}`,
  latitude: null,
  longitude: null,
  distance,
  photoCount: 1,
  createdAt: daysAgo(1),
  country: "FR",
  ownerId: `owner-${id}`,
  ...extra,
});

describe("composition des annonces de la home", () => {
  it("compose cinq gardes et un besoin", () => {
    const guards = Array.from({ length: 7 }, (_, index) => listing(`g${index}`, "garde", index));
    const needs = Array.from({ length: 4 }, (_, index) => listing(`b${index}`, "besoin", index));
    const result = composeHomeListings(guards, needs, { lat: 45.75, lng: 4.85 }, NOW);
    expect(result.filter((item) => item.kind === "garde")).toHaveLength(5);
    expect(result.filter((item) => item.kind === "besoin")).toHaveLength(1);
  });

  it("écarte les besoins sans photo et complète avec des gardes", () => {
    const guards = Array.from({ length: 7 }, (_, index) => listing(`g${index}`, "garde", index));
    const needs = [listing("b-sans-photo", "besoin", 0, { photo: null, photoCount: 0 })];
    const result = composeHomeListings(guards, needs, null, NOW);
    expect(result).toHaveLength(6);
    expect(result.every((item) => item.kind === "garde")).toBe(true);
  });

  it("avec une ville saisie, trie chaque groupe par distance", () => {
    const guards = [listing("g-loin", "garde", 9), listing("g-proche", "garde", 2)];
    const needs = Array.from({ length: 6 }, (_, index) => listing(`b${index}`, "besoin", 8 - index));
    const result = composeHomeListings(guards, needs, { lat: 45.75, lng: 4.85 }, NOW);
    expect(result).toHaveLength(6);
    expect(result.filter((item) => item.kind === "garde").map((item) => item.id)).toEqual(["g-proche", "g-loin"]);
    expect(result.filter((item) => item.kind === "besoin").map((item) => item.distance)).toEqual([3, 4, 5, 6]);
  });
});

describe("vitrine nationale de la home", () => {
  it("place une garde récente avec photos avant une garde récente sans photo", () => {
    const ranked = rankShowcaseGuards([
      listing("sans-photo", "garde", 0, { photo: null, photoCount: 0, createdAt: daysAgo(0) }),
      listing("belles-photos", "garde", 0, { photoCount: 6, createdAt: daysAgo(2) }),
    ], NOW);
    expect(ranked.map((l) => l.id)).toEqual(["belles-photos", "sans-photo"]);
  });

  it("préfère une annonce récente à une annonce ancienne à photos égales", () => {
    const ranked = rankShowcaseGuards([
      listing("ancienne", "garde", 0, { photoCount: 4, createdAt: daysAgo(60) }),
      listing("recente", "garde", 0, { photoCount: 4, createdAt: daysAgo(3) }),
    ], NOW);
    expect(ranked[0].id).toBe("recente");
  });

  it("met en avant une destination lointaine récente (Québec, Polynésie)", () => {
    const ranked = rankShowcaseGuards([
      listing("lyon", "garde", 0, { photoCount: 3, createdAt: daysAgo(1) }),
      listing("quebec", "garde", 0, { photoCount: 4, createdAt: daysAgo(4), country: "CA" }),
      listing("tahiti", "garde", 0, { photoCount: 2, createdAt: daysAgo(12), country: "PF" }),
    ], NOW);
    expect(ranked.map((l) => l.id)).toEqual(["quebec", "tahiti", "lyon"]);
  });

  it("ne montre qu'une annonce par membre", () => {
    const ranked = rankShowcaseGuards([
      listing("aiko-1", "garde", 0, { ownerId: "o1", photoCount: 6, createdAt: daysAgo(1) }),
      listing("aiko-2", "garde", 0, { ownerId: "o1", photoCount: 6, createdAt: daysAgo(1) }),
      listing("autre", "garde", 0, { ownerId: "o2", photoCount: 3, createdAt: daysAgo(2) }),
    ], NOW);
    expect(ranked.map((l) => l.id)).toEqual(["aiko-1", "autre"]);
  });

  it("score : photos, fraîcheur et destination", () => {
    expect(showcaseScore(listing("a", "garde", 0, { photoCount: 0, photo: null, createdAt: daysAgo(90) }), NOW)).toBe(0);
    expect(showcaseScore(listing("b", "garde", 0, { photoCount: 5, createdAt: daysAgo(3), country: "PF" }), NOW)).toBe(6);
  });
});
