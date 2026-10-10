/**
 * L7, panne de recherche sur le vrai SearchSitter (doubles : auth, données, géocodage).
 * Panne : encart + Réessayer en liste et en carte, aucun compteur 0, aucun
 * bandeau d'élargissement. Réessayer relance avec les mêmes critères, puis
 * l'affichage récupère les annonces.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import "@/i18n";

type Call = { method: string; args: unknown[] };
type Query = { table: string; head: boolean; calls: Call[] };
let failing = true;
const sitReads: Query[] = [];

vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => ({ user: null, hasSession: false, authChecked: true }) }));
vi.mock("@/hooks/useSubscriptionAccess", () => ({ useSubscriptionAccess: () => ({ hasAccess: false }) }));
const geocodeCalls: unknown[][] = [];
vi.mock("@/lib/geocode", async (orig) => ({
  ...(await orig<typeof import("@/lib/geocode")>()),
  geocodeCity: (...a: unknown[]) => { geocodeCalls.push(a); return Promise.resolve({ lat: 45.764, lng: 4.8357, city: "Lyon" }); },
}));

const fixture = Array.from({ length: 3 }, (_, i) => ({
  id: `sit-${i + 1}`, slug: `lyon-${i + 1}`, title: `Annonce Lyon ${i + 1}`,
  status: "published", city: "Lyon", country: "FR", user_id: null, property_id: null,
  start_date: "2030-01-01", end_date: "2030-02-01", created_at: "2026-09-01T00:00:00Z",
  accepting_applications: true, property: { type: "house", photos: [] },
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    functions: { invoke: () => Promise.resolve({ data: null, error: null }) },
    rpc: () => Promise.resolve({ data: [], error: null }),
    from: (table: string) => {
      const q: Query = { table, head: false, calls: [] };
      const builder: any = new Proxy({}, {
        get: (_t, key: string) => {
          if (["insert", "update", "delete", "upsert"].includes(key)) return () => { throw new Error("Écriture interdite"); };
          if (key === "then") return (ok: any, fail: any) => {
            const isSitList = table === "sits" && !q.head;
            if (isSitList && String(q.calls[0]?.args[0]).includes("slug")) sitReads.push(q);
            const p = isSitList && failing
              ? Promise.reject(new Error("Lecture indisponible"))
              : Promise.resolve({ data: isSitList ? fixture : [], count: table === "sits" ? fixture.length : 0, error: null });
            return p.then(ok, fail);
          };
          return (...args: unknown[]) => {
            if (key === "select") q.head = !!(args[1] as any)?.head;
            q.calls.push({ method: key, args });
            return builder;
          };
        },
      });
      return builder;
    },
  },
}));

import SearchSitter from "@/components/search/SearchSitter";

const URL = "/annonces?ville=Lyon&rayon=40&debut=2030-01-01&fin=2030-02-01";
const mount = () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}><MemoryRouter initialEntries={[URL]}>
    <SearchSitter mode="public" />
  </MemoryRouter></QueryClientProvider>);
};

const noFalseEmpty = () => {
  const text = document.body.textContent || "";
  expect(text).toContain("Recherche indisponible");
  expect(text).not.toMatch(/\b0 annonce/i);
  expect(text).not.toMatch(/Élargissez|plus loin|Aucune annonce/i);
};

beforeEach(() => { failing = true; sitReads.length = 0; geocodeCalls.length = 0; });

describe("L7, panne puis reprise sur le vrai SearchSitter", () => {
  it("panne honnête en liste et en carte, Réessayer conserve les critères et récupère", async () => {
    mount();
    await waitFor(() => expect(screen.getByRole("alert").textContent).toContain("Une erreur est survenue lors de la recherche"));
    noFalseEmpty();
    expect(screen.getByRole("button", { name: "Réessayer" })).toBeTruthy();

    // Carte : même encart, pas de carte vide.
    fireEvent.click(screen.getAllByRole("button", { name: /carte/i })[0]);
    await waitFor(() => expect(screen.getByRole("alert")).toBeTruthy());
    noFalseEmpty();
    fireEvent.click(screen.getAllByRole("button", { name: /grille|liste/i })[0]);

    const failedRead = sitReads[sitReads.length - 1]!;
    const geocodeBefore = geocodeCalls.length;
    failing = false;
    fireEvent.click(screen.getByRole("button", { name: "Réessayer" }));

    await waitFor(() => expect(screen.queryByRole("alert")).toBeNull());
    await waitFor(() => expect(document.querySelector('a[href^="/annonces/lyon-"]')).not.toBeNull());
    expect(document.body.textContent).not.toContain("Recherche indisponible");

    // Mêmes critères : même ville géocodée, même requête d'annonces.
    expect(geocodeCalls.length).toBeGreaterThan(geocodeBefore);
    expect(geocodeCalls.slice(geocodeBefore).some((a) => a[0] === "Lyon")).toBe(true);
    const retryRead = sitReads[sitReads.length - 1]!;
    expect(JSON.stringify(retryRead.calls)).toBe(JSON.stringify(failedRead.calls));
    expect(JSON.stringify(retryRead.calls)).toContain("2030-0");
  });
});
