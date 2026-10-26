/**
 * Lot perf 9 : la liste d'une recherche avec un point n'attend pas un lieu
 * lent à situer. Mesure du 26/10/2026 : une seule annonce sans coordonnées de
 * profil (Clarensac) faisait attendre chaque recherche de 4,7 s (deux appels
 * geocode de suite), FIRST_CARD p75 mobile de /search à 12,8 s.
 * - Les annonces situées par le profil s'affichent avant que le lieu lent
 *   réponde, jalon FIRST_CARD posé.
 * - Le lieu lent, situé ensuite, entre dans la liste par une seconde passe
 *   sans nouvel appel de géocodage.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => ({ user: null, hasSession: false, authChecked: true }) }));
vi.mock("@/hooks/useSubscriptionAccess", () => ({ useSubscriptionAccess: () => ({ hasAccess: false }) }));

const geocodeCalls: unknown[][] = [];
// Commune lente à situer : la promesse reste ouverte jusqu'à releaseSlow().
let releaseSlow: (v: { lat: number; lng: number; city: string } | null) => void = () => {};
let slow: Promise<{ lat: number; lng: number; city: string } | null>;
const resetSlow = () => { slow = new Promise((r) => { releaseSlow = r; }); };
resetSlow();
vi.mock("@/lib/geocode", async (orig) => ({
  ...(await orig<typeof import("@/lib/geocode")>()),
  geocodeCity: (...a: unknown[]) => {
    geocodeCalls.push(a);
    if (a[0] === "Pusignan") return slow;
    return Promise.resolve({ lat: 45.764, lng: 4.8357, city: "Lyon" });
  },
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

const baseOwners = ["o1", "o2", "o3"].map((id, i) => ({
  id, first_name: `P${i}`, avatar_url: null, city: ["Villeurbanne", "Vienne", "Bron"][i], postal_code: ["69100", "38200", "69500"][i],
  departement_code: ["69", "38", "69"][i], country: "FR", identity_verified: false, is_founder: false,
  latitude_approx: [45.77, 45.53, 45.74][i], longitude_approx: [4.88, 4.88, 4.91][i],
}));
// Propriétaire sans coordonnées de profil (cas de Clarensac au 26/10/2026) :
// son lieu passe par le géocodage.
const owners = [...baseOwners, {
  id: "o4", first_name: "P3", avatar_url: null, city: "Pusignan", postal_code: "69330", departement_code: "69",
  country: "FR", identity_verified: false, is_founder: false, latitude_approx: null, longitude_approx: null,
}];
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

beforeEach(() => { geocodeCalls.length = 0; deptCalls.length = 0; milestones.length = 0; resetSlow(); });
afterEach(() => { releaseSlow(null); cleanup(); });

const cards = () => document.querySelectorAll('[data-testid="search-card-real"]').length;

describe("liste sans attente du géocodage (lot perf 9)", () => {
  it("affiche les annonces situées sans attendre un lieu lent, puis l'ajoute", async () => {
    mount("/annonces?ville=Lyon&zone=radius&rayon=40");
    await waitFor(() => expect(cards()).toBe(3), { timeout: 4000 });
    await waitFor(() => expect(milestones).toContain("FIRST_CARD"));
    expect(geocodeCalls.some((a) => a[0] === "Pusignan")).toBe(true);
    const callsBefore = geocodeCalls.length;
    releaseSlow({ lat: 45.75, lng: 5.07, city: "Pusignan" });
    await waitFor(() => expect(cards()).toBe(4), { timeout: 4000 });
    expect(geocodeCalls.length).toBe(callsBefore);
  });

  it("un lieu introuvable ne retient jamais la liste", async () => {
    mount("/annonces?ville=Lyon&zone=radius&rayon=40");
    await waitFor(() => expect(cards()).toBe(3), { timeout: 4000 });
    releaseSlow(null);
    await new Promise((r) => setTimeout(r, 50));
    expect(cards()).toBe(3);
  });
});
