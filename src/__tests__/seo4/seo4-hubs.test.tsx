import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, act } from "@testing-library/react";
import { MemoryRouter, Routes, Route, useNavigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import "@/i18n";

// Faux client : `handler(table, calls)` décide de la réponse de chaque lecture.
type Call = [string, unknown[]];
let handler: (table: string, calls: Call[]) => Promise<{ data: unknown; count?: number; error: unknown }>;
const seen: { table: string; calls: Call[] }[] = [];
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    channel: () => { const channel = { on: () => channel, subscribe: () => channel }; return channel; },
    removeChannel: () => Promise.resolve(),
    rpc: (name: string, params: unknown) => handler(`rpc:${name}`, [["params", [params]]]),
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

vi.mock("@/hooks/useAlmaCulturalFact", () => ({ useAlmaCulturalFact: () => undefined }));
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => ({ user: null, hasSession: false, activeRole: null }) }));
vi.mock("@/hooks/useSubscriptionAccess", () => ({ useSubscriptionAccess: () => ({ hasAccess: false }) }));
vi.mock("@/hooks/useAccessLevel", () => ({ useAccessLevel: () => ({ level: "visitor", profileCompletion: 0, canApplyMissions: false }) }));
vi.mock("@/hooks/useCityPageExists", () => ({ useCityPageExists: () => false }));
vi.mock("@/hooks/useDepartmentPageExists", () => ({ useDepartmentPageExists: () => false }));
vi.mock("@/components/sits/ApplicationModal", () => ({ default: () => null }));
import CityHero from "@/components/city/CityHero";
import CitySchemaOrg from "@/components/seo/CitySchemaOrg";
import { CITIES } from "@/data/cities";
import ArticleDetail from "@/pages/ArticleDetail";
import PublicSitDetail from "@/pages/PublicSitDetail";
import SmallMissionDetail from "@/pages/SmallMissionDetail";
import AssociationDetail from "@/pages/AssociationDetail";
import GuideDetail from "@/pages/GuideDetail";
import CityPage from "@/pages/CityPage";
import BreedPage from "@/pages/BreedPage";
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

