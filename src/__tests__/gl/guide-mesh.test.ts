/**
 * Lot GL4 (14/10/2026) : maillage par distance, faits citables, liste des
 * guides groupée par pays.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { guideFacts, guidePlaceName, nearestGuides } from "@/lib/guideMesh";
import { guideGroupLabel, visiblePlaceCounts } from "@/lib/guidesListing";

const G = (id: string, city: string, lat: number | null, lon: number | null, extra: Record<string, unknown> = {}) =>
  ({ id, slug: id, city, latitude: lat, longitude: lon, department: "Rhône", country: "FR", ...extra });

describe("GL4, guides voisins par distance", () => {
  const lyon = G("lyon", "Lyon", 45.758, 4.835);
  const all = [
    lyon,
    G("villeurbanne", "Villeurbanne", 45.766, 4.879),
    G("vienne", "Vienne", 45.525, 4.874, { department: "Isère" }),
    G("annecy", "Annecy", 45.899, 6.129, { department: "Haute-Savoie" }),
    G("marseille", "Marseille", 43.296, 5.37, { department: "Bouches-du-Rhône" }),
    G("saint-ludger", "Saint Ludger", 45.742, -70.695, { country: "CA", department: "Québec" }),
  ];

  it("les plus proches d'abord, au-delà du département, dans 150 km", () => {
    const n = nearestGuides(lyon, all);
    expect(n.map((g) => g.slug)).toEqual(["villeurbanne", "vienne", "annecy"]);
    expect(n[0].distanceKm).toBe(4);
  });

  it("à l'étranger, aucun guide français proposé comme voisin", () => {
    expect(nearestGuides(all[5], all)).toEqual([]);
  });

  it("sans coordonnées, repli sur le même département", () => {
    const n = nearestGuides(G("x", "Bron", null, null), all);
    expect(n.map((g) => g.slug)).toEqual(["lyon", "villeurbanne"]);
    expect(n[0].distanceKm).toBeNull();
  });

  it("nom affiché avec le pays hors de France", () => {
    expect(guidePlaceName({ city: "Saint Ludger", country: "CA" })).toBe("Saint Ludger, Canada");
    expect(guidePlaceName({ city: "Lyon", country: "FR" })).toBe("Lyon");
  });
});

describe("GL4, faits citables", () => {
  const places = [
    { category: "vet", name: "Clinique B", distance_km: 4.2, source_url: "https://www.openstreetmap.org/node/2" },
    { category: "vet", name: "Clinique A", distance_km: 1.3, source_url: "https://www.openstreetmap.org/node/1" },
    { category: "vet", name: "Clinique IA", distance_km: 0.1, source_url: null },
    { category: "general_park", name: "Parc A", distance_km: 0.5, source_url: "https://www.openstreetmap.org/way/3" },
    { category: "walk_trail", name: "Sentier loin", distance_km: 22, source_url: "https://www.openstreetmap.org/relation/4" },
  ];

  it("vétérinaire le plus proche parmi les lieux sourcés, balades à moins de 15 km, date de vérification", () => {
    const f = guideFacts("Lyon", places, "2026-10-14T06:00:00Z");
    expect(f[0]).toEqual({ question: "Où est le vétérinaire le plus proche de Lyon ?", answer: "Clinique A, à 1,3 km du centre de Lyon." });
    expect(f[1].answer).toBe("1 lieu de promenade référencé à moins de 15 km, dont Parc A.");
    expect(f[2].answer).toContain("14 octobre 2026");
    for (const x of f) expect(x.question + x.answer).not.toMatch(/[–—]/);
  });

  it("aucun fait sans lieu sourcé", () => {
    expect(guideFacts("Lyon", [{ category: "vet", name: "IA", distance_km: 1, source_url: null }], "2026-10-14")).toEqual([]);
  });
});

describe("GL4, liste des guides", () => {
  it("groupe par département en France, par pays ailleurs", () => {
    expect(guideGroupLabel({ id: "a", department: "Rhône", country: "FR" })).toBe("Rhône");
    expect(guideGroupLabel({ id: "b", department: "G0", country: "CA" })).toBe("Canada");
    expect(guideGroupLabel({ id: "c", department: "", country: "MA" })).toBe("Maroc");
  });

  it("compte les lieux comme la page : sourcés seuls pour un guide sourcé ou à l'étranger", () => {
    const counts = visiblePlaceCounts(
      [
        { id: "fr-old", country: "FR" },
        { id: "fr-new", country: "FR", places_sourced_at: "2026-10-14" },
        { id: "ca", country: "CA" },
      ],
      [
        { city_guide_id: "fr-old", source_url: null },
        { city_guide_id: "fr-old", source_url: "s" },
        { city_guide_id: "fr-new", source_url: null },
        { city_guide_id: "fr-new", source_url: "s" },
        { city_guide_id: "ca", source_url: null },
      ],
    );
    expect(counts).toEqual({ "fr-old": 2, "fr-new": 1 });
  });

  it("sitemap : date de vérification comme lastmod d'un guide", () => {
    const sm = readFileSync("supabase/functions/_shared/sitemap-data.js", "utf8");
    expect(sm).toContain("normalizeLastmod(cg.places_sourced_at, today)");
  });
});
