/**
 * Lot BAS1 (16/11/2026) : bas d'écran au téléphone et page des gardiens pour
 * les visiteurs. Verrous :
 *  (a) la liste des gardiens s'affiche quand une lecture d'enrichissement
 *      échoue (la galerie gardien est fermée aux visiteurs) ;
 *  (b) le bandeau cookies publie sa hauteur dans --cookie-banner-h et la
 *      remet à 0px quand il se ferme ;
 *  (c) les éléments fixés en bas d'écran s'adossent à cette variable.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import {
  ENRICHMENT_SOURCES,
  settleEnrichment,
  reportEnrichmentFailures,
} from "@/lib/sitterEnrichment";

const read = (f: string) => readFileSync(resolve(process.cwd(), f), "utf8");

describe("(a) enrichissement des gardiens non bloquant", () => {
  const ok = (data: unknown[]) => ({ data, error: null });
  const ko = { data: null, error: { message: "permission denied for table sitter_gallery", code: "42501" } };

  const results = () => ({
    public_badge_attributions: [ok([{ user_id: "u1", badge_id: "b1" }])],
    public_emergency_sitter_profiles: [ok([{ user_id: "u1", is_active: true }])],
    sitter_gallery: [ko],
    reviews: [ok([{ reviewee_id: "u1", overall_rating: 5 }]), ok([{ reviewee_id: "u2", overall_rating: 4 }])],
    public_responsiveness: [ok([{ user_id: "u2", tier: "fast" }])],
    public_profiles: [ok([{ id: "u1" }])],
  });

  it("une source en erreur est vide, les autres restent lues", () => {
    const { rows, failed } = settleEnrichment(results());
    expect(rows.sitter_gallery).toEqual([]);
    expect(rows.reviews).toHaveLength(2);
    expect(rows.public_badge_attributions).toHaveLength(1);
    expect(rows.public_responsiveness).toEqual([{ user_id: "u2", tier: "fast" }]);
    expect(failed.map((f) => f.source)).toEqual(["sitter_gallery"]);
  });

  it("toutes les sources en erreur donnent des listes vides, jamais une exception", () => {
    const all = Object.fromEntries(ENRICHMENT_SOURCES.map((s) => [s, [ko]])) as any;
    const { rows, failed } = settleEnrichment(all);
    expect(failed).toHaveLength(6);
    for (const s of ENRICHMENT_SOURCES) expect(rows[s]).toEqual([]);
  });

  it("une seule trace par chargement, avec la source en contexte", () => {
    const report = vi.fn();
    const all = { ...results(), reviews: [ko] };
    reportEnrichmentFailures(settleEnrichment(all).failed, report as any);
    expect(report).toHaveBeenCalledTimes(1);
    const [, context, options] = report.mock.calls[0];
    expect(context.source).toBe("sitter_gallery");
    expect(context.sources).toEqual(["sitter_gallery", "reviews"]);
    expect(options.fingerprintKey).toBe("search-owner-enrichment:sitter_gallery,reviews");
  });

  it("aucune trace quand tout est lu", () => {
    const report = vi.fn();
    reportEnrichmentFailures([], report as any);
    expect(report).not.toHaveBeenCalled();
  });

  it("SearchOwner n'abandonne plus la liste sur une erreur d'enrichissement", () => {
    const src = read("src/components/search/SearchOwner.tsx");
    expect(src).not.toContain("Impossible de charger les informations complètes des gardiens.");
    expect(src).not.toContain("enrichError");
    const start = src.indexOf("settleEnrichment({");
    const end = src.indexOf("setRawResults(enrichedAll)");
    expect(start).toBeGreaterThan(0);
    expect(end).toBeGreaterThan(start);
    const block = src.slice(start, end);
    expect(block).toContain("reportEnrichmentFailures(enrichFailed)");
    expect(block).not.toMatch(/setSearchError|return;/);
  });
});

describe("(b) hauteur du bandeau cookies", () => {
  let observed: Array<() => void> = [];
  beforeEach(() => {
    cleanup();
    localStorage.clear();
    observed = [];
    document.documentElement.style.removeProperty("--cookie-banner-h");
    (globalThis as any).ResizeObserver = class {
      cb: () => void;
      constructor(cb: () => void) { this.cb = cb; observed.push(cb); }
      observe() {}
      unobserve() {}
      disconnect() {}
    };
  });

  const renderBanner = async () => {
    const { CookieConsentBanner } = await import("@/components/legal/CookieConsentBanner");
    return render(<MemoryRouter><CookieConsentBanner /></MemoryRouter>);
  };

  it("pose la hauteur à l'ouverture et la remet à 0px à la fermeture", async () => {
    const spy = vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(function (this: HTMLElement) {
      const h = this.getAttribute("data-testid") === "cookie-banner" ? 116 : 0;
      return { x: 0, y: 0, top: 0, left: 0, right: 0, bottom: h, width: 390, height: h, toJSON() {} } as DOMRect;
    });
    await renderBanner();
    const root = document.documentElement;
    expect(root.style.getPropertyValue("--cookie-banner-h")).toBe("116px");
    fireEvent.click(screen.getByRole("button", { name: "Tout refuser" }));
    expect(screen.queryByTestId("cookie-banner")).toBeNull();
    expect(root.style.getPropertyValue("--cookie-banner-h")).toBe("0px");
    spy.mockRestore();
  });

  it("remet 0px au démontage", async () => {
    const { unmount } = await renderBanner();
    unmount();
    expect(document.documentElement.style.getPropertyValue("--cookie-banner-h")).toBe("0px");
  });

  it("passe au-dessus du bouton « Carte » (z-[1200])", () => {
    const src = read("src/components/legal/CookieConsentBanner.tsx");
    expect(src.match(/fixed inset-x-0 bottom-0 z-\[1300\]/g)).toHaveLength(2);
  });
});

describe("(c) éléments du bas d'écran adossés au bandeau", () => {
  it("bouton « Carte », barres de candidature, barre basse et contenu", () => {
    const sitter = read("src/components/search/SearchSitter.tsx");
    expect(sitter.match(/var\(--cookie-banner-h,0px\)/g)?.length).toBeGreaterThanOrEqual(2);
    const publicView = read("src/components/sits/PublicSitView.tsx");
    expect(publicView).not.toContain("fixed bottom-[var(--bottom-nav-h,0px)]");
    expect(publicView.match(/var\(--cookie-banner-h,0px\)/g)).toHaveLength(2);
    expect(read("src/components/sits/SitMobileStickyApply.tsx")).toContain("var(--cookie-banner-h,0px)");
    expect(read("src/components/layout/Navigation.tsx")).toContain("fixed bottom-[var(--cookie-banner-h,0px)]");
    expect(read("src/index.css")).toMatch(/#root\s*\{\s*padding-bottom: var\(--cookie-banner-h, 0px\);/);
  });

  it("/entraide mène à /petites-missions, paramètres gardés", () => {
    const app = read("src/App.tsx");
    expect(app).toContain('<Route path="/entraide" element={<EntraideRedirect />} />');
    expect(app).toContain("`/petites-missions${location.search}${location.hash}`");
  });

  it("aucun tiret cadratin ni demi-cadratin dans les fichiers du lot", () => {
    for (const f of ["src/lib/sitterEnrichment.ts", "src/__tests__/bas1/bas-ecran-et-gardiens.test.tsx"]) {
      expect(read(f)).not.toMatch(/[\u2013\u2014]/);
    }
  });
});
