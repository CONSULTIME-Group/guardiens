import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

describe("SEO-V1, titres des pages villes", () => {
  it("la migration passe « Home sitter à {ville} » au gabarit garde de maison et d'animaux", () => {
    const sql = readFileSync("drizzle/migrations/0173_seo_villes_titre.sql", "utf8");
    expect(sql).toContain("'Garde de maison et d''animaux à ' || substring(meta_title from '^Home sitter à (.+?) : ')");
    expect(sql).toContain("WHERE meta_title LIKE 'Home sitter à % : %'");
  });
  it("les titres de repli du code suivent le même gabarit", () => {
    const src = readFileSync("src/components/seo/CityPageMeta.tsx", "utf8");
    expect(src).not.toContain("Home sitter à");
    expect(src).toContain('lyon: "Garde de maison et d\'animaux à Lyon"');
  });
});
