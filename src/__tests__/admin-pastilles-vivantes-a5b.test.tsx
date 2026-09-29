import { describe, it, expect, vi, beforeEach } from "vitest";
import { readFileSync } from "node:fs";
import { render, waitFor, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";

const { rpcSpy, authState, adminState } = vi.hoisted(() => ({
  rpcSpy: vi.fn(),
  authState: { user: { id: "admin-1" } as { id: string } | null },
  adminState: { isAdmin: true, loading: false },
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: { rpc: (...a: unknown[]) => rpcSpy(...a), from: vi.fn() },
}));
vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: authState.user, logout: vi.fn(), isAuthenticated: true, loading: false }),
}));
vi.mock("@/hooks/useAdmin", () => ({ useAdmin: () => adminState }));

import {
  useAdminBadges, adminBadgesQueryKey, refreshAdminBadges, ADMIN_BADGES_QUERY_KEY,
} from "@/hooks/useAdminBadges";
import { AdminSidebar, adminNavGroups_export, BADGE_TITLES } from "@/components/admin/AdminSidebar";
import { resolveBadge } from "@/components/admin/AdminBadgePill";

const read = (p: string) => readFileSync(p, "utf8");
const mkClient = () => new QueryClient({ defaultOptions: { queries: { retry: false } } });
const wrap = (qc: QueryClient) => ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={qc}><MemoryRouter>{children}</MemoryRouter></QueryClientProvider>
);

beforeEach(() => {
  rpcSpy.mockReset();
  authState.user = { id: "admin-1" };
  adminState.isAdmin = true;
  adminState.loading = false;
});

describe("useAdminBadges", () => {
  it("un seul appel admin_menu_badges par rafraîchissement", async () => {
    rpcSpy.mockResolvedValue({ data: { reports: 3 }, error: null });
    const qc = mkClient();
    const Probe = () => { useAdminBadges(); useAdminBadges(true); return null; };
    render(<Probe />, { wrapper: wrap(qc) });
    await waitFor(() => expect(rpcSpy).toHaveBeenCalledTimes(1));
    expect(rpcSpy).toHaveBeenCalledWith("admin_menu_badges");
    refreshAdminBadges();
    await waitFor(() => expect(rpcSpy).toHaveBeenCalledTimes(2));
  });

  it("n'appelle rien tant que l'admin n'est pas confirmé", async () => {
    adminState.loading = true;
    adminState.isAdmin = false;
    const qc = mkClient();
    const Probe = () => { useAdminBadges(); useAdminBadges(false); return null; };
    render(<Probe />, { wrapper: wrap(qc) });
    await new Promise((r) => setTimeout(r, 30));
    expect(rpcSpy).not.toHaveBeenCalled();
  });

  it("clé par utilisateur", () => {
    expect(adminBadgesQueryKey("a")).toEqual([...ADMIN_BADGES_QUERY_KEY, "a"]);
    expect(adminBadgesQueryKey("a")).not.toEqual(adminBadgesQueryKey("b"));
  });

  it("réglages de fraîcheur", () => {
    const src = read("src/hooks/useAdminBadges.ts");
    expect(src).toContain("staleTime: 30_000");
    expect(src).toContain("refetchInterval: 60_000");
    expect(src).toContain("refetchOnWindowFocus: true");
  });
});

describe("menu", () => {
  const items = adminNavGroups_export.flatMap((g) => g.items);

  it("« ? » avec « Compteur indisponible » sur erreur, jamais 0", async () => {
    const err = vi.spyOn(console, "error").mockImplementation(() => {});
    rpcSpy.mockResolvedValue({ data: null, error: { message: "boom" } });
    render(<AdminSidebar />, { wrapper: wrap(mkClient()) });
    await waitFor(() => expect(screen.getAllByTitle("Compteur indisponible").length).toBeGreaterThan(0), { timeout: 4000 });
    expect(screen.getAllByTitle("Compteur indisponible")[0].textContent).toBe("?");
    expect(err).toHaveBeenCalled();
    err.mockRestore();
    expect(resolveBadge("reports", {}, true, BADGE_TITLES).text).toBe("?");
  });

  it("Demandes RGPD porte la pastille deletionRequests", () => {
    expect(items.find((i) => i.label === "Demandes RGPD")?.badgeKey).toBe("deletionRequests");
    expect(BADGE_TITLES.deletionRequests).toBe("demandes de suppression en attente");
  });

  it("Entraide ne porte aucune pastille ; clés retirées", () => {
    expect(items.find((i) => i.label === "Entraide")?.badgeKey).toBeUndefined();
    expect(BADGE_TITLES).not.toHaveProperty("reportsSit");
    expect(BADGE_TITLES).not.toHaveProperty("reportsMission");
  });
});

describe("invalidation après action", () => {
  const pages: [string, number][] = [
    ["src/pages/admin/AdminExperienceVerification.tsx", 2],
    ["src/pages/admin/AdminReviews.tsx", 1],
    ["src/pages/admin/AdminReviewDisputes.tsx", 1],
    ["src/pages/admin/AdminReports.tsx", 2],
    ["src/pages/admin/AdminSkills.tsx", 4],
    ["src/pages/admin/AdminListings.tsx", 3],
    ["src/pages/admin/AdminGuides.tsx", 2],
    ["src/pages/admin/AdminDeletionRequests.tsx", 1],
  ];
  it.each(pages)("%s appelle refreshAdminBadges", (p, min) => {
    const src = read(p);
    const calls = src.match(/refreshAdminBadges\(\);/g) || [];
    expect(calls.length).toBeGreaterThanOrEqual(min);
  });

  it("la déconnexion vide le cache", () => {
    expect(read("src/contexts/AuthContext.tsx")).toContain("clearAppQueryCache();");
  });
});

describe("modération des avis et signalements", () => {
  it("AdminReviews vérifie qu'une ligne a été touchée", () => {
    const src = read("src/pages/admin/AdminReviews.tsx");
    expect(src).toContain('.update(update).eq("id", reviewId).select("id")');
    expect(src).toContain("touched.length === 0");
  });
  it("AdminReports comprend sit et user", () => {
    const src = read("src/pages/admin/AdminReports.tsx");
    expect(src).toMatch(/sit: "Annonce"/);
    expect(src).toMatch(/user: "Profil"/);
    expect(src).toContain('case "sit":');
  });
});
