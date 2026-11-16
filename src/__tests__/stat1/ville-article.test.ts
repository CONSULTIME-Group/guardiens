import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { escapeLike, findCitySlug, pickClosestCity, PARTIAL_CITY_CANDIDATES } from "@/lib/articleCityLookup";

/**
 * Lot STAT1, défaut relevé par Hélène : .ilike("city", `%${ville}%`).maybeSingle()
 * rendait une erreur dès que deux lignes publiées répondaient (Lyon et Monts du
 * Lyonnais, Valence et Saint-Marcel-lès-Valence), et la page ville restait
 * introuvable. La ville exacte passe d'abord, la recherche partielle ensuite.
 */

type Row = { slug: string; city: string; published: boolean };

// ILIKE simulé : % = n'importe quoi, _ = un caractère, \ échappe, casse ignorée.
const likeToRegex = (pattern: string) => {
  let out = "";
  for (let i = 0; i < pattern.length; i++) {
    const c = pattern[i];
    if (c === "\\" && i + 1 < pattern.length) { out += pattern[++i].replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); continue; }
    if (c === "%") out += ".*";
    else if (c === "_") out += ".";
    else out += c.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }
  return new RegExp(`^${out}$`, "i");
};

const fakeClient = (rows: Row[], calls: string[] = []) => ({
  from: () => {
    let list = [...rows];
    let limit = Infinity;
    const q: Record<string, unknown> = {
      select: () => q,
      eq: (col: string, v: unknown) => { list = list.filter((r) => (r as Record<string, unknown>)[col] === v); return q; },
      not: () => q,
      ilike: (_col: string, pattern: string) => { calls.push(pattern); list = list.filter((r) => likeToRegex(pattern).test(r.city)); return q; },
      order: (col: string) => { list.sort((a, b) => String((a as Record<string, unknown>)[col]).localeCompare(String((b as Record<string, unknown>)[col]))); return q; },
      limit: (n: number) => { limit = n; return q; },
      maybeSingle: () => { throw new Error("maybeSingle interdit sur une recherche de ville"); },
      then: (ok: (v: unknown) => unknown) => Promise.resolve({ data: list.slice(0, limit), error: null }).then(ok),
    };
    return q;
  },
});

const PAGES: Row[] = [
  { slug: "monts-du-lyonnais", city: "Monts du Lyonnais", published: true },
  { slug: "lyon", city: "Lyon", published: true },
  { slug: "valence", city: "Valence", published: true },
];
const GUIDES: Row[] = [
  { slug: "saint-marcel-les-valence", city: "Saint-Marcel-lès-Valence", published: true },
  { slug: "valence", city: "Valence", published: true },
  { slug: "monts-du-lyonnais", city: "Monts du Lyonnais", published: true },
  { slug: "lyon", city: "Lyon", published: true },
];

describe("STAT1, rattachement d'un article à sa ville", () => {
  it("préfère la ville exacte à une ville qui la contient (Lyon, Monts du Lyonnais)", async () => {
    const calls: string[] = [];
    expect(await findCitySlug(fakeClient(PAGES, calls), "seo_city_pages", "Lyon")).toBe("lyon");
    expect(calls).toEqual(["Lyon"]); // la recherche partielle n'est pas lancée
  });

  it("ignore la casse et les espaces autour", async () => {
    expect(await findCitySlug(fakeClient(PAGES), "seo_city_pages", "  lyon ")).toBe("lyon");
  });

  it("guides de ville : Valence plutôt que Saint-Marcel-lès-Valence", async () => {
    expect(await findCitySlug(fakeClient(GUIDES), "city_guides", "Valence")).toBe("valence");
  });

  it("sans ville exacte, la recherche partielle prend le nom le plus court", async () => {
    const calls: string[] = [];
    expect(await findCitySlug(fakeClient(GUIDES, calls), "city_guides", "Marcel")).toBe("saint-marcel-les-valence");
    expect(calls).toEqual(["Marcel", "%Marcel%"]);
    expect(
      pickClosestCity([
        { slug: "monts-du-lyonnais", city: "Monts du Lyonnais" },
        { slug: "lyon", city: "Lyon" },
      ])?.slug
    ).toBe("lyon");
  });

  it("rien ne répond : null, sans erreur", async () => {
    expect(await findCitySlug(fakeClient(PAGES), "seo_city_pages", "Trifouilly")).toBeNull();
    expect(await findCitySlug(fakeClient(PAGES), "seo_city_pages", "  ")).toBeNull();
  });

  it("échappe les jokers de LIKE dans le nom de ville", () => {
    expect(escapeLike("100%_ville\\x")).toBe("100\\%\\_ville\\\\x");
    expect(PARTIAL_CITY_CANDIDATES).toBeGreaterThan(1);
  });

  it("ArticleDetail passe par findCitySlug et n'appelle plus maybeSingle sur une ville", () => {
    const src = readFileSync("src/pages/ArticleDetail.tsx", "utf8");
    expect(src).toContain('findCitySlug(supabase, "city_guides", art.city)');
    expect(src).toContain('findCitySlug(supabase, "seo_city_pages", art.city)');
    expect(src).not.toMatch(/ilike\("city", `%\$\{art\.city\}%`\)/);
  });
});
