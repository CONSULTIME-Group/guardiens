import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { isSensitiveMissionText, visibleToPublic } from "../../../supabase/functions/_shared/missionSensitivity.js";
import { isIndexableEntraideMission } from "../../../supabase/functions/_shared/missionSeo.js";

/**
 * Lot ES-S (16/11/2026) : un besoin qui dit une détresse personnelle ne
 * s'affiche ni aux visiteurs ni aux robots, il reste visible des membres.
 */
describe("ES-S, détection d'une détresse personnelle", () => {
  it.each([
    "Aide pour le ménage, je suis en grosse dépression et viens de perdre mon mari depuis un mois",
    "Je viens de perdre ma femme, besoin d'aide pour les courses",
    "En deuil, quelqu'un pour promener mon chien ?",
    "Sortie d'hospitalisation, besoin d'un coup de main",
    "Traitement contre le cancer, aide au jardin",
    "Je suis en burn-out, besoin d'aide",
    "Veuve depuis peu, aide pour le potager",
    "Chimio en cours, quelqu'un pour les courses",
  ])("repère : %s", (text) => {
    expect(isSensitiveMissionText(text)).toBe(true);
  });

  it.each([
    "Arroser le potager pendant les vacances",
    "Cherche un coup de main pour rempoter deux monsteras",
    "Travailler les ânes, faire les clôtures, distribuer le foin",
    "Garder mon chat pendant mes vacances",
    "Aide pour déménager un canapé",
  ])("laisse passer : %s", (text) => {
    expect(isSensitiveMissionText(text)).toBe(false);
  });

  it("lit le titre et la description ensemble", () => {
    expect(isSensitiveMissionText("Aide pour le ménage", "Je traverse un deuil difficile.")).toBe(true);
    expect(isSensitiveMissionText("", null, undefined)).toBe(false);
  });

  it("garde tout pour un membre connecté, filtre pour un visiteur", () => {
    const need = { title: "Aide pour le ménage, je suis en dépression", description: "" };
    expect(visibleToPublic(need, true)).toBe(true);
    expect(visibleToPublic(need, false)).toBe(false);
    expect(visibleToPublic({ title: "Arroser le potager", description: "" }, false)).toBe(true);
  });

  it("une fiche sensible n'est jamais indexable, même longue et ouverte", () => {
    const base = { status: "open", slug: "aide-menage", mission_type: "besoin", description: "x".repeat(250) };
    expect(isIndexableEntraideMission({ ...base, title: "Arroser le potager" })).toBe(true);
    expect(isIndexableEntraideMission({ ...base, title: "Aide pour le ménage, je suis en dépression" })).toBe(false);
  });
});

describe("ES-S, listes publiques branchées sur le filtre", () => {
  const read = (path: string) => readFileSync(resolve(__dirname, "../../..", path), "utf8");

  it("hub Entraide : filtre selon la connexion", () => {
    expect(read("src/pages/EntraideHub.tsx")).toMatch(/visibleToPublic\(need, isAuthenticated\)/);
  });

  it("pages villes et vitrine de l'accueil : filtre visiteur et description lue", () => {
    const city = read("src/pages/MissionsCityPage.tsx");
    expect(city).toMatch(/visibleToPublic\(row, false\)/);
    expect(city).toMatch(/select\("id, slug, title, description,/);
    const strip = read("src/components/landing/LiveListingsStrip.tsx");
    expect(strip).toMatch(/visibleToPublic\(mission, false\)/);
    expect(strip).toMatch(/select\("id, slug, title, description,/);
  });

  it("sitemap : le titre est lu pour le contrôle", () => {
    expect(read("supabase/functions/_shared/sitemap-data.js")).toMatch(/"id, slug, title, description, status, mission_type/);
  });
});
