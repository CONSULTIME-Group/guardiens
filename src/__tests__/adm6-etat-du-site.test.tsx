// Lots ADM6 et ADM7 : encart « État du site », repère de mesure, bruit retiré.
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const rpc = vi.hoisted(() => ({ result: { data: null as unknown, error: null as unknown } }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { rpc: vi.fn(async () => rpc.result) } }));
// Lot ADM14 : les voyants sont lus dans la liste de travail (useWorkList), une fois l'admin connu.
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => ({ user: { id: "admin-1" } }) }));
vi.mock("@/hooks/useAdmin", () => ({ useAdmin: () => ({ isAdmin: true, loading: false }) }));
vi.mock("@/lib/admin/readError", async (orig) => ({ ...(await orig<Record<string, unknown>>()), reportAdminReadError: vi.fn() }));
const asWorkList = (health: unknown) => ({ sources: { health: true }, signals: [], queues: [], health });

import { SiteHealthStrip, parseSiteHealth, siteHealthHeadline } from "@/pages/admin/_components/dashboard/SiteHealthStrip";
import { measureBreakNotice, PAGE_VIEW_MEASURE_CHANGE } from "@/lib/admin/measureBreak";

const checks = [
  { key: "tasks", label: "Tâches planifiées", state: "ok", detail: "41 tâches suivies", link: null },
  { key: "emails", label: "Emails", state: "ok", detail: "File d'envoi normale", link: "/admin/emails" },
  { key: "ai", label: "IA", state: "alert", detail: "Aucune analyse quotidienne depuis 17/10", link: "/admin/alma" },
  { key: "seo", label: "Rendu SEO", state: "alert", detail: "Plafond mensuel atteint", link: "/admin/prerender" },
  { key: "errors", label: "Erreurs du site", state: "ok", detail: "Aucune nouvelle erreur", link: "/admin/errors" },
  { key: "audience", label: "Mesure d'audience", state: "ok", detail: "883 pages vues hier", link: "/admin/traffic?tab=interne" },
];

const renderStrip = () => render(
  <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
    <MemoryRouter><SiteHealthStrip /></MemoryRouter>
  </QueryClientProvider>,
);

describe("État du site", () => {
  it("un voyant illisible n'est jamais vert, un lien hors admin est retiré", () => {
    const parsed = parseSiteHealth([{ key: "x", label: "X", state: "bizarre", link: "https://ailleurs.example" }, null, 3]);
    expect(parsed).toEqual([{ key: "x", label: "X", state: "alert", detail: "", link: null }]);
    expect(parseSiteHealth("pas une liste")).toEqual([]);
  });

  it("phrase de tête : tout fonctionne, ou le nombre de points à regarder", () => {
    expect(siteHealthHeadline(parseSiteHealth(checks.map((c) => ({ ...c, state: "ok" }))))).toBe("Tout fonctionne");
    expect(siteHealthHeadline(parseSiteHealth(checks))).toBe("2 points à regarder");
  });

  it("affiche les six voyants, chacun touchable vers sa page ; le détail d'un rouge est dans la liste (lot ADM14)", async () => {
    rpc.result = { data: asWorkList(checks), error: null };
    renderStrip();
    expect(await screen.findByText("État du site : 2 points à regarder")).toBeInTheDocument();
    const alerts = screen.getByTestId("site-health-alerts");
    expect(alerts.textContent).toContain("ouvre la liste ci-dessous");
    expect(alerts.textContent).not.toContain("Aucune analyse quotidienne depuis 17/10");
    const hrefs = screen.getAllByTestId("site-health-chip").map((a) => a.getAttribute("href"));
    expect(hrefs).toEqual([null, "/admin/emails", "/admin/alma", "/admin/prerender", "/admin/errors", "/admin/traffic?tab=interne"]);
    expect(document.querySelectorAll('[data-state="ok"]')).toHaveLength(4);
  });

  it("tout vert : aucune ligne à lire", async () => {
    rpc.result = { data: asWorkList(checks.map((c) => ({ ...c, state: "ok" }))), error: null };
    renderStrip();
    expect(await screen.findByText("État du site : Tout fonctionne")).toBeInTheDocument();
    expect(screen.queryByTestId("site-health-alerts")).toBeNull();
  });

  it("lecture en échec : le dit, jamais un faux vert", async () => {
    rpc.result = { data: null, error: { message: "boom" } };
    renderStrip();
    expect(await screen.findByText(/lecture impossible/, undefined, { timeout: 4000 })).toBeInTheDocument();
  });
});

describe("Repère de mesure d'audience du 14/10/2026", () => {
  it("avertit tant que la période comparée commence avant la rupture", () => {
    const now = new Date("2026-10-18T10:00:00Z");
    expect(measureBreakNotice(new Date("2026-10-04T22:00:00Z"), now)).toMatch(/robots ne sont plus comptés/);
    expect(measureBreakNotice(new Date(PAGE_VIEW_MEASURE_CHANGE.getTime() + 1), now)).toBeNull();
  });
});

describe("Migrations ADM6 à ADM8", () => {
  const read = (f: string) => readFileSync(resolve(__dirname, "../../drizzle/migrations", f), "utf8");
  it("l'état du site est réservé à l'admin et au service, sans tiret long", () => {
    const sql = read("0092_adm6_adm8_etat_du_site.sql");
    expect(sql).toMatch(/REVOKE ALL ON FUNCTION public\.admin_site_health\(\) FROM PUBLIC, anon/);
    expect(sql).toMatch(/has_role\(auth\.uid\(\), 'admin'\) OR coalesce\(auth\.jwt\(\)->>'role', ''\) = 'service_role'/);
    expect(sql).not.toMatch(/status = 'partial'\) >= 1 THEN 'degraded'|partial_7d, 0\) >= 1/);
    for (const edge of ["send-sit-draft-reminder", "send-message-reminders", "relance-cp-manquant", "nudge-missing-photo", "nudge-sitter-gallery-photo", "admin-activity-analysis"]) {
      expect(sql).toContain(`('${edge}',`);
    }
  });
  it("ADM7 garde ouverte l'alerte de nouvelle annonce perdue", () => {
    const sql = read("0093_adm7_moins_de_bruit.sql");
    expect(sql).toContain("<> 'ttl_exceeded_nearby_sit_alert'");
    expect(sql).toContain(">= 5000");
  });
  it("les six fonctions journalisent leurs passages planifiés", () => {
    for (const edge of ["send-sit-draft-reminder", "send-message-reminders", "relance-cp-manquant", "nudge-missing-photo", "nudge-sitter-gallery-photo", "admin-activity-analysis"]) {
      const src = readFileSync(resolve(__dirname, "../../supabase/functions", edge, "index.ts"), "utf8");
      expect(src).toContain(`withCronRunLog("${edge}"`);
    }
  });
});
