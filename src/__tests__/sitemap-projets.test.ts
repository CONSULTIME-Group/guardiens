import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { isIndexableEntraideMission, isIndexableProjetMission } from "../../supabase/functions/sitemap/mission-entries";
import { projetMetaLine } from "@/lib/projets";

const read = (p: string) => readFileSync(resolve(process.cwd(), p), "utf8");
const now = new Date("2026-10-02T09:00:00Z");
const description = "Chantier de plantation ouvert à tous, accueil le matin et l'après-midi, informations pratiques et lieu précisés dans l'annonce pour que chacun sache où venir et quoi apporter. ".repeat(2);
const base = { slug: "plantons-ensemble", description, status: "open", category: "projet", date_needed: "2026-11-14", end_date: "2026-11-14" };

describe("sitemap projets participatifs", () => {
  it("retient une fiche projet publique, ouverte, détaillée et à venir", () => {
    expect(isIndexableProjetMission(base, now)).toBe(true);
  });

  it("écarte fermée, passée, trop pauvre, sans slug ou d'une autre catégorie", () => {
    expect(isIndexableProjetMission({ ...base, status: "completed" }, now)).toBe(false);
    expect(isIndexableProjetMission({ ...base, date_needed: "2026-09-01", end_date: "2026-09-01" }, now)).toBe(false);
    expect(isIndexableProjetMission({ ...base, description: "Trop court." }, now)).toBe(false);
    expect(isIndexableProjetMission({ ...base, slug: null }, now)).toBe(false);
    expect(isIndexableProjetMission({ ...base, category: "garden" }, now)).toBe(false);
  });

  it("une offre projet n'échappe pas à l'expiration", () => {
    expect(isIndexableProjetMission({ ...base, mission_type: "offre", date_needed: "2026-09-01", end_date: "2026-09-01" }, now)).toBe(false);
  });

  it("build et fonction : /projets/{slug} sur la vue publique, jamais d'ancienne URL entraide", () => {
    const build = read("scripts/generate-sitemap.mjs");
    for (const src of [build]) {
      expect(src).toContain("isIndexableProjetMission");
      expect(src).toMatch(/\/projets\/\$\{\w+\.slug\}/);
      expect(src).toContain('.neq("category", "projet")');
    }
    // La fonction sitemap ne relaie plus que le fichier statique (SEO-3).
    expect(read("supabase/functions/sitemap/index.ts")).not.toContain("createClient");
    expect(read("src/data/siteRoutes.ts")).toContain('path: "/projets",');
    // Clé d'invalidation nulle : rechargement à chaque build.
    expect(build).toMatch(/"small_missions_projets_v1", cache,\s*null,/);
  });

  it("la fiche projet applique la même règle à sa balise robots", () => {
    expect(read("src/pages/ProjetDetail.tsx")).toContain("noindex={!isIndexableProjetMission(projet)}");
    expect(isIndexableEntraideMission({ ...base, mission_type: "besoin" }, now)).toBe(true);
  });

  it("une carte projet lit le jour exact quand il est connu", () => {
    expect(projetMetaLine("2026-11-14", "2026-11-14")).toBe("Samedi 14 novembre 2026");
    expect(projetMetaLine("2026-11-14", "2026-12-02")).toBe("Novembre à décembre");
  });
});
