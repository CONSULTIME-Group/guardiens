/**
 * Lot perf 1 : budget de géocodage de /annonces, sur le vrai SearchSitter.
 * - Visiteur sans ville : aucun géocodage ni vérification de département
 *   avant la première carte (lot H3).
 * - Ville cherchée : seule la ville est géocodée ; une annonce dont le lieu
 *   vient du profil du propriétaire est située par ses coordonnées (lot H4).
 * - La première carte pose le jalon FIRST_CARD (src/lib/perfMarks.ts).
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => ({ user: null, hasSession: false, authChecked: true }) }));
vi.mock("@/hooks/useSubscriptionAccess", () => ({ useSubscriptionAccess: () => ({ hasAccess: false }) }));

const geocodeCalls: unknown[][] = [];
vi.mock("@/lib/geocode", async (orig) => ({
  ...(await orig<typeof import("@/lib/geocode")>()),
  geocodeCity: (...a: unknown[]) => { geocodeCalls.push(a); return Promise.resolve({ lat: 45.764, lng: 4.8357, city: "Lyon" }); },
}));
const deptCalls: unknown[][] = [];
vi.mock("@/lib/sitSearchRules", async (orig) => ({
  ...(await orig<typeof import("@/lib/sitSearchRules")>()),
  communeDeptFromCoords: (...a: unknown[]) => { deptCalls.push(a); return Promise.resolve("69"); },
}));
const milestones: string[] = [];
vi.mock("@/lib/perfMarks", async (orig) => {
  const real = await orig<typeof import("@/lib/perfMarks")>();
  return { ...real, markMilestone: (name: string, ...rest: any[]) => { milestones.push(name); return (real.markMilestone as any)(name, ...rest); } };
});

const owners = ["o1", "o2", "o3"].map((id, i) => ({
  id, first_name: `P${i}`, avatar_url: null, city: ["Villeurbanne", "Vienne", "Bron"][i], postal_code: ["69100", "38200", "69500"][i],
  departement_code: ["69", "38", "69"][i], country: "FR", identity_verified: false, is_founder: false,
  latitude_approx: [45.77, 45.53, 45.74][i], longitude_approx: [4.88, 4.88, 4.91][i],
}));
const sits = owners.map((o, i) => ({
  id: `sit-${i + 1}`, slug: `annonce-${i + 1}`, title: `Annonce ${i + 1}`, status: "published",
  city: o.city, country: "FR", departement_code: o.departement_code, user_id: o.id, property_id: null,
  start_date: "2030-01-01", end_date: "2030-02-01", created_at: "2026-09-01T00:00:00Z",
  accepting_applications: true, property: { type: "house", photos: [] },
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    functions: { invoke: () => Promise.resolve({ data: null, error: null }) },
    rpc: () => Promise.resolve({ data: [], error: null }),
    auth: { getSession: () => Promise.resolve({ data: { session: null } }) },
    from: (table: string) => {
      let head = false;
      const builder: any = new Proxy({}, {
        get: (_t, key: string) => {
          if (["insert", "update", "delete", "upsert"].includes(key)) return () => { throw new Error("Écriture interdite"); };
          if (key === "then") return (ok: any, fail: any) => {
            const data = table === "sits" && !head ? sits : table === "public_profiles" ? owners : [];
            return Promise.resolve({ data, count: table === "sits" ? sits.length : 0, error: null }).then(ok, fail);
          };
          return (...args: unknown[]) => {
            if (key === "select") head = !!(args[1] as any)?.head;
            return builder;
          };
        },
      });
      return builder;
    },
  },
}));

import SearchSitter from "@/components/search/SearchSitter";

const mount = (url: string) => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}><MemoryRouter initialEntries={[url]}>
    <SearchSitter mode="public" />
  </MemoryRouter></QueryClientProvider>);
};

beforeEach(() => { geocodeCalls.length = 0; deptCalls.length = 0; milestones.length = 0; });
afterEach(() => cleanup());

const firstCard = () => waitFor(() => expect(document.querySelector('[data-testid="search-card-real"]')).not.toBeNull(), { timeout: 4000 });

describe("budget de géocodage de /annonces (lot perf 1)", () => {
  it("visiteur sans ville : première carte sans aucun géocodage, jalon FIRST_CARD posé", async () => {
    mount("/annonces");
    await firstCard();
    expect(geocodeCalls).toHaveLength(0);
    expect(deptCalls).toHaveLength(0);
    await waitFor(() => expect(milestones).toContain("FIRST_CARD"));
  });

  it("ville cherchée : seule la ville est géocodée, les annonces sont situées par le profil", async () => {
    mount("/annonces?ville=Lyon&zone=radius&rayon=40");
    await firstCard();
    const geocoded = geocodeCalls.map((a) => String(a[0]));
    expect(geocoded.every((c) => c === "Lyon")).toBe(true);
    // Au plus la vérification du département de la ville cherchée.
    expect(deptCalls.length).toBeLessThanOrEqual(1);
  });
});
