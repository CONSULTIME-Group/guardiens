/**
 * Lot perf 4 : premier affichage de /annonces avant le code de la page.
 * Mêmes cartes, mêmes classes, même ordre et mêmes compteurs que la vraie
 * page ; retiré à la première recherche terminée.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => ({ user: null, isAuthenticated: false }) }));
vi.mock("@/hooks/useAffinityWithShadow", () => ({ useAffinityWithShadow: () => ({ full: null, displayed: null }) }));

import SearchListingCard from "@/components/search/listing/SearchListingCard";
import { bootCardHtml, bootFormatDate, bootListingsHtml, buildBootModel, escapeHtml, BOOT_VISIBLE } from "@/boot/bootListingsView";
import { bootEligibleSearch } from "@/boot/bootListingsEntry";
import { resolveSitPlace } from "@/lib/sitSearchRules";
import { bootTexts, listingsPrefetchScript } from "../../../scripts/vite-plugin-listings-prefetch.mjs";
import { readFileSync } from "node:fs";

const TODAY = "2026-10-14";
const owner = (id: string, extra: any = {}) => ({ id, first_name: "Anne", city: "Vialas", postal_code: "48220", departement_code: "48", country: "FR", identity_verified: true, ...extra });
const sit = (id: string, extra: any = {}) => ({
  id, slug: `garde-${id}`, title: `Garde ${id} <b>`, status: "published", user_id: "o1", property_id: `p-${id}`,
  city: "Vialas", country: "FR", departement_code: "48", start_date: "2026-11-03", end_date: "2026-12-20",
  created_at: "2026-10-01T00:00:00Z", accepting_applications: true, cover_photo_url: null,
  property: { type: "house", photos: ["https://x.supabase.co/storage/v1/object/public/property-photos/o1/a.webp"], cover_photo_url: null },
  ...extra,
});
const data = () => ({
  open: [sit("a"), sit("b", { user_id: "o2" }), sit("c", { user_id: "o3", end_date: "2026-01-01" }), sit("d", { user_id: "o4" })],
  closed: [{ id: "z", user_id: "o1", title: "Close", slug: "close", status: "completed", city: "Vialas", country: "FR", departement_code: "48", cover_photo_url: null }],
  owners: [owner("o1"), owner("o2", { identity_verified: false }), owner("o3"), owner("o4", { city: "Québec", country: "CA", departement_code: null, postal_code: null })],
  gallery: [], pets: [{ id: "pt", species: "cat", name: "Mina", property_id: "p-a" }, { id: "pt2", species: "cat", name: "Zou", property_id: "p-a" }],
  reviews: [], badges: [], ownerProfs: [],
});

afterEach(() => cleanup());

describe("modèle du premier affichage (lot perf 4)", () => {
  it("même population et même ordre que SearchSitter, compteurs de l'en-tête", () => {
    const m = buildBootModel(data(), TODAY);
    expect(m.active.map((s) => s.id)).toEqual(["a", "b"]); // c passée, d au Québec (lieu du propriétaire), z terminée
    expect(m.inactiveCount).toBe(2);
    expect(m.openCount).toBe(3); // pays de l'annonce FR, ouvertes (a, b, d)
    expect(m.citiesCount).toBe(1);
    expect(m.intlCount).toBe(1);
  });

  it("dates au format de la vraie carte (date-fns d MMM)", () => {
    for (const d of ["2026-01-05", "2026-02-28", "2026-07-14", "2026-08-01", "2026-12-31"]) {
      expect(bootFormatDate(d)).toBe(format(new Date(d), "d MMM", { locale: fr }));
    }
  });

  it("textes de membre échappés", () => {
    expect(escapeHtml(`<img onerror="x">&'`)).toBe("&lt;img onerror=&quot;x&quot;&gt;&amp;&#39;");
  });
});

describe("parité avec la vraie carte (lot perf 4)", () => {
  it("mêmes classes, même texte, même lien, même photo", () => {
    const m = buildBootModel(data(), TODAY);
    const item = m.active[0];
    const pl = resolveSitPlace(item);
    const decorated = { ...item, locationCity: pl.city, locationCountry: pl.country, locationDept: pl.dept, locationSource: pl.source };
    const { container } = render(<QueryClientProvider client={new QueryClient()}><MemoryRouter initialEntries={["/annonces"]}><SearchListingCard item={decorated} listIndex={0} tab="sits" hasAccess={false} testDemoMode={false} formatDate={(d) => (d ? format(new Date(d), "d MMM", { locale: fr }) : "")} /></MemoryRouter></QueryClientProvider>);
    const boot = document.createElement("div");
    boot.innerHTML = bootCardHtml(item, 0, TODAY);
    const sig = (root: Element) => [...root.querySelectorAll("a, article, div, p, h3, span, img")].map((e) => `${e.tagName}|${(e.getAttribute("class") || "").replace(/\s+/g, " ").trim()}`);
    expect(sig(boot)).toEqual(sig(container));
    expect(boot.textContent).toBe(container.textContent);
    expect(boot.querySelector("a")!.getAttribute("href")).toBe(container.querySelector("a")!.getAttribute("href"));
    expect(boot.querySelector("img")!.getAttribute("src")).toBe(container.querySelector("img")!.getAttribute("src"));
    expect(boot.querySelector("article")!.getAttribute("data-testid")).toBe("search-card-boot");
  });

  it("haut de page : mêmes classes que PublicListings", () => {
    const view = readFileSync("src/boot/bootListingsView.ts", "utf8");
    const page = readFileSync("src/pages/PublicListings.tsx", "utf8");
    const classes = [...view.matchAll(/<(?:section|p|div|nav|a) [^`]*?class="([^"]+)"/g)].map((m) => m[1]).filter((c) => !c.startsWith("boot-") && !c.includes("${"));
    const hero = classes.filter((c) => /max-w-6xl|tracking-widest|font-heading text-3xl|md:flex-row|hidden md:flex|text-primary font-semibold|text-muted-foreground hover|mt-4 md:mt-5|md:hidden mt-4|mt-7 md:mt-10/.test(c));
    expect(hero.length).toBeGreaterThanOrEqual(9);
    for (const c of hero) expect(page, c).toContain(c);
  });

  it("au plus 12 cartes, en-tête de groupe comme la vraie liste", () => {
    const d = data();
    d.open = Array.from({ length: 20 }, (_, i) => sit(`s${i}`));
    const html = bootListingsHtml(buildBootModel(d, TODAY), bootTexts(JSON.parse(readFileSync("src/i18n/locales/fr/common.json", "utf8"))), TODAY);
    const el = document.createElement("div");
    el.innerHTML = html;
    expect(el.querySelectorAll('[data-testid="search-card-boot"]')).toHaveLength(BOOT_VISIBLE);
    expect(el.textContent).toContain("Annonces disponibles (20)");
    expect(el.textContent).toContain("20 annonces ouvertes · France entière · mise à jour quotidienne");
    expect(el.querySelectorAll("h1")).toHaveLength(0);
  });
});

describe("chargement et relais (lot perf 4)", () => {
  beforeEach(() => { (window as any).__GUARDIENS_LISTINGS__ = undefined; });

  it("seulement sans filtre dans l'adresse", () => {
    expect(bootEligibleSearch("")).toBe(true);
    expect(bootEligibleSearch("?perf_lab=1&utm_source=fb&fbclid=x")).toBe(true);
    expect(bootEligibleSearch("?ville=Lyon")).toBe(false);
    expect(bootEligibleSearch("?animaux=chat")).toBe(false);
    expect(bootEligibleSearch("?tri=recent")).toBe(false);
  });

  it("le HTML charge le premier affichage en priorité haute, avant les préchargements", () => {
    const html = listingsPrefetchScript("https://x.supabase.co", "anon", "/assets/boot-listings-abc.js");
    expect(html).toMatch(/"b":"\/assets\/boot-listings-abc\.js"/);
    expect(html).toMatch(/b\.fetchPriority="high"/);
    const cfg = readFileSync("vite.config.ts", "utf8");
    expect(cfg.indexOf("listingsPrefetchPlugin(),")).toBeLessThan(cfg.indexOf("routePreloadPlugin(),"));
  });

  it("la vraie page retire le premier affichage", () => {
    expect(readFileSync("src/components/search/SearchSitter.tsx", "utf8")).toMatch(/if \(!firstSearchSettled \|\| loading\) return;\s*\/\/ Lot perf 4[^\n]*\n\s*endBootListings\(\);/);
    expect(readFileSync("src/pages/PublicListings.tsx", "utf8")).toMatch(/useEffect\(\(\) => \(\) => endBootListings\(\), \[\]\)/);
    expect(readFileSync("src/boot/bootListingsEntry.ts", "utf8")).not.toMatch(/DOMContentLoaded"/);
  });

});