describe("fil des villes avec grand visuel", () => {
  it.each([undefined, "rhone"])("un seul schema suit les liens visibles, departement %s", (departmentSlug) => {
    const city = CITIES.find(c => c.slug === "lyon")!;
    wrap(<><CitySchemaOrg city={city} stats={{} as any} /><CityHero city="Lyon" h1Title="Garde à Lyon" subtitle="Garde de maison" heroAlt="Lyon" department="Rhône" departmentSlug={departmentSlug} /></>, "/house-sitting/lyon");
    const schemas = [...document.querySelectorAll('script[type="application/ld+json"]')].flatMap(s => { const json = JSON.parse(s.textContent || "null"); return json?.["@graph"] || [json]; }).filter(s => s?.["@type"] === "BreadcrumbList");
    expect(schemas).toHaveLength(1);
    const expected = ["https://guardiens.fr/", ...(departmentSlug ? ["https://guardiens.fr/departement/rhone"] : []), "https://guardiens.fr/house-sitting/lyon"];
    expect(schemas[0].itemListElement.map((i: any) => i.item)).toEqual(expected);
    const nav = document.querySelector('nav')!;
    expect([...nav.querySelectorAll("a")].map(a => `https://guardiens.fr${a.getAttribute("href")}`)).toEqual(expected.slice(0, -1));
  });
});
describe("statuts des vraies pages publiques", () => {
  it.each(["/annonces/inconnue", "/races/dog-inconnue", "/petites-missions/inconnue", "/associations/inconnue", "/guides/inconnue", "/house-sitting/antibes"])("%s attend ses metadonnees meme si le module arrive apres le repli global", (path) => {
    const w = bootState(path);
    window.prerenderMetaPending = w.prerenderMetaPending;
    (window as any).prerenderReady = w.prerenderReady;
    productionFallback()();
    expect((window as any).prerenderReady).toBe(false);
    expect(w.prerenderMetaPending).toBe(true);
  });
  const failures = [
    ["article", "/actualites/inconnu", "/actualites/:slug", <ArticleDetail />, "articles"],
    ["annonce", "/annonces/inconnue", "/annonces/:id", <PublicSitDetail />, "rpc:get_public_sit"],
    ["mission", "/petites-missions/inconnue", "/petites-missions/:id", <SmallMissionDetail />, "public_small_missions"],
    ["race", "/races/dog-inconnue", "/races/:slug", <BreedPage />, "breed_profiles"],
    ["association", "/associations/inconnue", "/associations/:slug", <AssociationDetail />, "public_animal_associations"],
    ["guide", "/guides/inconnue", "/guides/:slug", <GuideDetail />, "city_guides"],
    ["departement", "/departement/inconnu", "/departement/:slug", <DepartmentPage />, "seo_department_pages"],
    ["ville", "/house-sitting/antibes", "/house-sitting/:slug", <CityPage />, "seo_city_pages"],
  ] as const;
  const status = () => document.head.querySelector('meta[name="prerender-status-code"]')?.getAttribute("content");
  it.each(failures)("%s : une panne critique declare 503, sans canonical", async (_name, path, route, page, table) => {
    handler = t => Promise.resolve(t === table ? { data: null, error: { message: "provider unavailable" } } : { data: null, error: null });
    wrap(<Routes><Route path={route} element={page} /></Routes>, path);
    await waitFor(() => expect(status()).toBe("503"));
    expect(document.head.querySelector('link[rel="canonical"]')).toBeNull();
    expect(document.head.querySelector('meta[name="robots"]')?.getAttribute("content")).toContain("noindex");
  });
  it.each(failures)("%s : une absence reelle declare 404, sans canonical", async (_name, path, route, page) => {
    handler = () => Promise.resolve({ data: null, error: null });
    wrap(<Routes><Route path={route} element={page} /></Routes>, path);
    await waitFor(() => expect(status()).toBe("404"));
    expect(document.head.querySelector('link[rel="canonical"]')).toBeNull();
  });
  const Go = ({ target }: { target: string }) => { const navigate = useNavigate(); return <button onClick={() => navigate(target)}>Changer de fiche</button>; };
  it("race : une fiche valide est chargeable apres une 404 sur le meme composant", async () => {
    handler = () => Promise.resolve({ data: [{ species: "dog", breed: "Cane Corso", temperament: "Texte public" }], error: null });
    wrap(<><Go target="/races/dog-cane-corso" /><Routes><Route path="/races/:slug" element={<BreedPage />} /></Routes></>, "/races/espece-invalide");
    await waitFor(() => expect(status()).toBe("404"));
    await act(async () => { screen.getByText("Changer de fiche").click(); });
    await screen.findByText("Texte public");
    await waitFor(() => expect(document.head.querySelector('link[rel="canonical"]')?.getAttribute("href")).toBe("https://guardiens.fr/races/dog-cane-corso"));
    expect(status()).not.toBe("404");
  });
  it("annonce : une ancienne lecture tardive ne remplace pas la nouvelle 404", async () => {
    let resolveOld!: (value: { data: unknown; error: unknown }) => void;
    handler = (t, calls) => t === "rpc:get_public_sit" && (calls[0][1][0] as any).p_param === "ancienne"
      ? new Promise(resolve => { resolveOld = resolve; }) : Promise.resolve({ data: [], error: null });
    wrap(<><Go target="/annonces/nouvelle-absente" /><Routes><Route path="/annonces/:id" element={<PublicSitDetail />} /></Routes></>, "/annonces/ancienne");
    await waitFor(() => expect(resolveOld).toBeDefined());
    await act(async () => { screen.getByText("Changer de fiche").click(); });
    await waitFor(() => expect(status()).toBe("404"));
    await act(async () => { resolveOld({ data: [{ id: "ancien", slug: "ancienne", status: "published", user_id: "proprietaire" }], error: null }); });
    expect(status()).toBe("404"); expect(seen.some(s => s.table === "public_profiles")).toBe(false);
    expect(document.head.querySelector('link[rel="canonical"]')).toBeNull();
  });
  it("mission : une ancienne lecture tardive ne remplace pas la nouvelle 404", async () => {
    let resolveOld!: (value: { data: unknown; error: unknown }) => void;
    handler = (t, calls) => t === "public_small_missions" && calls.some(([name, args]) => name === "eq" && args[1] === "ancienne")
      ? new Promise(resolve => { resolveOld = resolve; }) : Promise.resolve({ data: null, error: null });
    wrap(<><Go target="/petites-missions/nouvelle-absente" /><Routes><Route path="/petites-missions/:id" element={<SmallMissionDetail />} /></Routes></>, "/petites-missions/ancienne");
    await waitFor(() => expect(resolveOld).toBeDefined());
    await act(async () => { screen.getByText("Changer de fiche").click(); });
    await waitFor(() => expect(status()).toBe("404"));
    await act(async () => { resolveOld({ data: { id: "ancien", slug: "ancienne", category: "garden", status: "open" }, error: null }); });
    expect(status()).toBe("404"); expect(document.head.querySelector('link[rel="canonical"]')).toBeNull();
  });
  it.each(["annonce", "mission"])("%s : variante UUID declare 301 et cible propre pour Prerender", async (kind) => {
    const uuid = "11111111-0000-4000-8000-000000000001";
    const prefix = kind === "annonce" ? "/annonces" : "/petites-missions";
    const page = kind === "annonce" ? <PublicSitDetail /> : <SmallMissionDetail />;
    handler = t => Promise.resolve({ data: kind === "annonce" && t === "rpc:get_public_sit"
      ? [{ id: uuid, slug: "adresse-propre", status: "published" }]
      : kind === "mission" && t === "public_small_missions" ? { id: uuid, slug: "adresse-propre", category: "garden", status: "open" } : null, error: null });
    const ua = vi.spyOn(navigator, "userAgent", "get").mockReturnValue("Prerender");
    try {
      wrap(<Routes><Route path={`${prefix}/:id`} element={page} /></Routes>, `${prefix}/${uuid}?utm_source=test`);
      await waitFor(() => expect(status()).toBe("301"));
      expect(document.head.querySelector('meta[name="prerender-header"]')?.getAttribute("content")).toBe(`Location: https://guardiens.fr${prefix}/adresse-propre`);
      expect(document.head.querySelector('link[rel="canonical"]')?.getAttribute("href")).toBe(`https://guardiens.fr${prefix}/adresse-propre`);
    } finally { ua.mockRestore(); }
  });
  it("annonce : un seul fil d’Ariane relie la fiche au hub public", async () => {
    const sit = { id: "11111111-0000-4000-8000-000000000001", slug: "garde-publique", title: "Garde de maison à Lyon", status: "published", city: "Lyon", start_date: "2099-10-01", end_date: "2099-10-10" };
    handler = t => Promise.resolve({ data: t === "rpc:get_public_sit" ? [sit] : [], error: null });
    wrap(<Routes><Route path="/annonces/:id" element={<PublicSitDetail />} /></Routes>, "/annonces/garde-publique");
    await screen.findByRole("heading", { name: "Garde de maison à Lyon" });
    const breadcrumbs = [...document.querySelectorAll('script[type="application/ld+json"]')].map(s => JSON.parse(s.textContent || "null")).filter(j => j?.["@type"] === "BreadcrumbList");
    expect(breadcrumbs).toHaveLength(1);
    expect(breadcrumbs[0].itemListElement[1].item).toBe("https://guardiens.fr/annonces");
    expect(breadcrumbs[0].itemListElement.at(-1).item).toBe("https://guardiens.fr/annonces/garde-publique");
  });
  it("mission : le texte pauvre reste consultable mais noindex comme le sitemap", async () => {
    const mission = { id: "11111111-0000-4000-8000-000000000001", slug: "mission-courte", title: "Arroser les plantes", category: "garden", status: "open", mission_type: "offre", description: "Une presentation encore courte.", photos: [], city: "Lyon", created_at: "2026-10-01" };
    handler = (t, calls) => Promise.resolve({ data: t === "public_small_missions" && calls.some(([name,args]) => name === "eq" && args[0] === "slug") ? mission : [], error: null });
    wrap(<Routes><Route path="/petites-missions/:id" element={<SmallMissionDetail />} /></Routes>, "/petites-missions/mission-courte");
    await screen.findByRole("heading", { name: "Arroser les plantes" });
    await waitFor(() => expect(document.head.querySelector('meta[name="robots"]')?.getAttribute("content")).toContain("noindex"));
    expect(document.head.querySelector('link[rel="canonical"]')?.getAttribute("href")).toBe("https://guardiens.fr/petites-missions/mission-courte");
  });
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

describe("balisage fidele au contenu public", () => {
  const nodes = () => [...document.querySelectorAll('script[type="application/ld+json"]')]
    .flatMap(s => { const j=JSON.parse(s.textContent || "null"); return j?.["@graph"] || (Array.isArray(j) ? j : [j]); });
  it("departement : un seul fil visible et aucun FAQ sans contenu", async () => {
    handler = table => Promise.resolve({ data: table === "seo_department_pages"
      ? { slug: "rhone", department: "Rhône", h1_title: "Gardiens dans le Rhône", intro_text: "Texte public", sitter_count: 0 }
      : [], error: null });
    wrap(<Routes><Route path="/departement/:slug" element={<DepartmentPage />} /></Routes>, "/departement/rhone");
    await screen.findByRole("heading", { level: 1 });
    await waitFor(() => expect(nodes().filter(j => j?.["@type"] === "BreadcrumbList")).toHaveLength(1));
    expect(nodes().some(j => j?.["@type"] === "FAQPage")).toBe(false);
    const trail = nodes().find(j => j?.["@type"] === "BreadcrumbList");
    expect(trail.itemListElement.at(-1).item).toBe("https://guardiens.fr/departement/rhone");
    expect(screen.getByRole("navigation", { name: "Fil d'Ariane" })).toBeDefined();
  });
  it("race : garde le fil et l'article, retire seulement la FAQ invisible", async () => {
    handler = table => Promise.resolve({ data: table === "breed_profiles"
      ? [{ species: "dog", breed: "Cane Corso", temperament: "Texte public de temperament", sitter_tips: "Conseils publics pour la garde" }]
      : [], error: null });
    wrap(<Routes><Route path="/races/:slug" element={<BreedPage />} /></Routes>, "/races/dog-cane-corso");
    await screen.findByRole("heading", { level: 1 });
    await waitFor(() => expect(nodes().some(j => j?.["@type"] === "Article")).toBe(true));
    expect(nodes().filter(j => j?.["@type"] === "BreadcrumbList")).toHaveLength(1);
    expect(nodes().some(j => j?.["@type"] === "FAQPage")).toBe(false);
    expect(screen.getByText("Texte public de temperament")).toBeDefined();
  });
});
