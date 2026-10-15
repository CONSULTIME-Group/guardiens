/**
 * Lot perf 5 : pour un membre, les annonces sont lues dès l'ouverture de la
 * recherche (sans attendre son profil), et son point vient des coordonnées
 * de son profil, sans géocodage.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => ({ user: { id: "me" }, hasSession: true, authChecked: true, loading: false }) }));
vi.mock("@/hooks/useSubscriptionAccess", () => ({ useSubscriptionAccess: () => ({ hasAccess: true }) }));

const log: string[] = [];
let releaseProfile: (() => void) | null = null;
const geocodeCalls: string[] = [];
vi.mock("@/lib/geocode", async (orig) => ({
  ...(await orig<typeof import("@/lib/geocode")>()),
  geocodeCity: (c: string) => { geocodeCalls.push(c); return Promise.resolve({ lat: 45.76, lng: 4.83, city: c }); },
}));
vi.mock("@/lib/sitSearchRules", async (orig) => ({
  ...(await orig<typeof import("@/lib/sitSearchRules")>()),
  communeDeptFromCoords: () => Promise.resolve("69"),
}));
vi.mock("@/lib/myProfile", () => ({
  fetchMyProfile: () => new Promise((resolve) => {
    releaseProfile = () => { log.push("profile:end"); resolve({ data: { id: "me", city: "Lyon", postal_code: "69005", latitude: 45.76, longitude: 4.83, identity_verified: false }, error: null }); };
  }),
  fetchMySitterProfile: () => Promise.resolve({ data: null, error: null }),
}));

const owners = [{ id: "o1", first_name: "Anne", city: "Villeurbanne", postal_code: "69100", departement_code: "69", country: "FR", identity_verified: false, is_founder: false, latitude_approx: 45.77, longitude_approx: 4.88 }];
const sits = [{ id: "s1", slug: "a", title: "Annonce", status: "published", city: "Villeurbanne", country: "FR", departement_code: "69", user_id: "o1", property_id: null, start_date: "2030-01-01", end_date: "2030-02-01", created_at: "2026-09-01T00:00:00Z", accepting_applications: true, property: { type: "house", photos: [] } }];

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
            return Promise.resolve({ data, count: 0, error: null }).then(ok, fail);
          };
          return (...args: unknown[]) => { if (key === "select") head = !!(args[1] as any)?.head; return builder; };
        },
      });
      return builder;
    },
  },
}));

import SearchSitter from "@/components/search/SearchSitter";
import { profilePoint } from "@/hooks/search/useSearchUserProfile";

beforeEach(() => { log.length = 0; geocodeCalls.length = 0; releaseProfile = null; });
afterEach(() => cleanup());

describe("recherche d'un membre (lot perf 5)", () => {
  it("annonces lues avant le profil, point du profil sans géocodage", async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(<QueryClientProvider client={client}><MemoryRouter initialEntries={["/search"]}><SearchSitter /></MemoryRouter></QueryClientProvider>);
    await waitFor(() => expect(log).toContain("read:public_closed_sits"));
    await waitFor(() => expect(log).toContain("read:public_owner_profiles"));
    expect(log).not.toContain("profile:end");
    releaseProfile!();
    await waitFor(() => expect(document.querySelector('[data-testid="search-card-real"]')).not.toBeNull(), { timeout: 4000 });
    expect(geocodeCalls).toEqual([]);
    // Une seule lecture des annonces fermées : la recherche reprend la première.
    expect(log.filter((l) => l === "read:public_closed_sits").length).toBe(1);
  });

  it("point du profil : valeurs vides, nulles ou 0, 0 écartées", () => {
    expect(profilePoint({ latitude: 45.7, longitude: 4.8 })).toEqual({ lat: 45.7, lng: 4.8 });
    expect(profilePoint({ latitude: "45.7", longitude: "4.8" })).toEqual({ lat: 45.7, lng: 4.8 });
    expect(profilePoint({ latitude: null, longitude: 4.8 })).toBeNull();
    expect(profilePoint({ latitude: 0, longitude: 0 })).toBeNull();
    expect(profilePoint(null)).toBeNull();
  });
});
