import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent, act } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import "@/i18n";

type Query = { table: string; columns: string; head: boolean };
type Result = { data: unknown; count?: number; error: unknown };
let read: (q: Query) => Promise<Result>;

vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => ({ user: null, hasSession: false, authChecked: true }) }));
vi.mock("@/hooks/useSubscriptionAccess", () => ({ useSubscriptionAccess: () => ({ hasAccess: false }) }));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: (table: string) => {
      const q: Query = { table, columns: "", head: false };
      const builder: any = new Proxy({}, {
        get: (_target, key: string) => {
          if (["insert", "update", "delete", "upsert"].includes(key)) return () => { throw new Error("Écriture interdite dans ce test public"); };
          if (key === "then") return (ok: any, fail: any) => read(q).then(ok, fail);
          if (key === "select") return (columns: string, options?: { head?: boolean }) => {
            q.columns = columns; q.head = !!options?.head; return builder;
          };
          return () => builder;
        },
      });
      return builder;
    },
  },
}));

import SearchSitter, { type ShownListState } from "@/components/search/SearchSitter";

const fixture = Array.from({ length: 14 }, (_, i) => ({
  id: `public-${i + 1}`, slug: `test-${i + 1}`, title: `Annonce de test ${i + 1}`,
  status: "published", city: "Lyon", country: "FR", user_id: null, property_id: null,
  start_date: "2030-01-01", end_date: "2030-02-01", created_at: "2026-09-01T00:00:00Z",
  accepting_applications: true, property: { type: "house", photos: [] },
}));

const mount = (onChange: (state: ShownListState) => void) => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}><MemoryRouter initialEntries={["/annonces"]}>
    <SearchSitter mode="public" onShownListChange={onChange} />
  </MemoryRouter></QueryClientProvider>);
};

beforeEach(() => {
  read = (q) => Promise.resolve({
    data: q.table === "sits" && !q.head ? fixture : [],
    count: q.table === "sits" ? fixture.length : 0,
    error: null,
  });
});

describe("état produit par le vrai SearchSitter public", () => {
  it("les cartes et les chemins transmis suivent le plafond, puis Voir plus", async () => {
    const states: ShownListState[] = [];
    mount((state) => states.push(state));
    await waitFor(() => expect(states.at(-1)?.items.length).toBe(12));
    const cardPaths = () => Array.from(document.querySelectorAll<HTMLAnchorElement>('a[href^="/annonces/test-"]')).map((a) => a.getAttribute("href"));
    expect(cardPaths()).toEqual(states.at(-1)!.items.map((item) => item.path));
    fireEvent.click(screen.getByRole("button", { name: /Voir plus/i }));
    await waitFor(() => expect(states.at(-1)?.items.length).toBe(14));
    expect(cardPaths()).toEqual(states.at(-1)!.items.map((item) => item.path));
    expect(states.at(-1)!.status).toBe("ready");
  });

  it("une promesse rejetée retire le chargement et transmet une erreur distincte du vide", async () => {
    const rejecters: ((error: Error) => void)[] = [];
    let unavailable = false;
    read = (q) => q.table === "sits" && !q.head
      ? (unavailable
        ? Promise.reject(new Error("Lecture indisponible"))
        : new Promise((_resolve, fail) => { rejecters.push(fail); }))
      : Promise.resolve({ data: [], count: 0, error: null });
    const states: ShownListState[] = [];
    mount((state) => states.push(state));
    await waitFor(() => expect(rejecters.length).toBeGreaterThan(0));
    expect(states.at(-1)).toEqual({ status: "loading", items: [] });
    await act(async () => {
      unavailable = true;
      rejecters.forEach((reject) => reject(new Error("Lecture indisponible")));
    });
    await waitFor(() => expect(states.at(-1)).toEqual({ status: "error", items: [] }));
    expect(screen.getByRole("alert").textContent).toContain("Une erreur est survenue lors de la recherche");
    expect(screen.getByRole("button", { name: /essayer/i })).toBeTruthy();
  });
});
