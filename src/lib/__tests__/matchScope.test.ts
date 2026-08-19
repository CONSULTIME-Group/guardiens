/**
 * Élargissement progressif du pool d'annonces du tableau de bord gardien
 * (audit du 19/08/2026) : département, 100 km, 200 km, France entière,
 * arrêt au premier palier non vide. Verrouille les scénarios réels de
 * l'inventaire (Lyon, Brest) et le repli national des gardiens sans
 * coordonnées.
 */
import { describe, it, expect } from "vitest";
import {
  pickProgressiveScope,
  orderByAffinity,
  scopeSubtitle,
} from "../matchScope";

interface FakeSit {
  id: string;
  dept: string | null;
  lat: number | null;
  lng: number | null;
}

const sit = (
  id: string,
  dept: string | null,
  lat: number | null = null,
  lng: number | null = null,
): FakeSit => ({ id, dept, lat, lng });

const pick = (
  sits: FakeSit[],
  sitterDept: string | null,
  sitterCoords: { lat: number; lng: number } | null,
) =>
  pickProgressiveScope({
    sits,
    sitterDept,
    sitterCoords,
    getDept: (s: FakeSit) => s.dept,
    getCoords: (s: FakeSit) =>
      s.lat != null && s.lng != null ? { lat: s.lat, lng: s.lng } : null,
  });

describe("pickProgressiveScope — paliers successifs", () => {
  it("le département gagne même si une annonce plus proche existe ailleurs", () => {
    const sits = [
      sit("loin-dept", "69", 50.0, 5.0),
      sit("proche-autre-dept", "38", 45.1, 5.0),
    ];
    const { scoped, scope } = pick(sits, "69", { lat: 45.0, lng: 5.0 });
    expect(scope).toBe("dept");
    expect(scoped.map((s) => s.id)).toEqual(["loin-dept"]);
  });

  it("élargit à 100 km quand le département est vide", () => {
    const sits = [sit("a-55km", "38", 45.5, 5.0), sit("b-167km", "01", 46.5, 5.0)];
    const { scoped, scope } = pick(sits, "69", { lat: 45.0, lng: 5.0 });
    expect(scope).toBe("km100");
    expect(scoped.map((s) => s.id)).toEqual(["a-55km"]);
  });

  it("élargit à 200 km quand rien n'est à moins de 100 km", () => {
    const sits = [sit("a-167km", "38", 46.5, 5.0), sit("b-334km", "75", 48.0, 5.0)];
    const { scoped, scope } = pick(sits, "69", { lat: 45.0, lng: 5.0 });
    expect(scope).toBe("km200");
    expect(scoped.map((s) => s.id)).toEqual(["a-167km"]);
  });

  it("tombe au palier national quand rien n'est à moins de 200 km", () => {
    const sits = [sit("loin", "75", 48.85, 2.35), sit("sans-coords", "13")];
    const { scoped, scope } = pick(sits, "29", { lat: 48.39, lng: -4.49 });
    expect(scope).toBe("country");
    expect(scoped).toHaveLength(2);
  });

  it("un gardien sans coordonnées saute les paliers de distance", () => {
    const sits = [sit("proche", "38", 45.1, 5.0)];
    const { scoped, scope } = pick(sits, "69", null);
    expect(scope).toBe("country");
    expect(scoped).toHaveLength(1);
  });

  it("un gardien sans coordonnées conserve le palier département", () => {
    const sits = [sit("meme-dept", "69", 45.1, 5.0), sit("autre", "38", 45.2, 5.0)];
    const { scoped, scope } = pick(sits, "69", null);
    expect(scope).toBe("dept");
    expect(scoped.map((s) => s.id)).toEqual(["meme-dept"]);
  });

  it("une annonce sans coordonnées n'entre pas dans les paliers de distance", () => {
    const sits = [sit("sans-coords", "38")];
    const { scoped, scope } = pick(sits, "69", { lat: 45.0, lng: 5.0 });
    expect(scope).toBe("country");
    expect(scoped).toHaveLength(1);
  });

  it("aucune annonce : palier vide explicite", () => {
    const { scoped, scope } = pick([], "69", { lat: 45.0, lng: 5.0 });
    expect(scope).toBe("none");
    expect(scoped).toHaveLength(0);
  });
});

describe("pickProgressiveScope — inventaire réel du 19/08/2026", () => {
  // Annonces publiées réelles (coordonnées propriétaires arrondies, issues de
  // public_profiles). Fixture figée : elle teste la logique, pas les données.
  const REAL: FakeSit[] = [
    sit("blauzac", "30", 43.97, 4.38),
    sit("saint-pierre", "974", -21.31, 55.49),
    sit("cezy", "89", 48.0, 3.31),
    sit("sarry", "71", 46.31, 4.12),
    sit("cogny", "69", 45.99, 4.61),
    sit("upaix", "05", 44.32, 5.89),
    sit("chassenard", "03", 46.44, 3.97),
    sit("sonchamp", "78", 48.59, 1.88),
    sit("gex", "01", 46.34, 6.07),
    sit("belley", "01", 45.75, 5.69),
    sit("speracedes", "06", 43.63, 6.88),
  ];

  it("un gardien lyonnais reste au palier département avec Cogny", () => {
    const { scoped, scope } = pick(REAL, "69", { lat: 45.76, lng: 4.84 });
    expect(scope).toBe("dept");
    expect(scoped.map((s) => s.id)).toEqual(["cogny"]);
  });

  it("un gardien brestois tombe au palier national, les 11 annonces restent visibles", () => {
    const { scoped, scope } = pick(REAL, "29", { lat: 48.39, lng: -4.49 });
    expect(scope).toBe("country");
    expect(scoped).toHaveLength(11);
  });
});

describe("orderByAffinity — tri du palier national", () => {
  it("score décroissant, non scorées en fin, ordre stable à score égal", () => {
    const cards = [sit("a", null), sit("b", null), sit("c", null), sit("d", null)];
    const scores = new Map([
      ["b", 62],
      ["d", 80],
    ]);
    const ordered = orderByAffinity(cards, scores).map((c) => c.id);
    expect(ordered).toEqual(["d", "b", "a", "c"]);
  });
});

describe("scopeSubtitle — sous-titre honnête", () => {
  it("nomme chaque palier sans promettre une distance mensongère", () => {
    expect(scopeSubtitle("dept")).toBe("Dans votre département, en ce moment.");
    expect(scopeSubtitle("km100")).toBe("À moins de 100 km de chez vous.");
    expect(scopeSubtitle("km200")).toBe("À moins de 200 km de chez vous.");
    expect(scopeSubtitle("country")).toBe("Partout en France, les plus proches de votre profil.");
  });
});
