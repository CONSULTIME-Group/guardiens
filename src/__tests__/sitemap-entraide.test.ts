import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { isIndexableEntraideMission } from "../../supabase/functions/sitemap/mission-entries";

describe("sitemap Entraide", () => {
  const source = readFileSync(resolve(process.cwd(), "supabase/functions/sitemap/index.ts"), "utf8");
  const description = "Une description publique suffisamment détaillée pour expliquer précisément le besoin, le contexte, le moment souhaité et le service proposé en retour, sans argent. ".repeat(2);

  it("ajoute la page Entraide de Lyon", () => {
    expect(source).toContain('{ loc: "/petites-missions/lyon", priority: "0.7", changefreq: "weekly" }');
  });

  it("retient une fiche ouverte et écarte une fiche fermée", () => {
    expect(isIndexableEntraideMission({ slug: "arroser-un-jardin", description, status: "open", mission_type: "besoin", date_needed: "2027-06-01" }, new Date("2026-09-21T00:00:00Z"))).toBe(true);
    expect(isIndexableEntraideMission({ slug: "mission-fermee", description, status: "completed" })).toBe(false);
  });
});