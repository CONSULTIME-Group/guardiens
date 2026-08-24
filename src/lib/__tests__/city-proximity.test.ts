import { describe, it, expect } from "vitest";
import {
  haversineKm,
  cityNameMatches,
  buildCityIlikeOrFilter,
  pickNearbySitters,
  buildNearbyMention,
  type NearbySitterCandidate,
} from "@/lib/cityProximity";

const cand = (
  id: string,
  lat: number,
  lng: number,
  radius: number,
  city = "Loin",
  postal = "69002",
): NearbySitterCandidate => ({
  id,
  city,
  postal_code: postal,
  latitude_approx: lat,
  longitude_approx: lng,
  geographic_radius: radius,
});

describe("haversineKm", () => {
  it("retrouve l'ordre de grandeur Lyon-Paris (~392 km)", () => {
    const d = haversineKm(45.764, 4.8357, 48.8566, 2.3522);
    expect(d).toBeGreaterThan(380);
    expect(d).toBeLessThan(405);
  });

  it("vaut 0 pour un point identique", () => {
    expect(haversineKm(45.9, 6.12, 45.9, 6.12)).toBeCloseTo(0, 6);
  });
});

describe("cityNameMatches", () => {
  it("match en mot entier, insensible casse et accents", () => {
    expect(cityNameMatches("saint-denis", "Saint-Denis")).toBe(true);
    expect(cityNameMatches("saint-étienne", "Saint-Etienne")).toBe(true);
  });

  it("respecte les frontières de mot (miroir SQL exact)", () => {
    // "ien" n'est pas une frontière : pas de match.
    expect(cityNameMatches("Saint-Paulien", "Saint-Paul")).toBe(false);
    // Le trait d'union EST une frontière : le SQL matche, on matche aussi.
    expect(cityNameMatches("Saint-Paul-lès-Dax", "Saint-Paul")).toBe(true);
    // Ponctuation interne différente (espace vs trait d'union) : pas de match.
    expect(cityNameMatches("Saint Etienne", "Saint-Étienne")).toBe(false);
  });

  it("tolère une ville de profil vide", () => {
    expect(cityNameMatches(null, "Lyon")).toBe(false);
  });
});

describe("buildCityIlikeOrFilter", () => {
  it("produit une clause ilike par commune, joker astérisque", () => {
    expect(buildCityIlikeOrFilter(["Papeete", "Mahina"])).toBe(
      'city.ilike."*Papeete*",city.ilike."*Mahina*"',
    );
  });

  it("laisse passer l'apostrophe et les espaces (Faa'a, Hitiaa O Te Ra)", () => {
    expect(buildCityIlikeOrFilter(["Faa'a"])).toBe('city.ilike."*Faa\'a*"');
    expect(buildCityIlikeOrFilter(["Hitiaa O Te Ra"])).toBe(
      'city.ilike."*Hitiaa O Te Ra*"',
    );
  });

  it("ignore les entrées blanches et renvoie null si rien d'exploitable", () => {
    expect(buildCityIlikeOrFilter([])).toBeNull();
    expect(buildCityIlikeOrFilter([" ", ""])).toBeNull();
  });
});

describe("pickNearbySitters", () => {
  const lyon = { city: "Lyon", cityLat: 45.764, cityLng: 4.8357, departmentCode: "69" };

  it("garde un gardien dont le rayon couvre la commune, trie par distance", () => {
    const list = pickNearbySitters(
      [
        cand("a", 45.78, 4.85, 20), // ~2 km
        cand("b", 45.9, 4.9, 30), // ~16 km
        cand("c", 45.9, 4.9, 10), // ~16 km mais rayon 10 : rejeté
      ],
      { ...lyon, limit: 6 },
    );
    expect(list.map((s) => s.id)).toEqual(["a", "b"]);
    expect(list[0].distance_km).toBeLessThan(list[1].distance_km);
  });

  it("exclut les habitants de la commune (ville + même département)", () => {
    const list = pickNearbySitters(
      [cand("habitant", 45.77, 4.84, 50, "Lyon", "69001")],
      { ...lyon, limit: 6 },
    );
    expect(list).toEqual([]);
  });

  it("page agrégée : exclut les habitants de chaque commune de la liste", () => {
    const tahiti = {
      city: "Tahiti",
      cityLat: -17.65,
      cityLng: -149.43,
      departmentCode: "987",
      aggregateCities: ["Papeete", "Faa'a"],
    };
    const list = pickNearbySitters(
      [
        // Habite Papeete (987) : résident de la page agrégée, exclu.
        cand("resident", -17.54, -149.57, 100, "Papeete", "98714"),
        // Habite Faa'a (987) : résident aussi, exclu malgré l'apostrophe.
        cand("resident2", -17.55, -149.6, 100, "Faa'a", "98702"),
        // Habite une commune hors liste : reste en proximité.
        cand("secteur", -17.66, -149.45, 50, "Moorea", "98728"),
      ],
      { ...tahiti, limit: 6 },
    );
    expect(list.map((s) => s.id)).toEqual(["secteur"]);
  });

  it("n'exclut pas un homonyme hors département", () => {
    // Vit "Lyon" (homonyme) mais code postal hors 69 : reste en proximité.
    const list = pickNearbySitters(
      [cand("homo", 45.77, 4.84, 50, "Lyon", "42000")],
      { ...lyon, limit: 6 },
    );
    expect(list.map((s) => s.id)).toEqual(["homo"]);
  });

  it("exclut les ids déjà affichés en résidents et plafonne à limit", () => {
    const list = pickNearbySitters(
      [cand("a", 45.78, 4.85, 20), cand("b", 45.79, 4.86, 20), cand("c", 45.8, 4.87, 20)],
      { ...lyon, excludeIds: new Set(["a"]), limit: 1 },
    );
    expect(list.map((s) => s.id)).toEqual(["b"]);
  });

  it("rejette les profils sans coordonnées ou sans rayon", () => {
    const noCoords = { ...cand("x", 0, 0, 50), latitude_approx: null };
    const noRadius = { ...cand("y", 45.78, 4.85, 0) };
    expect(pickNearbySitters([noCoords, noRadius], { ...lyon, limit: 6 })).toEqual([]);
  });

  it("limit 0 ne renvoie rien", () => {
    expect(pickNearbySitters([cand("a", 45.78, 4.85, 20)], { ...lyon, limit: 0 })).toEqual([]);
  });
});

describe("buildNearbyMention", () => {
  it("renvoie null sans gardien de proximité", () => {
    expect(buildNearbyMention("Lyon", 24, 0)).toBeNull();
  });

  it("accorde les deux nombres au pluriel", () => {
    expect(buildNearbyMention("Lyon", 24, 40)).toBe(
      "24 gardiens habitent Lyon, 40 autres interviennent aussi dans le secteur.",
    );
  });

  it("accorde au singulier", () => {
    expect(buildNearbyMention("Caluire-et-Cuire", 1, 1)).toBe(
      "1 gardien habite Caluire-et-Cuire, 1 autre intervient aussi dans le secteur.",
    );
  });

  it("formule spécifique quand aucun résident", () => {
    expect(buildNearbyMention("Bobigny", 0, 60)).toBe(
      "Aucun gardien n'habite Bobigny, mais 60 interviennent dans le secteur.",
    );
    expect(buildNearbyMention("Bobigny", 0, 1)).toBe(
      "Aucun gardien n'habite Bobigny, mais 1 intervient dans le secteur.",
    );
  });

  it("n'annonce jamais de rayon chiffré", () => {
    expect(buildNearbyMention("Lyon", 3, 5)).not.toMatch(/km/);
  });
});
