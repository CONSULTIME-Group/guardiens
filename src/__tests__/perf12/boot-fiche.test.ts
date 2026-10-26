/**
 * Lot perf 12 (26/10/2026) : la fiche publique s'affiche sur téléphone avant
 * son code. Constat : LCP mobile de /annonces/:id à 4,3 s au p75 (108 vues,
 * 14 jours) ; sur la sonde mobile ralentie, la photo est prête à 3,0 s mais la
 * fiche ne se peint qu'à 4,6 s, à l'arrivée du code ; et l'apparition en
 * fondu (opacity 0) écartait la photo des candidats LCP.
 */
import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { bootDateLabel, bootHeroPhoto, bootSitHtml, bootUrgencyLabel, buildBootSitModel } from "@/boot/bootSitView";
import { bootSitEligible } from "@/boot/bootSitEntry";
import { HERO_PRELOAD_JS, bootSitTexts } from "../../../scripts/vite-plugin-listings-prefetch.mjs";

const OBJ = "https://erhccyqevdyevpyctsjj.supabase.co/storage/v1/object/public/property-photos/u1/owner-gallery/a.webp";
const DAY = 86400000;

// Même règle que PublicSitDetail (naturalDateLabel, durationDays).
function pageDateLabel(start: string, end: string): string {
  const base = `Du ${format(new Date(start), "d MMMM", { locale: fr })} au ${format(new Date(end), "d MMMM yyyy", { locale: fr })}`;
  const s = new Date(start).getTime();
  const e = new Date(end).getTime();
  const d = e < s ? null : Math.max(1, Math.round((e - s) / DAY) + 1);
  return d ? `${base} · ${d} jour${d > 1 ? "s" : ""}` : base;
}

const sitRow = (over: Record<string, unknown> = {}) => ({
  status: "published", accepting_applications: true, dates_hidden: false, title: "garde de 2chats",
  city: "Lyon", start_date: "2099-12-20", end_date: "2100-01-02", ...over,
});
const data = (sit: Record<string, unknown>, extra: Record<string, unknown> = {}) => ({
  sit: [sit], owner: [{ city: "Écully" }], property: [{ type: "house", photos: [] }], gallery: [{ photo_url: OBJ }], ...extra,
});

describe("perf 12, libellés identiques à la fiche", () => {
  it("dates : même texte que date-fns sur une année de débuts", () => {
    for (let i = 0; i < 400; i += 7) {
      const s = new Date(Date.UTC(2026, 0, 1) + i * DAY).toISOString().slice(0, 10);
      const e = new Date(Date.UTC(2026, 0, 1) + (i + (i % 23)) * DAY).toISOString().slice(0, 10);
      expect(bootDateLabel(s, e)).toBe(pageDateLabel(s, e));
    }
    expect(bootDateLabel(null, "2026-01-01")).toBe("Dates flexibles");
  });

  it("urgence : même règle que la fiche", () => {
    // Même calcul que PublicSitDetail (daysUntilStart, urgencyLabel).
    const page = (start: string, now: number) => {
      const diff = Math.ceil((new Date(start).getTime() - now) / DAY);
      if (diff < 0) return null;
      if (diff === 0) return "Commence aujourd'hui";
      if (diff === 1) return "Commence demain";
      if (diff <= 14) return `Dans ${diff} jours`;
      return null;
    };
    const now = Date.UTC(2026, 9, 26, 12);
    for (let i = -3; i < 20; i++) {
      const s = new Date(now + i * DAY).toISOString().slice(0, 10);
      expect(bootUrgencyLabel(s, now)).toBe(page(s, now));
    }
    expect(bootUrgencyLabel("2026-11-05", now)).toBe("Dans 10 jours");
  });

  it("photo : même choix que le préchargement du HTML", () => {
    const cases: [unknown, unknown][] = [
      [[{ photo_url: OBJ }], []],
      [[{ photo_url: null }], [{ photos: [" ", OBJ.replace("a.webp", "b.webp")] }]],
      [[], [{ photos: [] }]],
    ];
    for (const [g, p] of cases) {
      document.head.querySelectorAll('link[rel="preload"]').forEach((l) => l.remove());
      (window as unknown as Record<string, unknown>).matchMedia = () => ({ matches: false });
      new Function("a", HERO_PRELOAD_JS)([g, p]);
      const link = document.head.querySelector('link[rel="preload"]');
      const photo = bootHeroPhoto(g, p);
      expect(link ? link.getAttribute("href") : null).toBe(photo ? photo.replace("/object/public/", "/render/image/public/") + "?width=768&height=480&quality=75&resize=cover" : null);
    }
  });
});

