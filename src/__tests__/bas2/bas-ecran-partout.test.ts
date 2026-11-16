/**
 * Lot BAS2 (16/11/2026) : mêmes deux règles que BAS1, étendues à tout le site.
 *  Règle 1 : tant que le bandeau cookies est ouvert, chaque élément fixé en
 *  bas d'écran se place au-dessus de lui (var(--cookie-banner-h, 0px), 0px
 *  bandeau fermé).
 *  Règle 2 : une lecture de complément en échec ne fait jamais disparaître
 *  une liste.
 */
import { describe, it, expect, vi, afterEach } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import { settleComplements, reportComplementFailures } from "@/lib/complementReads";
import { bottomReserve } from "@/components/search/SearchMapView";

const root = process.cwd();
const read = (f: string) => readFileSync(resolve(root, f), "utf8");
const VAR = "var(--cookie-banner-h,0px)";

/** Éléments fixés en bas d'écran qui doivent suivre le bandeau. */
const BOTTOM_FIXED = [
  "src/components/search/SearchSitter.tsx",
  "src/components/sits/PublicSitView.tsx",
  "src/components/sits/SitMobileStickyApply.tsx",
  "src/components/layout/Navigation.tsx",
  "src/pages/PublicSitterProfile.tsx",
  "src/components/missions/PublicMissionView.tsx",
  "src/components/seo/StickyCTA.tsx",
  "src/components/analytics/FacebookReferralFeedback.tsx",
  "src/components/ai/alma/AlmaDock.tsx",
  "src/pages/CreateSit.tsx",
  "src/pages/EditSit.tsx",
  "src/components/sits/create/CreateSitExpress.tsx",
  "src/pages/CreateSmallMission.tsx",
  "src/pages/SmallMissionDetail.tsx",
  "src/pages/ApplicationDetail.tsx",
  "src/pages/SortieCreate.tsx",
  "src/pages/HouseGuide.tsx",
  "src/pages/SitterProfile.tsx",
  "src/pages/OwnerProfile.tsx",
  "src/components/profile/sitter/SitterF1Sections.tsx",
  "src/pages/LeaveReview.tsx",
];

/** Primitives et bandeau lui-même, hors règle. */
const EXEMPT = new Set([
  "src/components/legal/CookieConsentBanner.tsx",
  "src/components/ui/drawer.tsx",
  "src/components/ui/toast.tsx",
]);

function tsxFiles(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) {
      if (name === "__tests__" || name === "admin") continue;
      out.push(...tsxFiles(p));
    } else if (p.endsWith(".tsx")) out.push(p);
  }
  return out;
}

