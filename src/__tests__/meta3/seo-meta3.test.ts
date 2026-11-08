import { describe, expect, it } from "vitest";
import { TITLE_MAX, buildAssociationTitle } from "@/lib/seoTitle";
import { MISSIONS_CITIES } from "@/data/missionsCityContent";
import { staticRoutes } from "@/data/siteRoutes";

/** Lot SEO-META3 (08/11/2026) : audit Googlebot du 08/11 à 14 h 15. */
describe("pages ville de l'entraide", () => {
  it("titres à 60 caractères au plus, ville gardée", () => {
    for (const c of Object.values(MISSIONS_CITIES)) {
      expect(c.metaTitle.length).toBeLessThanOrEqual(TITLE_MAX);
      expect(c.metaTitle).toContain(c.cityName);
    }
  });
  it("titres identiques entre le contenu et les routes statiques", () => {
    for (const c of Object.values(MISSIONS_CITIES)) {
      const route = (staticRoutes as Array<{ path: string; title: string }>).find((r) => r.title === c.metaTitle);
      expect(route).toBeDefined();
    }
  });
});

describe("buildAssociationTitle", () => {
  const cases: Array<[string, string, string, string]> = [
    ["1000 Moustaches", "Réseau de familles d'accueil", "La Chevrolière", "Loire-Atlantique"],
    ["Animaux en Péril", "Réseau de familles d'accueil", "Jouques", "Bouches-du-Rhône"],
    ["L'Arche du Val de Sambre", "Réseau de familles d'accueil", "Ferrière-la-Grande", "Nord"],
    ["Canistory", "Réseau de familles d'accueil", "Lampertheim", "Bas-Rhin"],
    ["Chats d'Òc du Castéra", "Réseau de familles d'accueil", "Le Castéra", "Haute-Garonne"],
    ["Cosa Animalia", "Réseau de familles d'accueil", "Grenoble", "Isère"],
    ["Des Cœurs à Sauver", "Réseau de familles d'accueil", "Sevrier", "Haute-Savoie"],
    ["Kitties in Paris", "Réseau de familles d'accueil", "Paris", "Paris"],
    ["L'Hirondelle", "Centre de soins faune sauvage", "Saint-Forgeux", "Rhône"],
  ];
  it("tient en 60 caractères et garde le nom entier", () => {
    for (const [name, type, city, dept] of cases) {
      const t = buildAssociationTitle(name, type, city, dept);
      expect(t.length).toBeLessThanOrEqual(TITLE_MAX);
      expect(t.startsWith(name)).toBe(true);
      expect(t.endsWith(" | Guardiens")).toBe(true);
    }
  });
  it("garde la forme complète quand elle tient", () => {
    expect(buildAssociationTitle("Le Repère", "Sanctuaire", "Champéon", "Mayenne")).toBe(
      "Le Repère : sanctuaire à Champéon (Mayenne) | Guardiens",
    );
  });
  it("préfère la ville au type quand il faut choisir", () => {
    expect(buildAssociationTitle("L'Hirondelle", "Centre de soins faune sauvage", "Saint-Forgeux", "Rhône")).toBe(
      "L'Hirondelle à Saint-Forgeux (Rhône) | Guardiens",
    );
  });
  it("ne répète pas une ville déjà dans le nom, ni un département égal à la ville", () => {
    expect(buildAssociationTitle("Kitties in Paris", "Réseau de familles d'accueil", "Paris", "Paris")).toBe(
      "Kitties in Paris : réseau de familles d'accueil | Guardiens",
    );
  });
});
