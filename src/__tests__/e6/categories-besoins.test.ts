/**
 * Lot E6 (11/10/2026) : catégorie déduite du texte, sans question en plus.
 * Cas tirés des besoins réellement publiés.
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { inferMissionCategory, isMissionCategory } from "@/lib/missionCategories";

describe("E6, catégorie déduite", () => {
  it.each([
    ["Garder ma chienne pendant Noël", "", "animals"],
    ["Nourrir et sortir des chevaux", "entretiens des extérieurs", "animals"],
    ["M'aider a ramasser les légumes de mon potager", "", "garden"],
    ["Arroser mes tomates ce week-end", "", "garden"],
    ["Un coup de main pour transporter des meubles", "", "transport"],
    ["Déplacer un petit meuble colonne", "", "house"],
    ["Une ponçeuse pour le comptoir de ma cuisine", "", "house"],
    ["Aide déménagement", "", "house"],
    ["Faire les courses de la semaine", "", "errand"],
    ["Une partie de belote le jeudi", "", "company"],
    ["Un coup de main pour coudre des rideaux", "", "skills"],
    ["Remplir un formulaire en ligne", "", "skills"],
    ["Un service", "à convenir", "other"],
    ["Besoin d'aide pour mon chat", "si ça marche pour vous, je fais les courses après", "animals"],
    ["Un service", "ça marche pour moi le samedi", "other"],
    ["Promener mon chien", "je vous enverrai des photos", "animals"],
  ])("%s", (title, description, expected) => {
    expect(inferMissionCategory(title, description)).toBe(expected);
  });
  it("toujours une valeur de l'enum", () => {
    expect(isMissionCategory(inferMissionCategory("", ""))).toBe(true);
  });
  it("le formulaire utilise la déduction", () => {
    expect(readFileSync("src/pages/CreateSmallMission.tsx", "utf8")).toContain("inferMissionCategory(title, description)");
  });
});

describe("E6, invitations proches", () => {
  it("lecture limitée au secteur du besoin, repli sans compétence", () => {
    const src = readFileSync("src/components/missions/MatchedHelpersInviteBlock.tsx", "utf8");
    expect(src).toContain('gte("latitude_approx", ownerLat - 0.5)');
    expect(src).toContain("read(false)");
    expect(src).not.toContain("limit(30)");
    expect(src).toContain("ownerLng - 0.75");
    expect(src).toContain("if (sa !== sb) return sa - sb;");
  });
});

describe("E6, rattrapage", () => {
  it("borné, sauvegardé, seulement les lignes encore en other", () => {
    const sql = readFileSync("supabase/prepared-migrations/20261011183000_e6_categories_besoins.sql", "utf8");
    expect(sql).toContain("_backup_mission_category_e6_20261011");
    expect(sql).toContain("WHERE s.id = v.id AND s.category = 'other'");
    expect(sql).toContain("IF v_count <> 11 THEN RAISE EXCEPTION");
    expect(sql).toContain("RAISE NOTICE");
  });
});
