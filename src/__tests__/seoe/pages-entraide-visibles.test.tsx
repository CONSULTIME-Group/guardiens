/**
 * Lot SEO-E (25/10/2026) : ce que le pré-rendu sert aux robots.
 *  - /petites-missions attend les besoins (ready faux pendant le chargement),
 *    puis sert au moins un lien vers une fiche ;
 *  - page ville : noindex, follow sans besoin sur 90 jours ; douze personnes
 *    au plus dans le rendu initial, prénoms hors des titres ;
 *  - fiche animaux : fil d'Ariane vers la page ville et lien garde.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent, within } from "@testing-library/react";
import { MemoryRouter as Router, type MemoryRouterProps } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import "@/i18n";

const MemoryRouter = (props: MemoryRouterProps) => (
  <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
    <Router {...props} />
  </QueryClientProvider>
);

const db = vi.hoisted(() => ({
  tables: {} as Record<string, any[]>,
  hold: null as null | Promise<void>,
  failing: [] as string[],
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    channel: () => { const c: any = { on: () => c, subscribe: () => c }; return c; },
    removeChannel: () => Promise.resolve(),
    rpc: () => Promise.resolve({ data: [], error: null }),
    auth: { getSession: () => Promise.resolve({ data: { session: null } }), onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => undefined } } }) },
    from: (table: string) => {
      const filters: Array<[string, unknown]> = [];
      const res = async (single: boolean) => {
        if (table === "public_small_missions" && db.hold) await db.hold;
        if (db.failing.includes(table)) return { data: null, error: { message: "relation absente" } };
        let rows = [...(db.tables[table] || [])];
        for (const [k, v] of filters) rows = rows.filter((r) => r[k] === undefined || r[k] === v);
        return single ? { data: rows[0] ?? null, error: null } : { data: rows, count: rows.length, error: null };
      };
      const b: any = new Proxy({}, {
        get: (_t, k: string) => {
          if (k === "then") return (ok: any, ko: any) => res(false).then(ok, ko);
          if (k === "maybeSingle" || k === "single") return () => res(true);
          if (k === "eq") return (col: string, v: unknown) => { filters.push([col, v]); return b; };
          return () => b;
        },
      });
      return b;
    },
  },
}));
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => ({ user: null, isAuthenticated: false }) }));
vi.mock("@/hooks/useAccessLevel", () => ({ useAccessLevel: () => ({ canApplyMissions: false }) }));
vi.mock("@/components/entraide/EntraideProofs", () => ({ default: () => null }));
vi.mock("@/components/missions/MissionBadgesReceived", () => ({ default: () => null }));
vi.mock("@/components/entraide/HelpCounts", () => ({ default: () => null }));
vi.mock("@/components/layout/PublicHeader", () => ({ default: () => null }));
vi.mock("@/components/layout/PublicFooter", () => ({ default: () => null }));
vi.mock("@/components/shared/LazyApproximateLocationMap", () => ({ default: () => null }));
vi.mock("@/lib/analytics", () => ({ trackEvent: () => undefined }));

import EntraideHub from "@/pages/EntraideHub";
import MissionsCityPage, { CITY_HELPERS_PAGE_SIZE } from "@/pages/MissionsCityPage";
import PublicMissionView from "@/components/missions/PublicMissionView";

const robots = () => document.head.querySelector('meta[name="robots"]')?.getAttribute("content") ?? "";
const w = window as any;

const helper = (i: number) => ({
  id: `h${i}`, first_name: `Prenom${i}`, avatar_url: null, city: "Lyon",
  latitude_approx: 45.76 + i * 0.001, longitude_approx: 4.84, helps_with: null, competences: [], last_active_on: null,
});

beforeEach(() => {
  db.tables = {};
  db.hold = null;
  db.failing = [];
  w.prerenderReady = undefined;
  w.prerenderMetaPending = undefined;
});

describe("/petites-missions : le pré-rendu attend les besoins", () => {
  it("ready faux pendant le chargement, puis HTML avec un lien vers une fiche", async () => {
    let release!: () => void;
    db.hold = new Promise<void>((r) => { release = r; });
    db.tables.public_small_missions = [{
      id: "m1", user_id: null, slug: "arroser-le-potager-a-lyon", title: "Arroser le potager", city: "Lyon",
      category: "garden", date_needed: null, end_date: null, latitude: 45.76, longitude: 4.84, photos: ["p.jpg"], status: "open", mission_type: "besoin",
    }];
    const { container } = render(<MemoryRouter initialEntries={["/petites-missions"]}><EntraideHub /></MemoryRouter>);
    await waitFor(() => expect(w.prerenderMetaPending).toBe(true));
    expect(w.prerenderReady).toBe(false);
    expect(container.querySelector('a[href="/petites-missions/arroser-le-potager-a-lyon"]')).toBeNull();

    release();
    await waitFor(() => expect(container.querySelector('a[href="/petites-missions/arroser-le-potager-a-lyon"]')).not.toBeNull());
    await waitFor(() => expect(w.prerenderReady).toBe(true));
    expect(w.prerenderMetaPending).toBe(false);
  });
});

describe("pages villes", () => {
  const renderCity = (slug = "lyon") => render(<MemoryRouter initialEntries={[`/petites-missions/${slug}`]}><MissionsCityPage citySlug={slug} /></MemoryRouter>);

  it("ville sans besoin sur 90 jours : noindex, follow une fois la lecture finie", async () => {
    db.tables.public_entraide_need_activity = [];
    renderCity();
    await waitFor(() => expect(w.prerenderReady).toBe(true));
    expect(robots()).toBe("noindex, follow");
  });

  it("ville avec un besoin récent dans son rayon : index", async () => {
    db.tables.public_entraide_need_activity = [{ latitude: 45.76, longitude: 4.84, created_on: new Date().toISOString().slice(0, 10) }];
    renderCity();
    await waitFor(() => expect(w.prerenderReady).toBe(true));
    expect(robots()).toMatch(/^index/);
  });

  it("vue d'activité illisible : la page reste indexable, comme avant le lot", async () => {
    db.failing = ["public_entraide_need_activity"];
    renderCity();
    await waitFor(() => expect(w.prerenderReady).toBe(true));
    expect(robots()).toMatch(/^index/);
  });

  it("douze personnes au plus dans le rendu initial, prénoms hors des titres, la suite au clic", async () => {
    db.tables.public_entraide_need_activity = [];
    db.tables.public_helpers = Array.from({ length: 30 }, (_, i) => helper(i));
    renderCity();
    fireEvent.click(await screen.findByRole("tab", { name: "Autour de vous" }));
    await waitFor(() => expect(screen.getAllByTestId("helper-name")).toHaveLength(CITY_HELPERS_PAGE_SIZE));
    expect(CITY_HELPERS_PAGE_SIZE).toBe(12);
    const headingTexts = screen.queryAllByRole("heading").map((h) => h.textContent ?? "");
    expect(headingTexts.some((t) => /^Prenom\d+$/.test(t))).toBe(false);
    expect([...document.querySelectorAll("h3")].some((h) => /Prenom/.test(h.textContent ?? ""))).toBe(false);
    fireEvent.click(screen.getByRole("button", { name: "Voir plus" }));
    await waitFor(() => expect(screen.getAllByTestId("helper-name")).toHaveLength(24));
    fireEvent.click(screen.getByRole("button", { name: "Voir plus" }));
    await waitFor(() => expect(screen.getAllByTestId("helper-name")).toHaveLength(30));
    expect(screen.queryByRole("button", { name: "Voir plus" })).toBeNull();
  });
});

describe("fiche d'un besoin", () => {
  const base = {
    id: "m1", slug: "nourrir-mon-chat-a-lyon", title: "Nourrir mon chat pendant le week-end", description: "Deux visites par jour pour nourrir Filou.",
    city: "lyon", postal_code: "69005", latitude: 45.76, longitude: 4.83, category: "animals", status: "open",
    created_at: "2026-10-20T10:00:00Z", mission_type: "besoin",
  };
  const renderView = (mission: any) => render(
    <MemoryRouter>
      <PublicMissionView
        mission={mission}
        author={null}
        catMeta={{ label: "Animaux" }}
        relatedMissions={[]}
        titlecaseCity={(s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : "")}
        timeAgoFr={() => "il y a 5 jours"}
        memberSinceLong={() => null}
        onShare={() => undefined}
      />
    </MemoryRouter>,
  );

  it("fiche animaux dans le rayon de Lyon : fil d'Ariane vers /petites-missions/lyon et lien garde vers /house-sitting/lyon", async () => {
    const { container } = renderView(base);
    const link = await screen.findByTestId("animal-care-link");
    expect(link.getAttribute("href")).toBe("/house-sitting/lyon");
    expect(link.textContent).toBe("Faire garder vos animaux près de Lyon");
    const crumbs = container.querySelector("nav[aria-label]") ?? container;
    expect(within(crumbs as HTMLElement).getAllByRole("link").some((a) => a.getAttribute("href") === "/petites-missions/lyon")).toBe(true);
  });

  it("fiche animaux hors des 14 villes : lien garde seulement si la page ville est publiée, pré-rendu en attente pendant la vérification", async () => {
    db.tables.seo_city_pages = [{ slug: "orleans", published: true }];
    renderView({ ...base, city: "Orléans", latitude: 47.9, longitude: 1.9 });
    const link = await screen.findByTestId("animal-care-link");
    expect(link.getAttribute("href")).toBe("/house-sitting/orleans");
    expect(link.textContent).toBe("Faire garder vos animaux près d'Orléans");
    await waitFor(() => expect(w.prerenderReady).toBe(true));
  });

  it("fiche jardinage : aucun lien garde", async () => {
    renderView({ ...base, category: "garden" });
    await waitFor(() => expect(w.prerenderReady).toBe(true));
    expect(screen.queryByTestId("animal-care-link")).toBeNull();
  });
});