describe("règle 1 : rien de fixé en bas d'écran sous le bandeau cookies", () => {
  it.each(BOTTOM_FIXED)("%s utilise la hauteur du bandeau", (file) => {
    expect(read(file)).toContain(VAR);
  });

  it("aucun élément fixé en bas d'écran n'oublie la variable, hors primitives", () => {
    const offenders: string[] = [];
    for (const abs of tsxFiles(resolve(root, "src"))) {
      const rel = abs.slice(root.length + 1);
      if (EXEMPT.has(rel)) continue;
      const lines = readFileSync(abs, "utf8").split("\n");
      lines.forEach((line, i) => {
        // Classe « fixed » puis une position basse dans les trois lignes qui suivent.
        if (!/\bfixed\b/.test(line)) return;
        const block = lines.slice(i, i + 4).join(" ");
        const bottoms = block.match(/(?<![\w-])(?:[a-z]+:)?bottom-[^\s"'`]+/g) ?? [];
        for (const b of bottoms) {
          if (b.startsWith("-")) continue;
          if (!b.includes("--cookie-banner-h")) offenders.push(`${rel}:${i + 1} ${b}`);
        }
      });
    }
    expect(offenders).toEqual([]);
  });

  it("la carte des annonces réserve la hauteur du bandeau, 0 une fois fermé", () => {
    const style = document.documentElement.style;
    style.setProperty("--bottom-nav-h", "0px");
    style.setProperty("--cookie-banner-h", "0px");
    const closedMobile = bottomReserve(true);
    const closedDesktop = bottomReserve(false);
    expect(closedMobile).toBe(88);
    expect(closedDesktop).toBe(16);
    style.setProperty("--cookie-banner-h", "116px");
    expect(bottomReserve(true)).toBe(88 + 116);
    expect(bottomReserve(false)).toBe(16 + 116);
    style.removeProperty("--cookie-banner-h");
    style.removeProperty("--bottom-nav-h");
  });

  it("la carte se remesure quand le bandeau change de hauteur", () => {
    const map = read("src/components/search/SearchMapView.tsx");
    expect(map).toContain("window.addEventListener(COOKIE_BANNER_HEIGHT_EVENT, measure)");
    const banner = read("src/components/legal/CookieConsentBanner.tsx");
    expect(banner).toContain("window.dispatchEvent(new Event(COOKIE_BANNER_HEIGHT_EVENT))");
  });
});

describe("règle 2 : un complément en échec ne vide jamais la liste", () => {
  afterEach(() => vi.restoreAllMocks());

  it("une source en erreur est vide, les autres restent lues", () => {
    const { rows, failed } = settleComplements({
      public_profiles: { data: [{ id: "o1" }], error: null },
      owner_gallery: { data: null, error: { message: "boom" } },
      public_pets: [{ data: [{ id: "p1" }], error: null }, { data: [{ id: "p2" }], error: null }],
      reviews: { data: null, error: { message: "timeout" } },
    });
    expect(rows.public_profiles).toEqual([{ id: "o1" }]);
    expect(rows.owner_gallery).toEqual([]);
    expect(rows.public_pets).toHaveLength(2);
    expect(rows.reviews).toEqual([]);
    expect(failed.map((f) => f.source)).toEqual(["owner_gallery", "reviews"]);
  });

  it("une trace par chargement avec la source, aucune quand tout est lu", () => {
    const report = vi.fn();
    reportComplementFailures("SearchSitter", [], report as any);
    expect(report).not.toHaveBeenCalled();
    const { failed } = settleComplements({
      public_pets: { error: { message: "x" } },
      reviews: { error: { message: "y" } },
    });
    reportComplementFailures("SearchSitter", failed, report as any);
    expect(report).toHaveBeenCalledTimes(1);
    const [, ctx, opts] = report.mock.calls[0];
    expect(ctx.source).toBe("public_pets");
    expect(ctx.sources).toEqual(["public_pets", "reviews"]);
    expect(opts.fingerprintKey).toBe("SearchSitter-complements:public_pets,reviews");
  });

  it("la recherche d'annonces n'abandonne la liste que sur la lecture des annonces", () => {
    const src = read("src/components/search/SearchSitter.tsx");
    for (const gone of [
      "Impossible de charger les informations des propriétaires.",
      "Impossible de charger les animaux.",
      "Impossible de charger les avis.",
      "Impossible de charger les badges.",
      "Impossible de charger les profils propriétaires.",
    ]) {
      expect(src).not.toContain(gone);
    }
    expect(src).toContain('return { ...empty, error: "Impossible de charger les annonces." };');
    const start = src.indexOf("settleComplements({\n     public_profiles: ownersRes");
    const end = src.indexOf("petsRows: comp.public_pets");
    expect(start).toBeGreaterThan(0);
    expect(end).toBeGreaterThan(start);
    const block = src.slice(start, end);
    expect(block).toContain('reportComplementFailures("SearchSitter", compFailed)');
    expect(block).not.toMatch(/return \{ \.\.\.empty, error/);
    expect(src).toContain('reportComplementFailures("SearchSitter missions", missionCompFailed)');
  });

  it("aucun tiret cadratin ni demi-cadratin dans les fichiers du lot", () => {
    for (const f of [
      "src/lib/complementReads.ts",
      "src/lib/cookieBannerHeight.ts",
      "src/__tests__/bas2/bas-ecran-partout.test.ts",
    ]) {
      expect(read(f)).not.toMatch(/[\u2013\u2014]/);
    }
  });
});
