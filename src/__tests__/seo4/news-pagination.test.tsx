import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route, useLocation, useNavigate } from "react-router-dom";
import "@/i18n";
import {
  parseNewsPageParam,
  needsNewsPageNormalization,
  newsPageHref,
  newsCanonicalPath,
} from "@/lib/newsPagination";

// Faux client : chaque lecture est résolue par `handler`, contrôlable par test.
type Q = { select: string; eqs: Record<string, unknown>; range?: [number, number]; orders: string[] };
type Res = { data: unknown; count?: number; error: unknown };
let handler: (q: Q) => Promise<Res>;
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: () => {
      const q: Q = { select: "", eqs: {}, orders: [] };
      const b: any = {
        select: (s: string) => ((q.select = s), b),
        eq: (k: string, v: unknown) => ((q.eqs[k] = v), b),
        lte: () => b,
        or: () => b,
        limit: () => b,
        order: (k: string) => (q.orders.push(k), b),
        range: (a: number, z: number) => ((q.range = [a, z]), b),
        then: (ok: any, ko: any) => handler(q).then(ok, ko),
      };
      return b;
    },
  },
}));

import News from "@/pages/News";

const TOTAL = 20;
const art = (i: number, category = "conseil") => ({
  id: `id-${String(i).padStart(3, "0")}`,
  title: `Titre article ${i}`,
  slug: `article-${i}`,
  excerpt: "x",
  cover_image_url: null,
  category,
  tags: [],
  city: null,
  region: null,
  author_name: "A",
  published_at: "2026-01-01T00:00:00Z",
});
const ALL = Array.from({ length: TOTAL }, (_, i) => art(i + 1));

function defaultHandler(q: Q): Promise<Res> {
  if (q.select === "category") return Promise.resolve({ data: [{ category: "conseil" }, { category: "temoignage" }], error: null });
  if (q.eqs.category === "vie_locale") return Promise.resolve({ data: [], error: null });
  const list = q.eqs.category ? ALL.filter((a) => a.category === q.eqs.category) : ALL;
  const [a, z] = q.range!;
  return Promise.resolve({ data: list.slice(a, z + 1), count: list.length, error: null });
}

let loc = "";
let nav: (to: string) => void = () => {};
const Probe = () => {
  const l = useLocation();
  const n = useNavigate();
  loc = l.pathname + l.search;
  nav = n;
  return null;
};

function mount(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Probe />
      <Routes>
        <Route path="/actualites" element={<News />} />
        <Route path="/actualites/page/:page" element={<News />} />
      </Routes>
    </MemoryRouter>,
  );
}

const canonical = () => document.head.querySelector('link[rel="canonical"]')?.getAttribute("href") ?? null;
const statusMeta = () => document.head.querySelector('meta[name="prerender-status-code"]')?.getAttribute("content") ?? null;
const robots = () => document.head.querySelector('meta[name="robots"]')?.getAttribute("content") ?? "";

beforeEach(() => {
  handler = defaultHandler;
  window.scrollTo = vi.fn() as any;
  window.prerenderMetaPending = true;
  (window as any).prerenderReady = false;
});
afterEach(() => {
  document.head.querySelectorAll("[data-head], link[rel=canonical], meta[name=prerender-status-code]").forEach((n) => n.remove());
});

describe("lecture du numéro de page", () => {
  it("entiers sûrs positifs bornés seulement", () => {
    expect(parseNewsPageParam(undefined)).toBe(1);
    expect(parseNewsPageParam("2")).toBe(2);
    expect(parseNewsPageParam("02")).toBe(2);
    for (const bad of ["0", "00", "-1", "1.5", "abc", "", "1e3", "99999999999999999", "10001"]) {
      expect(parseNewsPageParam(bad)).toBeNull();
    }
    expect(needsNewsPageNormalization("02", 2)).toBe(true);
    expect(needsNewsPageNormalization("1", 1)).toBe(true);
    expect(needsNewsPageNormalization("2", 2)).toBe(false);
    expect(newsPageHref(1, "page=3&categorie=conseil&lang=fr")).toBe("/actualites?categorie=conseil&lang=fr");
    expect(newsCanonicalPath(3, true)).toBe("/actualites");
  });
});

describe("verrou de prérendu posé au démarrage (main.tsx)", () => {
  it("liste des actualités verrouillée, articles non", async () => {
    const { readFileSync } = await import("fs");
    const re = new RegExp(readFileSync("src/main.tsx", "utf8").match(/const LATE_META_PATH = \/(.+)\/;/)![1]);
    for (const p of ["/actualites", "/actualites/", "/actualites/page/2", "/gardiens/x", "/projets/x", "/annonces"]) expect(re.test(p), p).toBe(true);
    for (const p of ["/actualites/un-article", "/actualites/inventaire-guardiens-france", "/", "/annonces/une-annonce"]) expect(re.test(p), p).toBe(false);
  });
});