describe("perf 12, quand le premier affichage s'abstient", () => {
  const now = Date.UTC(2026, 9, 26);
  it("annonce ouverte : titre nettoyé, lieu, dates, type, photo transformée", () => {
    const m = buildBootSitModel(data(sitRow()), now)!;
    expect(m.title).toBe("Garde de 2 chats");
    expect(m.cityLabel).toBe("Lyon");
    expect(m.typeLabel).toBe("Maison");
    expect(m.heroUrl).toContain("/render/image/public/");
    expect(buildBootSitModel(data(sitRow({ city: "" })), now)!.cityLabel).toBe("Écully");
  });
  it("rien pour une annonce close, passée, aux dates masquées, sans photo ou sans lieu", () => {
    expect(buildBootSitModel(data(sitRow({ status: "confirmed" })), now)).toBeNull();
    expect(buildBootSitModel(data(sitRow({ accepting_applications: false })), now)).toBeNull();
    expect(buildBootSitModel(data(sitRow({ dates_hidden: true })), now)).toBeNull();
    expect(buildBootSitModel(data(sitRow({ end_date: "2020-01-01" })), now)).toBeNull();
    expect(buildBootSitModel(data(sitRow(), { gallery: [] }), now)).toBeNull();
    expect(buildBootSitModel(data(sitRow({ city: "" }), { owner: [] }), now)).toBeNull();
    expect(buildBootSitModel({ sit: [] }, now)).toBeNull();
    expect(buildBootSitModel(null, now)).toBeNull();
  });
  it("téléphone seulement, fiche d'annonce seulement", () => {
    expect(bootSitEligible("/annonces/garde-x-1", true)).toBe(true);
    expect(bootSitEligible("/annonces/garde-x-1", false)).toBe(false);
    expect(bootSitEligible("/annonces/international", true)).toBe(false);
    expect(bootSitEligible("/annonces", true)).toBe(false);
  });
});

describe("perf 12, mêmes classes que la fiche et relais", () => {
  const view = readFileSync("src/components/sits/PublicSitView.tsx", "utf8");
  const hero = readFileSync("src/components/sits/views/tabs/SitHero.tsx", "utf8");
  const html = bootSitHtml(buildBootSitModel(data(sitRow()), Date.UTC(2026, 9, 26))!, { badgeStay: "B", share: "Partager", shareAria: "x" });
  it("classes du haut de PublicSitView et du carrousel de SitHero", () => {
    for (const cls of [
      "max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-5 md:py-12",
      "flex items-start gap-3 mb-6 flex-nowrap",
      "inline-block px-4 py-1.5 bg-primary/10 text-primary rounded-full text-[10px] font-bold tracking-widest uppercase",
      "font-heading text-3xl md:text-5xl lg:text-6xl font-bold leading-[1.1] mb-5 md:mb-6 text-foreground",
      "flex flex-wrap items-center gap-x-5 gap-y-2 text-base text-muted-foreground",
    ]) {
      expect(view, cls).toContain(cls);
      expect(html, cls).toContain(cls);
    }
    expect(hero).toContain('className="relative overflow-hidden bg-muted -mx-3"');
    expect(hero).toContain('style={{ minHeight: 240, height: "56vw", maxHeight: 340 }}');
    expect(html).toContain("min-height:240px;height:56vw;max-height:340px");
  });
  it("aucune apparition en fondu sur les fiches (photo candidate LCP)", () => {
    expect(view).not.toMatch(/min-h-screen bg-background text-foreground animate-fade-in/);
    expect(readFileSync("src/pages/SitDetail.tsx", "utf8")).not.toMatch(/max-w-4xl mx-auto animate-fade-in/);
  });
  it("la fiche retire son premier affichage à son premier rendu", () => {
    const page = readFileSync("src/pages/PublicSitDetail.tsx", "utf8");
    expect(page).toMatch(/useLayoutEffect\(\(\) => \{\s*if \(loading\) return;\s*const done = [^;]+__guardiensBootSitDone/);
  });
  it("textes tirés du dictionnaire", () => {
    const dict = JSON.parse(readFileSync("src/i18n/locales/fr/common.json", "utf8"));
    expect(bootSitTexts(dict)).toEqual({ badgeStay: "Garde · Hébergement inclus", share: "Partager", shareAria: "Partager cette annonce" });
  });
  it("code du premier affichage sans « </ » (le HTML le réécrirait)", () => {
    const dir = process.env.P2_BUILD_DIR;
    if (!dir || !existsSync(join(dir, "index.html"))) return;
    const page = readFileSync(join(dir, "index.html"), "utf8");
    const m = page.match(/<script data-boot-listings>([\s\S]*?)<\/script>/);
    expect(m).not.toBeNull();
    expect(() => new Function(m![1])).not.toThrow();
    expect(m![1]).toContain("boot-sit");
    void readdirSync;
  });
});
