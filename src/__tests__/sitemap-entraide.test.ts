import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { isIndexableEntraideMission } from "../../supabase/functions/sitemap/mission-entries";

describe("sitemap Entraide", () => {
  const routes = readFileSync(resolve(process.cwd(), "src/data/siteRoutes.ts"), "utf8");
  const buildSource = readFileSync(resolve(process.cwd(), "supabase/functions/_shared/sitemap-data.js"), "utf8");
  const description = "Une description publique suffisamment détaillée pour expliquer précisément le besoin, le contexte, le moment souhaité et le service proposé en retour, sans argent. ".repeat(2);

  it("ajoute les quatorze pages villes Entraide", () => {
    for (const city of ["lyon", "marseille", "strasbourg", "paris", "toulouse", "lille", "annecy", "nice", "nantes", "saint-etienne", "rennes", "montpellier", "grenoble", "bordeaux"]) {
      expect(routes).toContain(`path: "/petites-missions/${city}",`);
    }
    expect(buildSource).toContain('isIndexableEntraideMission(m, today)');
    expect(buildSource).toContain('loc: `/petites-missions/${m.slug}`');
  });

  it("retient une fiche ouverte et écarte une fiche fermée", () => {
    expect(isIndexableEntraideMission({ slug: "arroser-un-jardin", description, status: "open", mission_type: "besoin", date_needed: "2027-06-01" }, new Date("2026-09-21T00:00:00Z"))).toBe(true);
    expect(isIndexableEntraideMission({ slug: "mission-fermee", description, status: "completed" })).toBe(false);
  });
});