describe("rendu News", () => {
  it("page 1 et page 2 : contenus, liens et canonical distincts", async () => {
    const one = mount("/actualites");
    await screen.findByText("Titre article 1");
    expect(screen.queryByText("Titre article 10")).toBeNull();
    expect(canonical()).toBe("https://guardiens.fr/actualites");
    const nextLink = document.querySelector('a[rel="next"]');
    expect(nextLink?.getAttribute("href")).toBe("/actualites/page/2");
    expect(document.querySelector('a[rel="prev"]')).toBeNull();
    expect(document.querySelector('button[disabled][aria-label]')).not.toBeNull();
    expect((window as any).prerenderReady).toBe(true);
    one.unmount();

    mount("/actualites/page/2");
    await screen.findByText("Titre article 10");
    expect(screen.queryByText("Titre article 1")).toBeNull();
    expect(canonical()).toBe("https://guardiens.fr/actualites/page/2");
    expect(document.title).toMatch(/page 2/);
    expect(document.querySelector('a[rel="prev"]')?.getAttribute("href")).toBe("/actualites");
    expect(document.querySelector('a[rel="next"]')?.getAttribute("href")).toBe("/actualites/page/3");
    expect(document.querySelector('a[aria-current="page"]')?.textContent).toBe("2");
  });

  it("ordre déterministe : published_at puis id", async () => {
    const seen: string[][] = [];
    handler = (q) => (q.range && seen.push(q.orders), defaultHandler(q));
    mount("/actualites/page/2");
    await screen.findByText("Titre article 10");
    expect(seen[0]).toEqual(["published_at", "id"]);
  });

  it("filtre et réinitialisation depuis la page 2 reviennent en page 1", async () => {
    mount("/actualites/page/2?lang=fr");
    await screen.findByText("Titre article 10");
    fireEvent.click(await screen.findByRole("button", { name: /moignage/i }));
    expect(loc).toBe("/actualites?lang=fr&categorie=temoignage");
    await waitFor(() => expect(canonical()).toBe("https://guardiens.fr/actualites"));
    act(() => nav("/actualites/page/2?categorie=conseil&lang=fr"));
    await screen.findByText("Titre article 10");
    // Les liens de pagination filtrés gardent leurs filtres.
    expect(document.querySelector('a[rel="prev"]')?.getAttribute("href")).toBe("/actualites?categorie=conseil&lang=fr");
    fireEvent.click(screen.getAllByRole("button", { name: /initialiser/i })[0]);
    expect(loc).toBe("/actualites?lang=fr");
  });

  it("ancienne adresse ?page=2 remplacée par le chemin, filtres conservés", async () => {
    mount("/actualites?page=2&categorie=conseil&lang=fr");
    await screen.findByText("Titre article 10");
    expect(loc).toBe("/actualites/page/2?categorie=conseil&lang=fr");
  });

  it("/page/1 et zéros initiaux normalisés", async () => {
    const a = mount("/actualites/page/1");
    await screen.findByText("Titre article 1");
    expect(loc).toBe("/actualites");
    a.unmount();
    mount("/actualites/page/02");
    await screen.findByText("Titre article 10");
    expect(loc).toBe("/actualites/page/2");
  });

  it.each(["/actualites/page/abc", "/actualites/page/0", "/actualites/page/9"])("%s : 404 noindex sans canonical", async (path) => {
    mount(path);
    await waitFor(() => expect(statusMeta()).toBe("404"));
    expect(robots()).toMatch(/noindex/);
    expect(canonical()).toBeNull();
  });

  it("plage refusée par la base (PGRST103) : 404, pas 503", async () => {
    handler = (q) => (q.range ? Promise.resolve({ data: null, error: { code: "PGRST103", message: "range" } }) : defaultHandler(q));
    mount("/actualites/page/999");
    await waitFor(() => expect(statusMeta()).toBe("404"));
    expect(canonical()).toBeNull();
  });

  it("panne de lecture : 503 noindex, pas une 404, distincte du vide", async () => {
    handler = (q) => (q.range ? Promise.resolve({ data: null, error: { message: "x" } }) : defaultHandler(q));
    const a = mount("/actualites/page/2");
    await waitFor(() => expect(statusMeta()).toBe("503"));
    expect(robots()).toMatch(/noindex/);
    expect(canonical()).toBeNull();
    expect(screen.getByRole("button", { name: /essayer/i })).toBeTruthy();
    a.unmount();

    handler = (q) => (q.range ? Promise.resolve({ data: [], count: 0, error: null }) : defaultHandler(q));
    mount("/actualites");
    await waitFor(() => expect((window as any).prerenderReady).toBe(true));
    expect(statusMeta()).toBeNull();
    expect(canonical()).toBe("https://guardiens.fr/actualites");
  });

  it("lecture lente : jamais prête avant la liste", async () => {
    vi.useFakeTimers();
    let release!: () => void;
    handler = (q) => (q.range ? new Promise((r) => (release = () => r(defaultHandler(q) as any))) : defaultHandler(q));
    mount("/actualites/page/2");
    await act(async () => { vi.advanceTimersByTime(12000); });
    expect((window as any).prerenderReady).toBe(false);
    expect(window.prerenderMetaPending).toBe(true);
    vi.useRealTimers();
    await act(async () => { release(); });
    await screen.findByText("Titre article 10");
    expect((window as any).prerenderReady).toBe(true);
  });

  it("réponses hors ordre : la page B n'affiche jamais la liste A", async () => {
    const pending: Record<string, () => void> = {};
    handler = (q) =>
      q.range
        ? new Promise((r) => (pending[String(q.range![0])] = () => r(defaultHandler(q) as any)))
        : defaultHandler(q);
    mount("/actualites/page/2");
    await waitFor(() => expect(pending["9"]).toBeDefined());
    act(() => nav("/actualites/page/3"));
    await waitFor(() => expect(pending["18"]).toBeDefined());
    await act(async () => { pending["18"](); });
    await screen.findByText("Titre article 19");
    (window as any).prerenderReady = false;
    await act(async () => { pending["9"](); });
    expect(screen.queryByText("Titre article 10")).toBeNull();
    expect(canonical()).toBe("https://guardiens.fr/actualites/page/3");
    expect((window as any).prerenderReady).toBe(false);
  });
});
