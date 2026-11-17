/**
 * Lot ANN-6 (17/11/2026) : rendu réel de la page Annonces : colonne Actions
 * sans icônes superposées, tri visible sur tous les filtres, synthèse des
 * brouillons.
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

const owner = { first_name: "Camille", last_name: "Durand", city: "Lyon", avatar_url: null, last_seen_at: iso(-1) };
const published = (id: string, title: string) => ({
  id, user_id: `owner-${id}`, title, status: "published", city: "Lyon", country: "FR",
  start_date: ymd(20), end_date: ymd(27), published_at: iso(-3), created_at: iso(-4), updated_at: iso(-3),
  unpublished_at: null, hidden_by: null, owner,
});
const draft = (id: string, title: string | null, city: string | null, start: string | null) => ({
  id, user_id: `owner-${id}`, title, status: "draft", city, country: "FR",
  start_date: start, end_date: start, published_at: null, created_at: iso(-10), updated_at: iso(-2),
  unpublished_at: null, hidden_by: null, owner: { ...owner, city: null },
});
const stat = (id: string) => ({
  sit_id: id, view_count: 12, unique_view_count: 4, public_view_count: 8, member_view_count: 4, unique_member_view_count: 4,
  message_count: 0, conversation_count: 0, application_count: 0, last_view_at: iso(-1),
});

const renderAt = (url: string) => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[url]}><AdminListings /></MemoryRouter>
    </QueryClientProvider>,
  );
};

beforeEach(() => {
  try { localStorage.clear(); } catch { /* stockage indisponible */ }
  stats.length = 0;
});

describe("ANN-6, colonne Actions", () => {
  it("sur ordinateur, la ligne garde le geste conseillé, Écrire et le menu ; couverture et version en ligne rejoignent le menu", async () => {
    rows.sits = [published("p1", "Maison de campagne")];
    stats.push(stat("p1"));
    renderAt("/admin/listings?filter=published");
    const row = (await screen.findByText("Maison de campagne")).closest("tr")!;
    expect(await within(row).findByTestId("row-broadcast")).toBeTruthy();
    expect(within(row).getByTestId("row-write-owner")).toBeTruthy();
    expect(within(row).getByRole("button", { name: "Autres actions" })).toBeTruthy();
    expect(within(row).queryByTestId("row-cover-picker")).toBeNull();
    expect(within(row).queryByTestId("row-live-link")).toBeNull();
    // Pas plus de deux boutons visibles et le menu.
    expect(within(row).getAllByRole("button").filter((b) => b.closest("td:last-child"))).toHaveLength(3);
  });
});

describe("ANN-6, tri visible sur tous les filtres", () => {
  it("le sélecteur existe en ligne (urgence par défaut) et en préparation (modifiée récemment par défaut)", async () => {
    rows.sits = [published("p1", "Maison de campagne")];
    stats.push(stat("p1"));
    const a = renderAt("/admin/listings?filter=published");
    const sel = await screen.findByTestId("sort-select");
    expect(sel.textContent).toContain("Trier : urgence");
    a.unmount();

    rows.sits = [draft("d1", "Un brouillon", "Lyon", ymd(30))];
    renderAt("/admin/listings?filter=preparing");
    const sel2 = await screen.findByTestId("sort-select");
    expect(sel2.textContent).toContain("Trier : modifiée récemment");
  });
});

describe("ANN-6, brouillons", () => {
  it("la synthèse compte chaque brouillon une fois et la ligne dit créée le … · modifiée …", async () => {
    rows.sits = [
      draft("d1", "Sans commune", null, ymd(30)),
      draft("d2", "Dates passées", "Lyon", ymd(-5)),
      draft("d3", "À compléter", "Lyon", ymd(30)),
    ];
    renderAt("/admin/listings?filter=preparing");
    const summary = await screen.findByTestId("drafts-summary");
    expect(summary.textContent).toContain("3 brouillons jamais publiés");
    expect(summary.textContent).toContain("1 sans commune");
    expect(summary.textContent).toContain("1 avec date dépassée");
    expect(summary.textContent).toContain("1 à compléter");
    const created = await screen.findAllByTestId("row-created");
    expect(created[0].textContent).toMatch(/créée le \d{1,2} .+ · modifiée /);
  });
});
