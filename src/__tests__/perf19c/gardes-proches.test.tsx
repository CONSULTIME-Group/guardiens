/**
 * Lot perf 19c (09/11/2026, décision de Jérémie) : sous un rayon de moins de
 * 3 gardes ouvertes, les gardes ouvertes les plus proches, rayon inchangé.
 */
import { describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { fireEvent, render, screen } from "@testing-library/react";
import { pickNearestOutside, nearestTierOf, NEAREST_TIER_LABELS } from "@/lib/nearestOutsideZone";
import { NearestOutsideSection } from "@/components/search/listing/NearestOutsideSection";

type S = { id: string; lat?: number; lng?: number; dept: string };
const coordsOf = (s: S) => (s.lat != null && s.lng != null ? { lat: s.lat, lng: s.lng } : null);
const deptOf = (s: S) => s.dept;
const lyon = { lat: 45.764, lng: 4.8357 };

const sits: S[] = [
  { id: "villeurbanne", lat: 45.7719, lng: 4.8902, dept: "69" }, // ~4 km, dans le rayon
  { id: "vienne", lat: 45.5255, lng: 4.8746, dept: "38" },       // ~27 km, région
  { id: "villefranche", lat: 45.9897, lng: 4.7186, dept: "69" }, // ~27 km, département
  { id: "annecy", lat: 45.8992, lng: 6.1294, dept: "74" },       // ~102 km, région
  { id: "paris", lat: 48.8566, lng: 2.3522, dept: "75" },        // ~392 km, France
  { id: "sans-point", dept: "69" },
  { id: "marseille", lat: 43.2965, lng: 5.3698, dept: "13" },
  { id: "nantes", lat: 47.2184, lng: -1.5536, dept: "44" },
  { id: "lille", lat: 50.6292, lng: 3.0573, dept: "59" },
];

describe("pickNearestOutside", () => {
  it("hors du rayon seulement, par distance croissante, sans garde non située, 6 au plus", () => {
    const out = pickNearestOutside(sits, coordsOf, deptOf, lyon, 15, "69");
    expect(new Set(out.map((o) => o.sit.id))).toEqual(new Set(["villefranche", "vienne", "annecy", "marseille", "paris", "nantes"]));
    expect(out).toHaveLength(6);
    expect(out.some((o) => o.sit.id === "villeurbanne" || o.sit.id === "sans-point")).toBe(false);
    for (let i = 1; i < out.length; i++) expect(out[i].distanceKm).toBeGreaterThanOrEqual(out[i - 1].distanceKm);
  });
  it("paliers : département, région, France", () => {
    const out = pickNearestOutside(sits, coordsOf, deptOf, lyon, 15, "69", 30);
    const tier = (id: string) => out.find((o) => o.sit.id === id)?.tier;
    expect(tier("villefranche")).toBe("dept");
    expect(tier("annecy")).toBe("region");
    expect(tier("paris")).toBe("france");
    expect(NEAREST_TIER_LABELS.france).toBe("Ailleurs en France");
  });
  it("outre-mer : La Réunion ne range pas la Guadeloupe ni la métropole dans sa région", () => {
    const stDenis = { lat: -20.8823, lng: 55.4504 };
    const list: S[] = [
      { id: "saint-pierre", lat: -21.3393, lng: 55.4781, dept: "974" },
      { id: "pointe-a-pitre", lat: 16.2411, lng: -61.5331, dept: "971" },
      { id: "lyon", lat: 45.764, lng: 4.8357, dept: "69" },
    ];
    const out = pickNearestOutside(list, coordsOf, deptOf, stDenis, 15, "974", 30);
    expect(out[0]).toMatchObject({ tier: "dept" });
    expect(out[0].distanceKm).toBeGreaterThan(40);
    expect(out[0].distanceKm).toBeLessThan(60);
    expect(out.find((o) => o.sit.id === "pointe-a-pitre")?.tier).toBe("france");
    expect(out.find((o) => o.sit.id === "lyon")?.distanceKm).toBeGreaterThan(8000);
  });
});

describe("section", () => {
  it("titre, rayon inchangé, palier par carte, lien France, mesures", () => {
    const track = vi.fn();
    const onSeeFrance = vi.fn();
    const items = [
      { id: "a", nearestTier: "dept", distance: 27.4 },
      { id: "b", nearestTier: "region", distance: 102 },
    ];
    render(
      <NearestOutsideSection
        items={items}
        radiusKm={15}
        franceCount={20}
        renderCard={(it) => <span>carte {it.id}</span>}
        onSeeFrance={onSeeFrance}
        trackEvent={track}
      />,
    );
    expect(screen.getByRole("heading", { name: "Les gardes ouvertes les plus proches de vous" })).toBeTruthy();
    expect(screen.getByText("Votre rayon reste à 15 km.")).toBeTruthy();
    expect(screen.getByText("Dans votre département")).toBeTruthy();
    expect(screen.getByText("Dans la même région")).toBeTruthy();
    expect(track).toHaveBeenCalledWith("nearest_outside_seen", expect.objectContaining({ metadata: expect.objectContaining({ cards: 2, widest_tier: "region" }) }));
    fireEvent.click(screen.getByText("carte b"));
    expect(track).toHaveBeenCalledWith("nearest_outside_card_clicked", expect.objectContaining({ metadata: { rank: 2, tier: "region", distance_km: 102 } }));
    fireEvent.click(screen.getByRole("button", { name: "Voir les 20 gardes ouvertes en France" }));
    expect(onSeeFrance).toHaveBeenCalled();
  });
});

describe("branchement de la recherche", () => {
  const src = readFileSync("src/components/search/SearchSitter.tsx", "utf8");
  it("calcul sur les annonces en mémoire, en zone rayon avec un point seulement", () => {
    expect(src).toContain('const nearest = applied === "radius" && searchCoords');
    expect(src).toContain("pickNearestOutside(frenchOpen, coordsOf,");
  });
  it("section sous moins de 3 gardes ouvertes, bandeau hors zone et bulle Alma masqués", () => {
    expect(src).toContain("openInRadius < NEAREST_OUTSIDE_THRESHOLD ? nearestFiltered.slice(0, NEAREST_OUTSIDE_SHOWN) : []");
    // Lot RCH1 : la règle vit dans outOfZoneShown, partagée avec la mesure.
    expect(src).toContain("const outOfZoneShown = nearestShown.length === 0 &&");
    expect(src).toContain("const showOutOfZone = outOfZoneShown;");
    expect(src).toContain("{nearestShown.length === 0 && (\n      <AlmaEmptySearchBubble");
  });
  it("aucune annonce d'exemple mêlée aux gardes réelles proches, card_source mesuré", () => {
    expect(src).toContain("isPublic || nearestComing ? 0");
    expect(src).toContain('card_source: radiusCount > 0 ? "radius" : "nearest"');
  });
});

describe("lot perf 19d : paliers recalculés à l'arrivée du département", () => {
  it("Gap (05) : Carpentras, Barjols et Nice dans la même région, Ardèche ailleurs", () => {
    expect(nearestTierOf("84", "05")).toBe("region");
    expect(nearestTierOf("83", "05")).toBe("region");
    expect(nearestTierOf("06", "05")).toBe("region");
    expect(nearestTierOf("07", "05")).toBe("france");
    expect(nearestTierOf("05", "05")).toBe("dept");
    expect(nearestTierOf("84", null)).toBe("france");
  });
  it("le département arrivé après la liste repasse sur les paliers, même si la liste arrive après lui", () => {
    const src = readFileSync("src/components/search/SearchSitter.tsx", "utf8");
    expect(src).toContain("nearestRefDeptRef.current = { gen, dept: rd };");
    expect(src).toContain("setNearestPool((prev) => retierNearest(prev, rd));");
    expect(src).toContain("knownRef && knownRef.gen === gen ? retierNearest(nearestEnriched, knownRef.dept) : nearestEnriched");
  });
});
