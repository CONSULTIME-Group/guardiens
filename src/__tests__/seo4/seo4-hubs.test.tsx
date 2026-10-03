import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, act } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import "@/i18n";

// Faux client : `handler(table, calls)` décide de la réponse de chaque lecture.
type Call = [string, unknown[]];
let handler: (table: string, calls: Call[]) => Promise<{ data: unknown; count?: number; error: unknown }>;
const seen: { table: string; calls: Call[] }[] = [];
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: (table: string) => {
      const calls: Call[] = [];
      seen.push({ table, calls });
      const b: any = new Proxy(
        {},
        {
          get: (_t, k: string) => {
            if (k === "then") return (ok: any, ko: any) => handler(table, calls).then(ok, ko);
            if (k === "maybeSingle") return () => handler(table, calls);
            return (...args: unknown[]) => (calls.push([k, args]), b);
          },
        },
      );
      return b;
    },
  },
}));

let push: ((s: any) => void) | undefined;
const settle = (items: { id: string; slug?: string | null; title?: string | null }[]) =>
  push!({ status: "ready", items: items.map((i) => ({ path: `/annonces/${i.slug || i.id}`, title: i.title ?? null })) });
vi.mock("@/components/search/SearchSitter", () => ({
  default: (p: { onShownListChange?: typeof push }) => {
    push = p.onShownListChange;
    return <div>moteur</div>;
  },
}));
vi.mock("@/components/layout/PublicHeader", () => ({ default: () => null }));
vi.mock("@/components/layout/PublicFooter", () => ({ default: () => null }));
vi.mock("@/components/listings/InternationalShowcase", () => ({ default: () => null }));
vi.mock("@/components/listings/PastListingsSection", () => ({ default: () => null }));

import PublicListings from "@/pages/PublicListings";
import GuidesListing from "@/pages/GuidesListing";
import DepartmentSitterLinks, { useDepartmentPublicSitters, sitterLinkLabel } from "@/components/seo/DepartmentSitterLinks";
import DepartmentPage from "@/pages/DepartmentPage";
import { bootState, productionFallback } from "./prerenderBootHarness";

vi.mock("@/hooks/useContentStats", () => ({ useContentStats: () => ({ values: {}, isLoading: false }) }));
vi.mock("@/components/seo/NeighborDepartments", () => ({ default: () => null }));
vi.mock("@/components/associations/DepartmentAssociations", () => ({ default: () => null }));

const wrap = (ui: React.ReactNode, path = "/") => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[path]}>{ui}</MemoryRouter>
    </QueryClientProvider>,
  );
};
const ldTypes = () =>
  [...document.head.querySelectorAll('script[type="application/ld+json"]')].flatMap((s) => {
    const j = JSON.parse(s.textContent || "null");
    return Array.isArray(j) ? j : [j];
  });

beforeEach(() => {
  seen.length = 0;
  push = undefined;
  handler = () => Promise.resolve({ data: [], count: 0, error: null });
  window.prerenderMetaPending = true;
  (window as any).prerenderReady = false;
  document.head.querySelectorAll('script[type="application/ld+json"]').forEach((n) => n.remove());
});
afterEach(() => vi.useRealTimers());

describe("hub /annonces", () => {
  it("prête seulement après la première recherche, ItemList = cartes affichées", async () => {
    wrap(<PublicListings />);
    await screen.findByText("moteur");
    expect((window as any).prerenderReady).toBe(false);
    // Plus aucune lecture séparée de 20 annonces pour la liste JSON-LD.
    expect(seen.some((s) => s.table === "sits" && s.calls.some(([k, a]) => k === "limit" && a[0] === 20))).toBe(false);
    act(() => settle([{ id: "a1", slug: "garde-lyon", title: "Garde à Lyon" }, { id: "b2", slug: null, title: null }]));
    await waitFor(() => expect((window as any).prerenderReady).toBe(true));
    const list = ldTypes().find((j: any) => j?.["@type"] === "ItemList");
    expect(list.numberOfItems).toBe(2);
    expect(list.itemListElement.map((i: any) => i.url)).toEqual([
      "https://guardiens.fr/annonces/garde-lyon",
      "https://guardiens.fr/annonces/b2",
    ]);
  });

  it("liste vide ou en erreur : prête, sans ItemList", async () => {
    wrap(<PublicListings />);
    await screen.findByText("moteur");
    act(() => settle([]));
    await waitFor(() => expect((window as any).prerenderReady).toBe(true));
    expect(ldTypes().some((j: any) => j?.["@type"] === "ItemList")).toBe(false);
  });
});

