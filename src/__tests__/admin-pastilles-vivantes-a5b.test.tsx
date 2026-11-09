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

import { refreshAdminBadges } from "@/hooks/useAdminBadges";
import { useWorkList } from "@/hooks/useWorkList";
import { AdminSidebar, adminNavGroups_export } from "@/components/admin/AdminSidebar";

const read = (p: string) => readFileSync(p, "utf8");
const mkClient = () => new QueryClient({ defaultOptions: { queries: { retry: false } } });
const wrap = (qc: QueryClient) => ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={qc}><MemoryRouter>{children}</MemoryRouter></QueryClientProvider>
);
const EMPTY = { sources: {}, signals: [], queues: [], health: [] };

beforeEach(() => {
  rpcSpy.mockReset();
  authState.user = { id: "admin-1" };
  adminState.isAdmin = true;
  adminState.loading = false;
});

// Lot ADM14 : les pastilles par file sont remplacées par la pastille unique
// de la liste de travail (useWorkList). Mêmes garanties qu'au lot A5b.
describe("useWorkList (pastille du menu)", () => {
  it("un seul appel admin_work_list par rafraîchissement", async () => {
    rpcSpy.mockResolvedValue({ data: EMPTY, error: null });
    const qc = mkClient();
    const Probe = () => { useWorkList(); useWorkList(true); return null; };
    render(<Probe />, { wrapper: wrap(qc) });
    await waitFor(() => expect(rpcSpy).toHaveBeenCalledTimes(1));
    expect(rpcSpy).toHaveBeenCalledWith("admin_work_list");
    refreshAdminBadges();
    await waitFor(() => expect(rpcSpy).toHaveBeenCalledTimes(2));
  });

  it("n'appelle rien tant que l'admin n'est pas confirmé", async () => {
    adminState.loading = true;
    adminState.isAdmin = false;
    const qc = mkClient();
    const Probe = () => { useWorkList(); useWorkList(false); return null; };
    render(<Probe />, { wrapper: wrap(qc) });
    await new Promise((r) => setTimeout(r, 30));
    expect(rpcSpy).not.toHaveBeenCalled();
  });

  it("réglages de fraîcheur", () => {
    const src = read("src/hooks/useWorkList.ts");
    expect(src).toContain("staleTime: 30_000");
    expect(src).toContain("refetchInterval: 120_000");
    expect(src).toContain("refetchOnWindowFocus: true");
  });
});

describe("menu", () => {
  const items = adminNavGroups_export.flatMap((g) => g.items);

  it("« ? » sur erreur, jamais 0", async () => {
    const err = vi.spyOn(console, "error").mockImplementation(() => {});
    rpcSpy.mockResolvedValue({ data: null, error: { message: "boom" } });
    render(<AdminSidebar />, { wrapper: wrap(mkClient()) });
    await waitFor(() => expect(screen.getAllByTitle("Liste de travail indisponible").length).toBeGreaterThan(0), { timeout: 4000 });
    expect(screen.getAllByTitle("Liste de travail indisponible")[0].textContent).toBe("?");
    err.mockRestore();
  });

  it("seule la vue d'ensemble porte une pastille", () => {
    expect(items.filter((i) => i.workList).map((i) => i.label)).toEqual(["Vue d'ensemble"]);
  });
});

describe("invalidation après action", () => {
  const pages: [string, number][] = [
    ["src/pages/admin/AdminExperienceVerification.tsx", 2],
    ["src/pages/admin/AdminReviews.tsx", 1],
    ["src/pages/admin/AdminReviewDisputes.tsx", 1],
    ["src/pages/admin/AdminReports.tsx", 2],
    ["src/pages/admin/AdminSkills.tsx", 4],
    ["src/pages/admin/AdminGuides.tsx", 2],
    ["src/pages/admin/AdminDeletionRequests.tsx", 1],
  ];
  it.each(pages)("%s appelle refreshAdminBadges", (p, min) => {
    const src = read(p);
    const calls = src.match(/refreshAdminBadges\(\);/g) || [];
    expect(calls.length).toBeGreaterThanOrEqual(min);
  });

  it("AdminListings rafraîchit les pastilles après masquer, restaurer et supprimer", () => {
    const src = read("src/pages/admin/AdminListings.tsx");
    // Helper factorisé réellement relié à refreshAdminBadges.
    expect(src).toMatch(/const refreshAfterAction = \(\) => \{[^}]*refreshAdminBadges\(\);[^}]*\};/);
    const body = (name: string, next: string) => {
      const start = src.indexOf(`const ${name} = async`);
      const end = src.indexOf(next, start + 1);
      expect(start).toBeGreaterThan(-1);
      return src.slice(start, end > start ? end : undefined);
    };
    expect(body("handleHide", "const handleRestore")).toMatch(/refreshAfterAction\(\);|refreshAdminBadges\(\);/);
    expect(body("handleRestore", "const handleDelete")).toMatch(/refreshAfterAction\(\);|refreshAdminBadges\(\);/);
    expect(body("handleDelete", "\n  const ")).toMatch(/refreshAfterAction\(\);|refreshAdminBadges\(\);/);
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
