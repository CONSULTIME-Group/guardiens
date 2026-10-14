/**
 * Lot perf 3 (copie des doublures du lot perf 2) : la recherche reprend les
 * lectures lancées par le HTML.
 * Lot perf 2 : sur /annonces, les lectures des annonces partent avant que la
 * ville cherchée soit située, et en rayon la liste n'attend pas le
 * département de référence (compteurs département et région complétés à son
 * arrivée, mesure d'impression retenue jusque-là).
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => ({ user: null, hasSession: false, authChecked: true }) }));
vi.mock("@/hooks/useSubscriptionAccess", () => ({ useSubscriptionAccess: () => ({ hasAccess: false }) }));

const log: string[] = [];
let releaseGeocode: (() => void) | null = null;
vi.mock("@/lib/geocode", async (orig) => ({
  ...(await orig<typeof import("@/lib/geocode")>()),
  geocodeCity: () => {
    log.push("geocode:start");
    return new Promise((resolve) => {
      releaseGeocode = () => { log.push("geocode:end"); resolve({ lat: 45.764, lng: 4.8357, city: "Lyon" }); };
    });
  },
}));
let deptMode: "never" | "now" = "never";
vi.mock("@/lib/sitSearchRules", async (orig) => ({
  ...(await orig<typeof import("@/lib/sitSearchRules")>()),
  communeDeptFromCoords: () => (deptMode === "now" ? Promise.resolve("69") : new Promise(() => {})),
}));

const owners = ["o1", "o2"].map((id, i) => ({
  id, first_name: `P${i}`, avatar_url: null, city: ["Villeurbanne", "Bron"][i], postal_code: ["69100", "69500"][i],
  departement_code: "69", country: "FR", identity_verified: false, is_founder: false,
  latitude_approx: [45.77, 45.74][i], longitude_approx: [4.88, 4.91][i],
}));
const sits = owners.map((o, i) => ({
  id: `sit-${i + 1}`, slug: `annonce-${i + 1}`, title: `Annonce ${i + 1}`, status: "published",
  city: o.city, country: "FR", departement_code: "69", user_id: o.id, property_id: `prop-${i + 1}`,
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
      log.push(`read:${table}`);
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

beforeEach(() => { log.length = 0; releaseGeocode = null; deptMode = "now"; (window as any).__GUARDIENS_LISTINGS__ = undefined; });
afterEach(() => cleanup());

describe("la recherche reprend les lectures du HTML (lot perf 3)", () => {
  it("visiteur : aucune lecture des annonces fermées ni des propriétaires par la recherche", async () => {
    (window as any).__GUARDIENS_LISTINGS__ = { at: Date.now(), p: Promise.resolve({ open: sits, closed: [], owners, gallery: [], pets: [], reviews: [], badges: [], ownerProfs: [] }) };
    mount("/annonces");
    await waitFor(() => expect(document.querySelectorAll('[data-testid="search-card-real"]').length).toBe(2), { timeout: 4000 });
    for (const t of ["read:public_closed_sits", "read:owner_gallery", "read:public_pets", "read:public_owner_profiles"]) expect(log).not.toContain(t);
    expect((window as any).__GUARDIENS_LISTINGS__).toBeNull();
  });

  it("sans lectures du HTML, la recherche lit comme avant", async () => {
    mount("/annonces");
    await waitFor(() => expect(document.querySelector('[data-testid="search-card-real"]')).not.toBeNull(), { timeout: 4000 });
    expect(log).toContain("read:public_closed_sits");
  });
});
