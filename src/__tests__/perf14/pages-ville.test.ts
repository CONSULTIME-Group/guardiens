/**
 * Lot perf 14 (26/10/2026) : pages ville /house-sitting/:slug. Constat
 * (mobile, 14 jours) : LCP à 2,9 s au p75 (25 vues), intro peinte 2,7 s après
 * son arrivée et photo demandée 1,75 s trop tard ; 59 des pages publiées
 * servent une photo Wikimedia en original ou en vignette de 3 840 px.
 */
import { afterEach, describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { wikimediaThumb } from "@/lib/wikimediaThumb";
import { takeCityPrefetch } from "@/lib/cityPrefetch";
import { cityPrefetchScript } from "../../../scripts/vite-plugin-listings-prefetch.mjs";

const W = "https://upload.wikimedia.org/wikipedia/commons/";

describe("perf 14, vignette Wikimedia de 960 px", () => {
  it("vignette de 3 840 px ramenée à 960 px", () => {
    expect(wikimediaThumb(`${W}thumb/4/40/Notre_Dame_de_la_Garde.jpg/3840px-Notre_Dame_de_la_Garde.jpg`))
      .toBe(`${W}thumb/4/40/Notre_Dame_de_la_Garde.jpg/960px-Notre_Dame_de_la_Garde.jpg`);
  });
  it("original jpg, JPG ou png servi en vignette", () => {
    expect(wikimediaThumb(`${W}e/ee/Montage-Lyon-2023.jpg`)).toBe(`${W}thumb/e/ee/Montage-Lyon-2023.jpg/960px-Montage-Lyon-2023.jpg`);
    expect(wikimediaThumb(`${W}f/f5/Fontaine_de_la_Rotonde_-_Aix-en-Provence.JPG`)).toContain("/960px-Fontaine_de_la_Rotonde_-_Aix-en-Provence.JPG");
    expect(wikimediaThumb(`${W}9/97/Rouen_mosaique.png`)).toBe(`${W}thumb/9/97/Rouen_mosaique.png/960px-Rouen_mosaique.png`);
  });
  it("jamais agrandie, autres adresses inchangées", () => {
    const svg = "https://upload.wikimedia.org/wikipedia/fr/thumb/3/3e/Logo_Ville_Albi.svg/langfr-960px-Logo_Ville_Albi.svg.png";
    expect(wikimediaThumb(svg)).toBe(svg);
    expect(wikimediaThumb(`${W}thumb/4/40/A.jpg/500px-A.jpg`)).toBe(`${W}thumb/4/40/A.jpg/500px-A.jpg`);
    expect(wikimediaThumb("https://exemple.fr/a.jpg")).toBe("https://exemple.fr/a.jpg");
    expect(wikimediaThumb(`${W}a/ab/Carte.svg`)).toBe(`${W}a/ab/Carte.svg`);
    expect(wikimediaThumb(null)).toBe("");
  });
  it("la page ville sert la vignette en priorité haute, l'original en repli", () => {
    const page = readFileSync("src/pages/CityPage.tsx", "utf8");
    expect(page).toContain("src={wikimediaThumb(dbPage.cover_image_url)}");
    expect(page).toMatch(/img\.src = dbPage\.cover_image_url;/);
    expect(page).toMatch(/loading="eager"\s+fetchPriority="high"/);
  });
});

describe("perf 14, ligne de la page ville lue dès le HTML", () => {
  afterEach(() => { (window as unknown as Record<string, unknown>).__GUARDIENS_CITY__ = undefined; });
  const put = (slot: unknown) => { (window as unknown as Record<string, unknown>).__GUARDIENS_CITY__ = slot; };

  it("reprise une fois, même slug, ligne ou page absente", async () => {
    put({ slug: "lyon", at: Date.now(), p: Promise.resolve({ row: { slug: "lyon" } }) });
    expect(await takeCityPrefetch("lyon")).toEqual({ row: { slug: "lyon" } });
    expect(await takeCityPrefetch("lyon")).toBeUndefined();
    put({ slug: "lyon", at: Date.now(), p: Promise.resolve({ row: null }) });
    expect(await takeCityPrefetch("lyon")).toEqual({ row: null });
  });
  it("rien d'utilisable : autre slug, trop ancien, erreur", async () => {
    put({ slug: "lyon", at: Date.now(), p: Promise.resolve({ row: {} }) });
    expect(await takeCityPrefetch("paris")).toBeUndefined();
    put({ slug: "lyon", at: Date.now() - 120_000, p: Promise.resolve({ row: {} }) });
    expect(await takeCityPrefetch("lyon")).toBeUndefined();
    put({ slug: "lyon", at: Date.now(), p: Promise.resolve(null) });
    expect(await takeCityPrefetch("lyon")).toBeUndefined();
  });
  it("même filtre que CityPage (slug, publiée, une ligne)", () => {
    const s = cityPrefetchScript("https://x.supabase.co", "k");
    expect(s).toContain('seo_city_pages?select=*&slug=eq."+encodeURIComponent(slug)+"&published=eq.true&limit=1');
    expect(() => new Function(s.replace(/^<script[^>]*>/, "").replace(/<\/script>$/, ""))).not.toThrow();
    const page = readFileSync("src/pages/CityPage.tsx", "utf8");
    expect(page).toMatch(/\.from\("seo_city_pages" as any\)\s*\.select\("\*"\)\s*\.eq\("slug", slug\)\s*\.eq\("published", true\)\s*\.maybeSingle\(\)/);
    expect(page).toMatch(/const pre = await takeCityPrefetch\(slug\);\s*if \(pre\) return pre\.row as any;/);
  });
});