describe("hub /annonces, état courant", () => {
  it("ItemList suit Voir plus, puis retirée et 503 en panne", async () => {
    wrap(<PublicListings />);
    await screen.findByText("moteur");
    act(() => settle([{ id: "a", slug: "x" }]));
    await waitFor(() => expect(ldTypes().find((j: any) => j?.["@type"] === "ItemList")?.numberOfItems).toBe(1));
    act(() => push!({ status: "loading", items: [] }));
    await waitFor(() => expect(window.prerenderMetaPending).toBe(true));
    act(() => settle([{ id: "a", slug: "x" }, { id: "b", slug: "y" }]));
    await waitFor(() => expect(ldTypes().find((j: any) => j?.["@type"] === "ItemList")?.numberOfItems).toBe(2));
    act(() => push!({ status: "error", items: [] }));
    await waitFor(() => expect(document.head.querySelector('meta[name="prerender-status-code"]')?.getAttribute("content")).toBe("503"));
    expect(ldTypes().some((j: any) => j?.["@type"] === "ItemList")).toBe(false);
    expect(document.head.querySelector('link[rel="canonical"]')).toBeNull();
  });
});

describe("liens gardiens des pages départements", () => {
  it("la vraie page département attend les profils au-delà du repli de dix secondes", async () => {
    let release!: (r: { data: unknown; count?: number; error: unknown }) => void;
    handler = (table) => {
      if (table === "seo_department_pages") return Promise.resolve({ data: { slug: "rhone", department: "Rhône", h1_title: "Gardiens dans le Rhône", intro_text: "Texte public", sitter_count: 2 }, error: null });
      if (table === "departements") return Promise.resolve({ data: { code: "69" }, error: null });
      if (table === "public_profiles") return new Promise((resolve) => { release = resolve; });
      return Promise.resolve({ data: [], error: null });
    };
    Object.assign(window, bootState("/departement/rhone"));
    wrap(<Routes><Route path="/departement/:slug" element={<DepartmentPage />} /></Routes>, "/departement/rhone");
    await waitFor(() => expect(release).toBeDefined());
    vi.useFakeTimers();
    window.setTimeout(productionFallback(), 10000);
    await act(async () => { vi.advanceTimersByTime(12000); });
    expect(window.prerenderReady).toBe(false);
    expect(document.querySelector('a[href="/gardiens/public-test"]')).toBeNull();
    await act(async () => {
      release({ data: [{ id: "public-test", first_name: null, city: "Lyon" }], count: 1, error: null });
      await vi.advanceTimersByTimeAsync(10);
    });
    expect(document.querySelector('a[href="/gardiens/public-test"]')).not.toBeNull();
    expect(window.prerenderReady).toBe(true);
  });
  it("aucune exclusion sur le prénom, repli neutre, jamais d'identifiant", async () => {
    handler = (table) =>
      table === "departements"
        ? Promise.resolve({ data: { code: "69" }, error: null })
        : Promise.resolve({ data: [{ id: "u-1", first_name: null, city: "Lyon" }, { id: "u-2", first_name: "Marie DUPONT", city: null }], count: 2, error: null });
    let res: any;
    const Probe = () => ((res = useDepartmentPublicSitters("Rhône")), null);
    wrap(<Probe />);
    await waitFor(() => expect(res.isLoading).toBe(false));
    const pp = seen.find((s) => s.table === "public_profiles")!;
    expect(pp.calls.some(([k]) => k === "not")).toBe(false);
    expect(pp.calls.some(([k, a]) => k === "eq" && (a[0] === "identity_verified" || a[0] === "profile_completion"))).toBe(false);
    expect(res.total).toBe(2);
    expect(sitterLinkLabel(res.sitters[0])).toBe("Gardien inscrit, Lyon");
    expect(sitterLinkLabel(res.sitters[1])).not.toMatch(/u-2|DUPONT/);
  });

  it("erreur distincte du zéro, lien vers la liste complète toujours présent", { timeout: 10000 }, async () => {
    handler = () => Promise.resolve({ data: null, error: { message: "x" } });
    let res: any;
    const Probe = () => ((res = useDepartmentPublicSitters("Rhône")), null);
    wrap(<Probe />);
    // Une seule nouvelle tentative (retry: 1) avant l'état d'erreur.
    await waitFor(() => expect(res.isLoading).toBe(false), { timeout: 5000 });
    expect(res.isError).toBe(true);

    const a = wrap(<DepartmentSitterLinks deptIn="dans le Rhône" sitters={[]} total={0} isError />);
    expect(screen.getByText(/pas pu être chargée/)).toBeTruthy();
    expect(screen.getByRole("link", { name: /Voir tous les gardiens/ }).getAttribute("href")).toBe("/recherche-gardiens");
    a.unmount();
    wrap(<DepartmentSitterLinks deptIn="dans le Rhône" sitters={[]} total={0} />);
    expect(screen.getByText(/Aucun gardien n'est encore inscrit/)).toBeTruthy();
    expect(screen.getByText(/\(0 inscrits/)).toBeTruthy();
    expect(screen.getByRole("link", { name: /Voir tous les gardiens/ })).toBeTruthy();
  });
});

describe("hub /guides", () => {
  const g = (id: string, city: string, department: string | null) => ({ id, city, slug: city.toLowerCase(), intro: "", ideal_for: "", department, published: true });

  it("lecture lente : le vrai repli attend les liens visibles", async () => {
    let release!: (r: { data: unknown; error: unknown }) => void;
    handler = (table) => table === "city_guides"
      ? new Promise((resolve) => { release = resolve; })
      : Promise.resolve({ data: [], error: null });
    window.prerenderMetaPending = false;
    wrap(<GuidesListing />);
    await waitFor(() => expect(release).toBeDefined());
    vi.useFakeTimers();
    window.setTimeout(productionFallback(), 10000);
    await act(async () => { vi.advanceTimersByTime(12000); });
    expect(window.prerenderReady).toBe(false);
    expect(window.prerenderMetaPending).toBe(true);
    await act(async () => {
      release({ data: [g("2", "Marrakech", null)], error: null });
      await vi.advanceTimersByTimeAsync(10);
    });
    expect(document.querySelector('a[href="/guides/marrakech"]')).not.toBeNull();
    expect(window.prerenderReady).toBe(true);
  });

  it("guide sans département rendu dans un groupe, prête après affichage", async () => {
    handler = (table) =>
      table === "city_guides"
        ? Promise.resolve({ data: [g("1", "Lyon", "Rhône"), g("2", "Marrakech", null)], error: null })
        : Promise.resolve({ data: [], error: null });
    wrap(<GuidesListing />);
    await screen.findByText("Marrakech");
    expect(screen.getByText("Autres destinations")).toBeTruthy();
    expect(document.querySelector('a[href="/guides/marrakech"]')).not.toBeNull();
    expect(document.querySelector('a[href="/guides/lyon"]')).not.toBeNull();
    await waitFor(() => expect((window as any).prerenderReady).toBe(true));
  });

  it("panne de lecture distincte de la liste vide", async () => {
    handler = () => Promise.resolve({ data: null, error: { message: "x" } });
    wrap(<GuidesListing />);
    await screen.findByText(/n'ont pas pu être chargés/);
  });
});
