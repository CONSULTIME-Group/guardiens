import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, waitFor, act } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

/**
 * Lot STAT1, défaut relevé par Hélène : PageMeta recevait ready={!contentStatsLoading}
 * alors que la portée ville (cityPageSlug) n'est connue qu'après la lecture de
 * l'article, des articles liés puis de seo_city_pages. Les clés globales
 * chargées, prerenderReady passait à true avant la demande de la clé ville et
 * Prerender pouvait figer « Aujourd'hui,  gardiens sont inscrits ».
 * Ce test rend ArticleDetail avec une base simulée et suit la valeur de ready.
 */

type Deferred<T> = { promise: Promise<T>; resolve: (v: T) => void; reject: (e: unknown) => void };
const deferred = <T,>(): Deferred<T> => {
  let resolve!: (v: T) => void;
  let reject!: (e: unknown) => void;
  const promise = new Promise<T>((res, rej) => { resolve = res; reject = rej; });
  return { promise, resolve, reject };
};

const state = vi.hoisted(() => ({
  article: null as Record<string, unknown> | null,
  cityPage: null as null | Deferred<{ data: unknown; error: unknown }>,
  cityStats: null as null | Deferred<{ data: unknown; error: unknown }>,
  readyLog: [] as boolean[],
}));

vi.mock("@/integrations/supabase/client", () => {
  const builder = (table: string) => {
    const b: Record<string, unknown> = {};
    for (const m of ["select", "eq", "neq", "in", "not", "ilike", "contains", "limit", "order"]) {
      b[m] = () => b;
    }
    b.maybeSingle = () => {
      if (table === "articles") return Promise.resolve({ data: state.article, error: null });
      if (table === "seo_city_pages") return state.cityPage!.promise;
      return Promise.resolve({ data: null, error: null });
    };
    b.then = (onFulfilled: (v: unknown) => unknown, onRejected?: (e: unknown) => unknown) =>
      Promise.resolve({ data: [], error: null }).then(onFulfilled, onRejected);
    return b;
  };
  return {
    supabase: {
      from: (table: string) => builder(table),
      rpc: (_name: string, args: { p_city_slug?: string }) =>
        args?.p_city_slug
          ? state.cityStats!.promise
          : Promise.resolve({ data: { profils_gardien: 1200, avis_publies: 8 }, error: null }),
    },
  };
});

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: null, isAuthenticated: false }),
}));

vi.mock("@/components/PageMeta", () => ({
  default: (props: { ready?: boolean; title?: string }) => {
    // Seule la page d'article compte (le squelette porte « Chargement »).
    if (!String(props.title ?? "").startsWith("Chargement")) state.readyLog.push(props.ready !== false);
    return null;
  },
}));

vi.mock("@/components/articles/ArticleRenderer", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/components/articles/ArticleRenderer")>();
  return { ...actual, default: () => null };
});

import ArticleDetail from "@/pages/ArticleDetail";

const renderArticle = () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={["/actualites/garde-lyon"]}>
        <Routes>
          <Route path="/actualites/:slug" element={<ArticleDetail />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
};

const baseArticle = {
  id: "a1",
  slug: "garde-lyon",
  title: "Garde de maison à Lyon",
  excerpt: "Résumé",
  content: "{{ville_gardiens}} gardiens à {{ville_nom}}.",
  category: "guide_lieu",
  published: true,
  created_at: "2026-11-01T00:00:00Z",
  updated_at: "2026-11-16T00:00:00Z",
  internal_links: [],
  tags: [],
};

describe("STAT1, ArticleDetail : prerenderReady attend la portée ville", () => {
  beforeEach(() => {
    state.readyLog = [];
    state.cityPage = deferred();
    state.cityStats = deferred();
  });

  it("ready reste faux tant que seo_city_pages n'a pas répondu, puis tant que les stats ville chargent", async () => {
    state.article = { ...baseArticle, city: "Lyon" };
    renderArticle();

    // Article affiché et stats globales chargées : la recherche ville est en cours.
    await waitFor(() => expect(state.readyLog.length).toBeGreaterThan(0));
    await act(async () => { await new Promise((r) => setTimeout(r, 30)); });
    expect(state.readyLog.every((r) => r === false)).toBe(true);

    // seo_city_pages répond : la portée ville part, ready reste faux.
    await act(async () => { state.cityPage!.resolve({ data: { slug: "lyon" }, error: null }); });
    await act(async () => { await new Promise((r) => setTimeout(r, 30)); });
    expect(state.readyLog.every((r) => r === false)).toBe(true);

    // Stats ville chargées : une seule bascule vers vrai.
    await act(async () => {
      state.cityStats!.resolve({ data: { profils_gardien: 1200, ville_gardiens: 42, ville_nom: "Lyon" }, error: null });
    });
    await waitFor(() => expect(state.readyLog.at(-1)).toBe(true));
    const firstTrue = state.readyLog.indexOf(true);
    expect(state.readyLog.slice(firstTrue).every((r) => r === true)).toBe(true);
  });

  it("une ville sans page publiée lève ready après la réponse, sur la portée globale", async () => {
    state.article = { ...baseArticle, city: "Trifouilly" };
    renderArticle();
    await waitFor(() => expect(state.readyLog.length).toBeGreaterThan(0));
    await act(async () => { await new Promise((r) => setTimeout(r, 30)); });
    expect(state.readyLog.every((r) => r === false)).toBe(true);

    await act(async () => { state.cityPage!.resolve({ data: null, error: null }); });
    await waitFor(() => expect(state.readyLog.at(-1)).toBe(true));
  });

  it("une lecture de ville en échec lève ready sans casser l'article", async () => {
    state.article = { ...baseArticle, city: "Lyon" };
    renderArticle();
    await waitFor(() => expect(state.readyLog.length).toBeGreaterThan(0));
    await act(async () => { state.cityPage!.reject(new Error("réseau")); });
    await waitFor(() => expect(state.readyLog.at(-1)).toBe(true));
  });

  it("un article sans ville lève ready dès les stats globales", async () => {
    state.article = { ...baseArticle, city: null };
    renderArticle();
    await waitFor(() => expect(state.readyLog.at(-1)).toBe(true));
  });
});
