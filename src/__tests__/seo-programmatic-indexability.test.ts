import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const read = (p: string) => readFileSync(resolve(process.cwd(), p), "utf8");

// Garde-fou d'indexation des pages programmatiques (villes et départements).
// Règle métier (recalcul quotidien côté base) :
//   noindex si sitter_count = 0, dans les deux sens, et pour les villes
//   aussi si le contenu propre fait moins de 1 000 caractères.
// Ces tests verrouillent la cohérence des consommateurs : rendu, sitemap
// statique, sitemap edge et régénération du cache prerendu.
describe("pages programmatiques : cohérence du garde-fou noindex", () => {
  it("la page département transmet le flag noindex à PageMeta", () => {
    const src = read("src/pages/DepartmentPage.tsx");
    expect(src).toContain("noindex={page.noindex === true}");
  });

  it("le sitemap statique exclut les pages ville et département en noindex", () => {
    const src = read("scripts/generate-sitemap.mjs");
    const cityFetch = src.match(/from\("seo_city_pages"\)[^;]*;/);
    const deptFetch = src.match(/from\("seo_department_pages"\)[^;]*;/);
    expect(cityFetch?.[0]).toContain("noindex.is.null,noindex.eq.false");
    expect(deptFetch?.[0]).toContain("noindex.is.null,noindex.eq.false");
  });

  it("les têtes de cache du sitemap ne filtrent pas sur noindex", () => {
    // Une bascule noindex sort la ligne de l'ensemble indexable : si la tête
    // de cache était filtrée, elle pourrait ne pas bouger et le cache
    // servirait des entrées périmées.
    const src = read("scripts/generate-sitemap.mjs");
    const heads = src.match(/maxUpdatedAt\("seo_(city|department)_pages"[^)]*\)/g) ?? [];
    expect(heads.length).toBe(2);
    for (const h of heads) {
      expect(h).not.toContain("noindex");
    }
  });

  it("le sitemap edge exclut les pages ville et département en noindex", () => {
    const src = read("supabase/functions/sitemap/index.ts");
    const cityFetch = src.match(/from\("seo_city_pages"\)[\s\S]*?order\("city"\)/);
    const deptFetch = src.match(/from\("seo_department_pages"\)[\s\S]*?order\("department"\)/);
    expect(cityFetch?.[0]).toContain("noindex.is.null,noindex.eq.false");
    expect(deptFetch?.[0]).toContain("noindex.is.null,noindex.eq.false");
  });

  it("le consommateur seo_dirty_at couvre les pages département", () => {
    const src = read("supabase/functions/prerender-recache-pending/index.ts");
    expect(src).toContain('sb.from("seo_department_pages")');
    expect(src).toContain("seo_department_pages: []");
    expect(src).toContain("/departement/");
  });
});
