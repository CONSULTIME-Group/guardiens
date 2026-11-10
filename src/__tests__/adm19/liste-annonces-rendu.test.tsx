/**
 * Lot ADM19 : rendu réel de la liste des annonces, une ligne en ligne depuis
 * trois jours, sans candidature, avec des messages échangés.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";

const DAY = 86_400_000;
const iso = (offsetDays: number) => new Date(Date.now() + offsetDays * DAY).toISOString();
const ymd = (offsetDays: number) => iso(offsetDays).slice(0, 10);

const { rows, stats } = vi.hoisted(() => ({
  rows: { sits: [] as Array<Record<string, unknown>> },
  stats: [] as Array<Record<string, unknown>>,
}));

vi.mock("@/integrations/supabase/client", () => {
  const chain = (table: string): Record<string, unknown> => new Proxy({}, {
    get: (_t, k: string) => {
      if (k === "then") {
        return (ok: (v: unknown) => unknown) =>
          Promise.resolve({ data: table === "sits" ? rows.sits : [], error: null, count: table === "sits" ? rows.sits.length : 0 }).then(ok);
      }
      return () => chain(table);
    },
  });
  return {
    supabase: {
      from: (table: string) => chain(table),
      rpc: (name: string) => Promise.resolve({ data: name === "admin_get_listings_stats" ? stats : [], error: null }),
      auth: { getUser: () => Promise.resolve({ data: { user: { id: "admin-1" } } }) },
      functions: { invoke: () => Promise.resolve({ data: {}, error: null }) },
    },
  };
});
vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: { id: "admin-1" }, logout: vi.fn(), isAuthenticated: true, loading: false }),
}));
vi.mock("@/hooks/useAdmin", () => ({ useAdmin: () => ({ isAdmin: true, loading: false }) }));
vi.mock("@/hooks/useFeatureFlag", () => ({ useFeatureFlag: () => ({ enabled: true, loading: false }) }));
vi.mock("@/lib/admin/readError", async (orig) => ({ ...(await orig<Record<string, unknown>>()), reportAdminReadError: vi.fn() }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn(), warning: vi.fn() } }));

import AdminListings from "@/pages/admin/AdminListings";

const sit = (id: string, title: string, publishedDaysAgo: number) => ({
  id,
  user_id: `owner-${id}`,
  title,
  status: "published",
  city: "Lyon",
  country: "FR",
  start_date: ymd(20),
  end_date: ymd(27),
  published_at: iso(-publishedDaysAgo),
  created_at: iso(-publishedDaysAgo - 1),
  unpublished_at: null,
  hidden_by: null,
  owner: { first_name: "Camille", last_name: "Durand", city: "Lyon", avatar_url: null, last_seen_at: iso(-1) },
});

const stat = (id: string, o: Partial<Record<string, number>>) => ({
  sit_id: id, view_count: 12, unique_view_count: 4, public_view_count: 8, member_view_count: 4, unique_member_view_count: 4,
  message_count: 0, conversation_count: 0, application_count: 0, last_view_at: iso(-1), ...o,
});

beforeEach(() => {
  try { localStorage.clear(); } catch { /* stockage indisponible */ }
  // Visite précédente il y a deux jours : l'annonce publiée il y a un jour est nouvelle, celle d'il y a cinq jours non.
  localStorage.setItem("admin.news.seen.listings:admin-1", iso(-2));
  rows.sits = [sit("a1", "Maison à Lyon, chat", 1), sit("a2", "Appartement à Lyon", 5)];
  stats.length = 0;
  stats.push(
    stat("a1", { message_count: 7, conversation_count: 2, application_count: 0 }),
    stat("a2", { message_count: 0, conversation_count: 0, application_count: 3 }),
  );
});

describe("liste des annonces, rendu", () => {
  it("colonne Messages, Nouvelle sur l'annonce d'hier, Diffuser sur l'annonce sans candidature depuis plus de 48 h, aucun bouton Détails", async () => {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={qc}>
        <MemoryRouter initialEntries={["/admin/listings?filter=published"]}><AdminListings /></MemoryRouter>
      </QueryClientProvider>,
    );
    const rowsEl = await screen.findAllByTestId("row-messages");
    expect(rowsEl).toHaveLength(2);
    expect(screen.getByRole("columnheader", { name: "Messages" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: /Détails/ })).toBeNull();

    const r1 = screen.getByText("Maison à Lyon, chat").closest("tr")!;
    const r2 = screen.getByText("Appartement à Lyon").closest("tr")!;
    // Messages : le nombre ouvre les conversations, le détail dit combien.
    expect(within(r1).getByTestId("row-messages").textContent).toContain("7");
    expect(within(r1).getByTestId("row-messages").textContent).toContain("2 conversations");
    expect(within(r2).getByTestId("row-messages").textContent).toBe("0");
    // Nouvelle : seulement l'annonce publiée depuis la visite précédente.
    expect(within(r1).queryByTestId("row-new")).not.toBeNull();
    expect(within(r2).queryByTestId("row-new")).toBeNull();
    // Diffuser : annonce en ligne depuis plus de 48 h sans candidature (la première a 1 jour, la seconde a des candidatures).
    expect(within(r1).queryByTestId("row-broadcast")).toBeNull();
    expect(within(r2).queryByTestId("row-broadcast")).toBeNull();
  });

  it("une annonce en ligne depuis trois jours sans candidature porte le bouton Diffuser", async () => {
    rows.sits = [sit("b1", "Maison de campagne", 3)];
    stats.length = 0;
    stats.push(stat("b1", {}));
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={qc}>
        <MemoryRouter initialEntries={["/admin/listings?filter=published"]}><AdminListings /></MemoryRouter>
      </QueryClientProvider>,
    );
    const row = (await screen.findByText("Maison de campagne")).closest("tr")!;
    expect(await within(row).findByTestId("row-broadcast")).toBeTruthy();
    expect(within(row).getByTestId("row-messages").textContent).toBe("0");
  });
});
