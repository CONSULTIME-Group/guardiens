import { describe, expect, it } from "vitest";
import { composeHomeListings } from "@/components/landing/LiveListingsStrip";

type Listing = Parameters<typeof composeHomeListings>[0][number];

const listing = (id: string, kind: "garde" | "besoin", distance: number): Listing => ({
  id,
  kind,
  title: id,
  city: "Lyon",
  date: null,
  endDate: null,
  photo: null,
  href: `/${id}`,
  latitude: null,
  longitude: null,
  distance,
});

describe("composition des annonces de la home", () => {
  it("compose quatre gardes et deux besoins", () => {
    const guards = Array.from({ length: 6 }, (_, index) => listing(`g${index}`, "garde", index));
    const needs = Array.from({ length: 4 }, (_, index) => listing(`b${index}`, "besoin", index));
    const result = composeHomeListings(guards, needs, { lat: 45.75, lng: 4.85 });
    expect(result.filter((item) => item.kind === "garde")).toHaveLength(4);
    expect(result.filter((item) => item.kind === "besoin")).toHaveLength(2);
  });

  it("complète avec l'autre catégorie et trie chaque groupe par distance", () => {
    const guards = [listing("g-loin", "garde", 9), listing("g-proche", "garde", 2)];
    const needs = Array.from({ length: 6 }, (_, index) => listing(`b${index}`, "besoin", 8 - index));
    const result = composeHomeListings(guards, needs, { lat: 45.75, lng: 4.85 });
    expect(result).toHaveLength(6);
    expect(result.filter((item) => item.kind === "garde").map((item) => item.id)).toEqual(["g-proche", "g-loin"]);
    expect(result.filter((item) => item.kind === "besoin").map((item) => item.distance)).toEqual([3, 4, 5, 6]);
  });
});