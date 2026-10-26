/**
 * Lot perf 11 (26/10/2026) : photo principale de la fiche publique demandée
 * dès les lectures du HTML. Constat (mesure réelle, 14 jours, mobile) :
 * LCP de /annonces/:id à 4,3 s au p75 sur 108 vues, élément = photo
 * principale, demandée 1,9 s trop tard puis peinte 2,6 s après son arrivée ;
 * sonde mobile ralentie du 26/10 : 6,7 s en médiane.
 */
import { afterEach, describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { HERO_PRELOAD_JS, sitPrefetchScript } from "../../../scripts/vite-plugin-listings-prefetch.mjs";
import { storageImageUrl } from "@/lib/storageImage";

const OBJ = "https://erhccyqevdyevpyctsjj.supabase.co/storage/v1/object/public/property-photos/u1/owner-gallery/a.webp";

function run(a: unknown, desktop = false): string | null {
  document.head.querySelectorAll('link[rel="preload"]').forEach((l) => l.remove());
  const w = window as unknown as Record<string, unknown>;
  w.__GUARDIENS_SIT_HERO__ = undefined;
  w.matchMedia = (q: string) => ({ matches: desktop && q === "(min-width: 768px)" });
  new Function("a", HERO_PRELOAD_JS)(a);
  const link = document.head.querySelector('link[rel="preload"][as="image"]') as HTMLLinkElement | null;
  return link ? link.getAttribute("href") : null;
}

afterEach(() => { document.head.querySelectorAll('link[rel="preload"]').forEach((l) => l.remove()); });

describe("perf 11, photo principale préchargée", () => {
  it("même adresse que SitHero sur téléphone et sur ordinateur", () => {
    expect(run([[{ photo_url: OBJ }], []])).toBe(storageImageUrl(OBJ, { width: 768, height: 480 }));
    expect(run([[{ photo_url: OBJ }], []], true)).toBe(storageImageUrl(OBJ, { width: 704, height: 640 }));
    const link = document.head.querySelector('link[rel="preload"]')!;
    expect(link.getAttribute("fetchpriority")).toBe("high");
  });

  it("même choix de photo que PublicSitDetail : galerie d'abord, sinon photos du logement, première non vide", () => {
    const other = OBJ.replace("a.webp", "b.webp");
    expect(run([[{ photo_url: null }, { photo_url: other }], [{ photos: [OBJ] }]])).toContain("b.webp");
    expect(run([[], [{ photos: ["  ", OBJ] }]])).toContain("a.webp");
    expect(run([[{ photo_url: "  " }], [{ photos: [other] }]])).toBeNull();
  });

  it("rien hors stockage public ou pour une adresse déjà paramétrée", () => {
    expect(run([[{ photo_url: "https://exemple.fr/a.jpg" }], []])).toBeNull();
    expect(run([[{ photo_url: OBJ + "?v=2" }], []])).toBeNull();
    expect(run([[], []])).toBeNull();
    expect(run([null, null])).toBeNull();
  });

  it("branché dans le script du HTML, sur les lectures galerie et logement", () => {
    const s = sitPrefetchScript("https://x.supabase.co", "anon");
    expect(s).toContain("Promise.all([ps[C.g],ps[C.pr]])");
    expect(s).toContain('"g":');
    expect(s).toContain('"pr":');
    expect(s).toContain('l.rel="preload"');
  });

  it("SitHero : seule la variante visible se charge en priorité haute", () => {
    const hero = readFileSync("src/components/sits/views/tabs/SitHero.tsx", "utf8");
    expect(hero).toContain('loading={desktop ? "lazy" : "eager"}');
    expect(hero).toContain('loading={desktop ? "eager" : "lazy"}');
    expect(hero).toMatch(/useState\(heroIsDesktop\)/);
  });
});
