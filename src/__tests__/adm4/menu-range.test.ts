/**
 * Lot ADM4 (18/10/2026) : 12 entrées au quotidien, le reste rangé sous Outils,
 * toutes les URL intactes, code mort retiré.
 */
import { describe, it, expect, vi } from "vitest";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, resolve } from "node:path";

vi.mock("@/integrations/supabase/client", () => ({ supabase: {} }));
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => ({ user: null, logout: () => {} }) }));

import { adminNavGroups_export, isToolPath, sumBadges } from "@/components/admin/AdminSidebar";

const read = (p: string) => readFileSync(resolve(process.cwd(), p), "utf8");
const APP = read("src/App.tsx");
const routeExists = (path: string) => APP.includes(`<Route path="${path}" `);

// Les 38 entrées du menu avant le lot ADM4 (18/10/2026, commit 261a93f).
const OLD_MENU = [
  "/admin", "/admin/traffic", "/admin/alma", "/admin/affinity",
  "/admin/users", "/admin/verifications", "/admin/associations", "/admin/experiences", "/admin/skills",
  "/admin/listings", "/admin/sits-management", "/admin/small-missions", "/admin/small-missions?tab=projets", "/admin/pilotage-entraide",
  "/admin/reviews", "/admin/review-disputes", "/admin/reports", "/admin/contact-messages", "/admin/messages", "/admin/errors", "/admin/demandes-suppression",
  "/admin/emails", "/admin/emails-transactionnels", "/admin/nurturing", "/admin/envois-groupes", "/admin/envois-groupes/stats",
  "/admin/articles", "/admin/faq", "/admin/guides", "/admin/analysis-requests", "/admin/city-pages", "/admin/departments",
  "/admin/breeds", "/admin/legal", "/admin/hero-weights", "/admin/settings", "/admin/audit", "/admin/diagnostics",
];

describe("Menu rangé", () => {
  const daily = adminNavGroups_export.filter((g) => !g.tool).flatMap((g) => g.items);
  const tools = adminNavGroups_export.filter((g) => g.tool).flatMap((g) => g.items);

  it("12 entrées au quotidien, dans l'ordre", () => {
    expect(daily.map((i) => i.label)).toEqual([
      "Vue d'ensemble", "Annonces", "Entraide", "Messages contact", "Signalements", "Vérifications ID",
      "Avis", "Demandes RGPD", "Utilisateurs", "Alma", "Trafic", "Erreurs",
    ]);
  });

  it("chaque entrée de l'ancien menu reste dans le menu, une seule fois", () => {
    const all = [...daily, ...tools].map((i) => i.to);
    expect(OLD_MENU).toHaveLength(38);
    for (const to of OLD_MENU) expect(all.filter((x) => x === to), to).toHaveLength(1);
    expect(all).toHaveLength(38);
  });

  it("chaque entrée du menu correspond à une route", () => {
    for (const it of [...daily, ...tools]) expect(routeExists(it.to.split("?")[0]), it.to).toBe(true);
  });

  it("Outils s'ouvre seul sur une page d'outil, jamais sur une page du quotidien", () => {
    expect(isToolPath("/admin/envois-groupes/stats")).toBe(true);
    expect(isToolPath("/admin/hero-weights")).toBe(true);
    expect(isToolPath("/admin")).toBe(false);
    expect(isToolPath("/admin/listings")).toBe(false);
    expect(isToolPath("/admin/small-missions")).toBe(false);
  });

  it("somme des pastilles : indisponible ou absente comptée zéro", () => {
    expect(sumBadges(daily, { sitsToStaff: 6, errors: 3, contactMessages: undefined })).toBe(9);
  });

  it("mobile : total des pastilles sur le bouton, Outils replié", () => {
    const layout = read("src/components/admin/AdminLayout.tsx");
    expect(layout).toContain('data-testid="admin-mobile-menu-button"');
    expect(layout).toContain("totalBadges > 0");
    expect(layout).toContain('data-testid="admin-mobile-tools-toggle"');
  });
});

describe("Liens admin des emails et fonctions", () => {
  const files: string[] = [];
  const walk = (d: string) => {
    for (const f of readdirSync(d)) {
      const p = join(d, f);
      if (statSync(p).isDirectory()) walk(p);
      else if (/\.(ts|tsx)$/.test(f)) files.push(p);
    }
  };
  walk(resolve(process.cwd(), "supabase/functions"));

  it("chaque URL guardiens.fr/admin citée résout vers une route", () => {
    const urls = new Set<string>();
    for (const f of files) {
      for (const m of readFileSync(f, "utf8").matchAll(/https:\/\/guardiens\.fr(\/admin[a-z0-9/_-]*)/g)) urls.add(m[1].replace(/\/$/, ""));
    }
    expect(urls.size).toBeGreaterThan(3);
    for (const u of urls) {
      const ok = routeExists(u) || (u.startsWith("/admin/articles/") && routeExists("/admin/articles/:id"));
      expect(ok, u).toBe(true);
    }
  });
});

describe("Code mort retiré", () => {
  it.each([
    "src/components/admin/signals/DormantSitterCard.tsx",
    "src/components/admin/signals/AffinityStaleCard.tsx",
    "src/components/admin/signals/CityCoverageGapCard.tsx",
    "src/components/admin/signals/CitySeoTensionCard.tsx",
    "src/pages/admin/_components/dashboard/PilotageLinks.tsx",
    "src/pages/admin/_components/dashboard/KpiCards.tsx",
  ])("%s", (p) => {
    expect(existsSync(resolve(process.cwd(), p))).toBe(false);
  });
});
