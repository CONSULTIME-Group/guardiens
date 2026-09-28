import { describe, it, expect, vi, beforeEach } from "vitest";
import { readFileSync } from "node:fs";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook } from "@testing-library/react";

const { updateSpy, fromSpy } = vi.hoisted(() => {
  const updateSpy = vi.fn();
  const fromSpy = vi.fn();
  return { updateSpy, fromSpy };
});

vi.mock("@/integrations/supabase/client", () => ({
  supabase: { from: (...a: unknown[]) => fromSpy(...a) },
}));
vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: { id: "admin-1" }, loading: false, isAuthenticated: true, logout: vi.fn() }),
}));
vi.mock("@/hooks/useAdmin", () => ({ useAdmin: () => ({ isAdmin: true, loading: false }) }));
vi.mock("@/hooks/useHeroWeights", () => ({
  useHeroWeights: () => ({ animals: 25, home: 25, mutual_aid: 25, village: 25 }),
}));
vi.mock("@/components/seo/Head", () => ({ default: () => null }));

import { adminNavGroups_export, resolveNavActive } from "@/components/admin/AdminSidebar";
import { useAdminBadges } from "@/hooks/useAdminBadges";
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
    const act = adminNavGroups_export.find((x) => x.label === "ACTIVITÉ")!;
    expect(act.items.map((i) => i.label)).toContain("Pilotage entraide");
  });

  it("Poids des hero dans CONTENU & SYSTÈME", () => {
    const g = adminNavGroups_export.find((x) => x.label === "CONTENU & SYSTÈME")!;
    expect(g.items.find((i) => i.label === "Poids des hero")?.to).toBe("/admin/hero-weights");
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
      .filter((it) => resolveNavActive(it as any, { pathname: "/admin/envois-groupes/stats", search: "" }, navMatch(it.to, "/admin/envois-groupes/stats", (it as any).end)))
      .map((i) => i.label);
    expect(actives).toEqual(["Stats campagnes"]);
    // Le menu mobile passe end et resolveNavActive au même NavLink.
    const layout = read("src/components/admin/AdminLayout.tsx");
    expect(layout).toContain("end={item.end}");
    expect(layout).toContain("resolveNavActive(item, location, isActive)");
  });
});

describe("abonnements et paramètres", () => {
  it("boutons de rappel sous PRICING_IS_ACTIVE", () => {
    const src = read("src/pages/admin/AdminSubscriptions.tsx");
    const guard = src.indexOf("{PRICING_IS_ACTIVE && (");
    expect(guard).toBeGreaterThan(-1);
    expect(src.indexOf("Rappel J-30")).toBeGreaterThan(guard);
    expect(src.indexOf("Rappel J-7")).toBeGreaterThan(guard);
  });
  it("paramètres sans date figée", () => {
    const src = read("src/pages/admin/AdminSettings.tsx");
    expect(src).not.toContain("2026-09-30");
    expect(src).toContain("{FOUNDER_DEADLINE}");
  });
  it("carte KPI « Annonces actives » retirée", () => {
    expect(read("src/pages/admin/_components/dashboard/KpiCards.tsx")).not.toContain('title: "Annonces actives"');
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

describe("routes retirées : redirection vers /admin", () => {
  const src = read("src/App.tsx");
  for (const path of [
    "/admin/audit-tarifs", "/admin/seo-debug", "/admin/relance-incomplet",
    "/admin/test-sitter-fields", "/admin/articles/refresh-post-pivot",
  ]) {
    it(path, () => {
      expect(src).toContain(`<Route path="${path}" element={<Navigate to="/admin" replace />} />`);
    });
  }
  it("la redirection mène bien à /admin", async () => {
    render(
      <MemoryRouter initialEntries={["/admin/seo-debug"]}>
        <Routes>
          <Route path="/admin/seo-debug" element={<NavigateProbe />} />
          <Route path="/admin" element={<p>accueil admin</p>} />
        </Routes>
      </MemoryRouter>,
    );
    expect(await screen.findByText("accueil admin")).toBeTruthy();
  });
  it("imports inutilisés retirés", () => {
    for (const n of ["AdminSEO", "AdminAnalytics", "SeoDebug", "AuditTarifs", "AdminRelanceIncomplet", "AdminTestSitterFields", "AdminArticlesRefreshPostPivot"]) {
      expect(src).not.toMatch(new RegExp(`const ${n} = lazy`));
    }
    expect(src).toContain("<AdminLifecycle />");
  });
});

import { Navigate } from "react-router-dom";
const NavigateProbe = () => <Navigate to="/admin" replace />;

describe("useAdminBadges : une seule lecture partagée", () => {
  it("deux montages (layout + sidebar) déclenchent une seule exécution", async () => {
    const counts: string[] = [];
    const chain: any = new Proxy({}, {
      get: (_t, prop) => {
        if (prop === "then") return (r: any) => r({ data: [], count: 0, error: null });
        return () => chain;
      },
    });
    fromSpy.mockImplementation((t: string) => { counts.push(t); return chain; });
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={qc}>{children}</QueryClientProvider>
    );
    const Both = () => { useAdminBadges(); useAdminBadges(); return null; };
    render(<Both />, { wrapper });
    await waitFor(() => expect(counts.length).toBeGreaterThan(0));
    await new Promise((r) => setTimeout(r, 30));
    expect(counts.filter((t) => t === "error_logs")).toHaveLength(1);
    expect(counts.filter((t) => t === "contact_messages")).toHaveLength(1);
    void renderHook;
  });
});
