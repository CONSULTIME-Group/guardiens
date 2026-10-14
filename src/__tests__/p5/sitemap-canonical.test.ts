import { describe, expect, it } from "vitest";
import { isSelfCanonicalArticle } from "../../../supabase/functions/_shared/sitemap-data.js";
import sitemapXml from "../../../public/sitemap.xml?raw";
import sqlSrc from "../../../supabase/prepared-migrations/20261014140000_p5_guide_house_sitting.sql?raw";

describe("lot P5, canoniques et sitemap", () => {
  it("garde un article sans canonique ou canonique de lui-même", () => {
    expect(isSelfCanonicalArticle({ slug: "a", canonical_url: null })).toBe(true);
    expect(isSelfCanonicalArticle({ slug: "a", canonical_url: "https://guardiens.fr/actualites/a/" })).toBe(true);
  });

  it("écarte un article dont la canonique pointe ailleurs", () => {
    expect(isSelfCanonicalArticle({ slug: "a", canonical_url: "https://guardiens.fr/actualites/b" })).toBe(false);
  });

  it("le sitemap publié ne contient plus les quatre doublons d'entraide", () => {
    for (const slug of [
      "reseau-entraide-quartier-lyon-aura",
      "courses-aide-domicile-entraide-senior-lyon",
      "bricolage-montage-meubles-entraide-grenoble-lyon",
      "demenagement-entraide-locale-france",
      "house-sitting-aura-guide-complet",
    ]) {
      expect(sitemapXml).not.toContain(`/actualites/${slug}<`);
    }
  });

  it("l'ancienne adresse AURA redirige vers la canonique nationale", () => {
    expect(sqlSrc).toContain("'house-sitting-aura-guide-complet', 'voyager-gratuitement-france-house-sitting', 301");
  });
});
