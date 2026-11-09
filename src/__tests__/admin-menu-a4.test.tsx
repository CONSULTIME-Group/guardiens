import { describe, it, expect, vi, beforeEach } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook } from "@testing-library/react";

const { updateSpy, fromSpy, rpcSpy, LIVE } = vi.hoisted(() => {
  const LIVE = { animals: 25, home: 25, mutual_aid: 25, village: 25 };
  const updateSpy = vi.fn();
  const fromSpy = vi.fn();
  const rpcSpy = vi.fn();
  return { updateSpy, fromSpy, rpcSpy, LIVE };
});

vi.mock("@/integrations/supabase/client", () => ({
  supabase: { from: (...a: unknown[]) => fromSpy(...a), rpc: (...a: unknown[]) => rpcSpy(...a) },
}));
vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: { id: "admin-1" }, loading: false, isAuthenticated: true, logout: vi.fn() }),
}));
vi.mock("@/hooks/useAdmin", () => ({ useAdmin: () => ({ isAdmin: true, loading: false }) }));
vi.mock("@/hooks/useHeroWeights", () => ({
  // Objet stable : le composant resynchronise son brouillon à chaque nouvelle référence.
  useHeroWeights: () => LIVE,
}));
vi.mock("@/components/seo/Head", () => ({ default: () => null }));

import { adminNavGroups_export } from "@/components/admin/AdminSidebar";
import { useWorkList } from "@/hooks/useWorkList";
import { PRICING_IS_ACTIVE } from "@/config/pricing";
import AdminHeroWeights from "@/pages/AdminHeroWeights";

const read = (p: string) => readFileSync(p, "utf8");
const items = adminNavGroups_export.flatMap((g) => g.items);

describe("menu : groupe EMAILS", () => {
  it("5 entrées dans l'ordre", () => {
    const g = adminNavGroups_export.find((x) => x.label === "EMAILS")!;
    expect(g.items.map((i) => i.label)).toEqual([
      "Santé email", "Emails transactionnels", "Nurturing", "Envois groupés", "Stats campagnes",
    ]);
    for (const other of adminNavGroups_export.filter((x) => x.label !== "EMAILS")) {
      for (const l of ["Santé email", "Emails transactionnels", "Nurturing", "Envois groupés", "Stats campagnes"]) {
        expect(other.items.map((i) => i.label)).not.toContain(l);
      }
    }
    const week = adminNavGroups_export.find((x) => x.label === "CHAQUE SEMAINE")!;
    expect(week.items.map((i) => i.label)).toContain("Pilotage entraide");
  });

  it("Poids des hero hors menu, route gardée (lot ADM14, décision 1)", () => {
    expect(items.map((i) => i.to)).not.toContain("/admin/hero-weights");
    expect(read("src/App.tsx")).toContain('path="/admin/hero-weights"');
  });

  it("Abonnements absent quand PRICING_IS_ACTIVE vaut false", () => {
    expect(PRICING_IS_ACTIVE).toBe(false);
    expect(items.map((i) => i.label)).not.toContain("Abonnements");
  });

  it("/admin/envois-groupes/stats : seul « Stats campagnes » actif (desktop et mobile)", () => {
    const navMatch = (to: string, pathname: string, end?: boolean) => {
      const p = to.split("?")[0];
      return pathname === p || (!end && pathname.startsWith(p + "/"));
    };
    const actives = items
      .filter((it) => navMatch(it.to, "/admin/envois-groupes/stats", it.end))
      .map((i) => i.label);
    expect(actives).toEqual(["Stats campagnes"]);
    // Le menu mobile passe end au même NavLink.
    const layout = read("src/components/admin/AdminLayout.tsx");
    expect(layout).toContain("end={item.end}");
  });
});

describe("abonnements et paramètres", () => {
  it("rappels fondateurs retirés avec leurs fonctions (lot Z)", () => {
    const src = read("src/pages/admin/AdminSubscriptions.tsx");
    expect(src).not.toContain("send-founder-reminder");
    expect(src).not.toContain("Rappel J-30");
    expect(src).not.toContain("Rappel J-7");
  });
  it("paramètres sans date figée", () => {
    const src = read("src/pages/admin/AdminSettings.tsx");
    expect(src).not.toContain("2026-09-30");
    expect(src).not.toContain("La fin de cette phase");
  });
  it("carte KPI « Annonces actives » retirée avec KpiCards (lot ADM4)", () => {
    expect(existsSync("src/pages/admin/_components/dashboard/KpiCards.tsx")).toBe(false);
  });
});

describe("poids des hero : confirmation obligatoire", () => {
  beforeEach(() => {
    updateSpy.mockReset();
    fromSpy.mockReset();
    updateSpy.mockReturnValue({ eq: () => Promise.resolve({ error: null }) });
    fromSpy.mockReturnValue({ update: updateSpy });
  });

  const renderPage = () =>
    render(<MemoryRouter><AdminHeroWeights /></MemoryRouter>);

  it("aucune écriture sans confirmation, écriture après « Confirmer »", async () => {
    renderPage();
    expect(screen.queryByText(/page de debug/)).toBeNull();
    fireEvent.click(screen.getByText(/Réinitialiser aux défauts/));
    fireEvent.click(screen.getByRole("button", { name: "Enregistrer" }));
    expect(await screen.findByText(/redistribuent le hero des profils existants pour tous les visiteurs/)).toBeTruthy();
    expect(updateSpy).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Annuler" }));
    expect(updateSpy).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Enregistrer" }));
    fireEvent.click(await screen.findByRole("button", { name: "Confirmer" }));
    await waitFor(() => expect(updateSpy).toHaveBeenCalledTimes(1));
    expect(fromSpy).toHaveBeenCalledWith("hero_weights");
  });
});

describe("routes retirées (lot A11 : redirections mortes purgées)", () => {
  const src = read("src/App.tsx");
  for (const path of [
    "/admin/audit-tarifs", "/admin/seo-debug", "/admin/relance-incomplet",
    "/admin/test-sitter-fields", "/admin/articles/refresh-post-pivot",
    "/admin/dashboard", "/admin/seo", "/admin/analytics",
  ]) {
    it(path, () => {
      expect(src).not.toContain(`<Route path="${path}" `);
    });
  }
  it("imports inutilisés retirés", () => {
    for (const n of ["AdminSEO", "AdminAnalytics", "SeoDebug", "AuditTarifs", "AdminRelanceIncomplet", "AdminTestSitterFields", "AdminArticlesRefreshPostPivot", "AdminLifecycle"]) {
      expect(src).not.toMatch(new RegExp(`const ${n} = lazy`));
    }
    expect(src).toContain('<Route path="/admin/lifecycle" element={<Navigate to="/admin/nurturing" replace />} />');
  });
});

import { Navigate } from "react-router-dom";
const NavigateProbe = () => <Navigate to="/admin" replace />;


describe("useWorkList : une seule lecture partagée (lot ADM14)", () => {
  it("deux montages (layout + sidebar) déclenchent un seul appel", async () => {
    rpcSpy.mockResolvedValue({ data: { sources: {}, signals: [], queues: [], health: [] }, error: null });
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={qc}>{children}</QueryClientProvider>
    );
    const Both = () => { useWorkList(); useWorkList(); return null; };
    render(<Both />, { wrapper });
    await waitFor(() => expect(rpcSpy).toHaveBeenCalled());
    await new Promise((r) => setTimeout(r, 30));
    expect(rpcSpy).toHaveBeenCalledTimes(1);
    expect(rpcSpy).toHaveBeenCalledWith("admin_work_list");
    void renderHook; void fromSpy;
  });
});
