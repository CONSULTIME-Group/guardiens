/**
 * Lot SEO1 (19/10/2026) : une page département sans ville publiée est en
 * noindex et hors sitemap, jusqu'à sa première ville publiée. Une seule règle
 * (departmentIndexability.js) pour le meta robots et le sitemap.
 */
import { describe, it, expect, vi } from "vitest";
import { render, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import "@/i18n";
import { collectSitemapData } from "../../../supabase/functions/_shared/sitemap-data.js";
import { createSitemapDocument } from "../../../supabase/functions/sitemap/live.js";
import {
  departmentsWithPublishedCity,
  isDepartmentIndexable,
  isPublishedCityRow,
} from "@/lib/departmentIndexability";

const tables = vi.hoisted(() => ({ cities: [] as any[] }));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    channel: () => { const c: any = { on: () => c, subscribe: () => c }; return c; },
    removeChannel: () => Promise.resolve(),
    rpc: () => Promise.resolve({ data: [], error: null }),
    from: (table: string) => {
      const res = (single: boolean) => {
        if (table === "seo_department_pages" && single) {
          return { data: { slug: "lozere", department: "Lozère", h1_title: "Garde en Lozère", intro_text: "Texte", noindex: false, published: true }, error: null };
        }
        if (table === "seo_city_pages") return { data: tables.cities, error: null };
        if (table === "departements" && single) return { data: { code: "48" }, error: null };
        return single ? { data: null, error: null } : { data: [], count: 0, error: null };
      };
      const b: any = new Proxy({}, {
        get: (_t, k: string) => {
          if (k === "then") return (ok: any, ko: any) => Promise.resolve(res(false)).then(ok, ko);
          if (k === "maybeSingle" || k === "single") return () => Promise.resolve(res(true));
          return () => b;
        },
      });
      return b;
    },
  },
}));
vi.mock("@/components/layout/PublicHeader", () => ({ default: () => null }));
vi.mock("@/components/layout/PublicFooter", () => ({ default: () => null }));

import DepartmentPage from "@/pages/DepartmentPage";

describe("règle partagée", () => {
  it("ville publiée : published et slug hors test-*", () => {
    expect(isPublishedCityRow({ department: "Lozère", slug: "mende", published: true })).toBe(true);
    expect(isPublishedCityRow({ department: "Lozère", slug: "test-mende", published: true })).toBe(false);
    expect(isPublishedCityRow({ department: "Lozère", slug: "mende", published: false })).toBe(false);
    expect([...departmentsWithPublishedCity([
      { department: "Rhône", slug: "lyon", published: true },
      { department: "Lozère", slug: "test-x", published: true },
    ])]).toEqual(["Rhône"]);
  });
  it("indexable seulement avec au moins une ville et sans noindex en base", () => {
    expect(isDepartmentIndexable({ noindex: false }, 0)).toBe(false);
    expect(isDepartmentIndexable({ noindex: false }, 1)).toBe(true);
    expect(isDepartmentIndexable({ noindex: true }, 3)).toBe(false);
    expect(isDepartmentIndexable(null, 3)).toBe(false);
  });
});

describe("sitemap : départements sans ville exclus", () => {
  const config = { version: 1, siteUrl: "https://guardiens.fr", staticPages: [{ loc: "/", indexable: true, changefreq: "daily", priority: "1.0" }], cityLandingPages: ["lyon"] };
  const collector = (db: Record<string, any[]>, today: Date) => collectSitemapData({
    today,
    maxUpdatedAtWithCount: () => null,
    fetchOrCache: async (_k: string, _c: object, _p: unknown, fetcher: () => Promise<any[]>, builder: (r: any[]) => any[]) => builder(await fetcher()),
    readAll: async (_s: string, table: string, _cols: string, _key: string, build?: (q: any) => any) => {
      let rows = [...(db[table] || [])];
      const q: any = {
        eq: (k: string, v: unknown) => { rows = rows.filter((r) => r[k] === v); return q; },
        neq: (k: string, v: unknown) => { rows = rows.filter((r) => r[k] !== v); return q; },
        in: (k: string, v: unknown[]) => { rows = rows.filter((r) => v.includes(r[k])); return q; },
        not: (k: string, _o: string, v: unknown) => { rows = rows.filter((r) => r[k] !== v); return q; },
        or: () => { rows = rows.filter((r) => r.noindex !== true); return q; },
      };
      build?.(q);
      return rows;
    },
  });

  it("garde le Rhône (une ville), écarte la Lozère (aucune), puis l'ajoute à sa première ville", async () => {
    const today = new Date("2026-10-19T12:00:00Z");
    const db: Record<string, any[]> = {
      seo_department_pages: [
        { id: "d1", slug: "rhone", department: "Rhône", published: true, noindex: false },
        { id: "d2", slug: "lozere", department: "Lozère", published: true, noindex: false },
      ],
      seo_city_pages: [
        { id: "c1", slug: "villeurbanne", department: "Rhône", published: true, noindex: false },
        { id: "c2", slug: "test-mende", department: "Lozère", published: true, noindex: false },
      ],
    };
    let locs = createSitemapDocument(config, await collector(db, today), today).locs;
    expect(locs).toContain("/departement/rhone");
    expect(locs).not.toContain("/departement/lozere");
    db.seo_city_pages.push({ id: "c3", slug: "mende", department: "Lozère", published: true, noindex: false });
    locs = createSitemapDocument(config, await collector(db, today), today).locs;
    expect(locs).toContain("/departement/lozere");
  });
});

describe("meta robots de la page département", () => {
  const renderPage = () => {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    return render(
      <QueryClientProvider client={qc}>
        <MemoryRouter initialEntries={["/departement/lozere"]}>
          <Routes><Route path="/departement/:slug" element={<DepartmentPage />} /></Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    );
  };
  const robots = () => document.head.querySelector('meta[name="robots"]')?.getAttribute("content") ?? "";

  it("0 ville publiée : noindex, follow", async () => {
    tables.cities = [];
    renderPage();
    await waitFor(() => expect(robots()).toBe("noindex, follow"));
  });

  it("une ville publiée : index", async () => {
    tables.cities = [{ id: "c", city: "Mende", slug: "mende", sitter_count: 1, active_sits_count: 0 }];
    renderPage();
    await waitFor(() => expect(robots()).toMatch(/^index/));
  });
});
