import { describe, it, expect, vi } from "vitest";
import { readFileSync } from "node:fs";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { fetchAllRows } from "@/lib/admin/fetchAllRows";
import { computeAffinityStats } from "@/pages/admin/_components/dashboard/AffinityPilotCard";
import { KpiCards } from "@/pages/admin/_components/dashboard/KpiCards";
import { resolveNavActive, adminNavGroups_export } from "@/components/admin/AdminSidebar";

vi.mock("@/integrations/supabase/client", () => ({ supabase: {} }));

const read = (p: string) => readFileSync(p, "utf8");

function fakeSource(total: number, failAtPage?: number) {
  const calls: Array<[number, number]> = [];
  const page = async (from: number, to: number) => {
    calls.push([from, to]);
    if (failAtPage !== undefined && calls.length === failAtPage) {
      return { data: null, error: new Error("boom page " + failAtPage) };
    }
    const data = [];
    for (let i = from; i <= to && i < total; i++) data.push({ i });
    return { data, error: null };
  };
  return { page, calls };
}

describe("fetchAllRows", () => {
  it("2 350 lignes : 3 pages, 2 350 lignes, arrêt sur page incomplète", async () => {
    const src = fakeSource(2350);
    const r = await fetchAllRows(src.page);
    expect(r.rows).toHaveLength(2350);
    expect(r.pages).toBe(3);
    expect(r.truncated).toBe(false);
    expect(src.calls).toEqual([[0, 999], [1000, 1999], [2000, 2999]]);
  });
  it("plafond signalé", async () => {
    const r = await fetchAllRows(fakeSource(10_000).page, { cap: 2500 });
    expect(r.rows).toHaveLength(2500);
    expect(r.truncated).toBe(true);
  });
  it("erreur au milieu propagée", async () => {
    await expect(fetchAllRows(fakeSource(5000, 2).page)).rejects.toThrow("boom page 2");
  });
});

/** Ancien calcul, recopié tel quel du composant avant le lot. */
function oldCalc(data: Array<{ metadata: any }>) {
  let displayed = 0, hidden = 0, missing = 0;
  for (const row of data) {
    const m: any = row.metadata ?? {};
    const ctx = String(m.context ?? "unknown");
    if (ctx.endsWith("_missing")) { missing++; continue; }
    if (m.displayed === false) { hidden++; continue; }
    displayed++;
  }
  return { total: data.length, displayed, hidden, missing };
}

describe("parité du calcul d'affinité sur 1 500 événements", () => {
  it("mêmes totaux que l'ancien calcul, au-delà de 1 000", async () => {
    const events = Array.from({ length: 1500 }, (_, i) => ({
      metadata: i % 5 === 0
        ? { context: "sit_detail_missing" }
        : i % 3 === 0
          ? { context: "search_listing", displayed: false, hidden_reason: "threshold" }
          : { context: "public_profile", displayed: true, score: 40 + (i % 60) },
    }));
    const { rows } = await fetchAllRows(async (from, to) => ({ data: events.slice(from, to + 1), error: null }));
    const s = computeAffinityStats(rows);
    const o = oldCalc(events);
    expect({ total: s.total, displayed: s.displayed, hidden: s.hidden, missing: s.missing }).toEqual(o);
    expect(s.total).toBe(1500);
  });
});

describe("KpiCards", () => {
  it("2 in_progress et 0 confirmed : 2 en « Gardes en cours »", () => {
    render(
      <MemoryRouter>
        <KpiCards stats={{ totalUsers: 1, owners: 0, sitters: 0, both: 0, newThisWeek: 0, activeListings: 0, ongoingSits: 2, confirmedUpcoming: 0, totalReviews: 0, avgRating: 0, monthRevenue: 0 }} />
      </MemoryRouter>,
    );
    const card = screen.getByText("Gardes en cours").closest("a")!;
    expect(card.textContent).toContain("2");
    expect(card.textContent).toContain("0 confirmée à venir");
  });
  it("la source compte in_progress et confirmed", () => {
    const src = read("src/pages/admin/_components/dashboard/useDashboardData.ts");
    expect(src).toContain('.eq("status", "in_progress")');
    expect(src).toContain('.eq("status", "confirmed")');
  });
});

describe("badge Avis", () => {
  it("filtre en_attente", () => {
    // Depuis A5b, la définition vit dans admin_menu_badges().
    const src = read("drizzle/migrations/0035_admin_menu_badges_and_reviews_admin_rls.sql");
    expect(src).toContain("moderation_status = 'en_attente'");
    expect(src).not.toContain("moderation_status = 'pending'");
  });
});

describe("menu admin : un seul élément actif", () => {
  const items = adminNavGroups_export.flatMap((g) => g.items);
  // Simule NavLink : actif si le chemin correspond (préfixe de segment).
  const navMatch = (to: string, pathname: string, end?: boolean) => {
    const p = to.split("?")[0];
    return pathname === p || (!end && pathname.startsWith(p + "/"));
  };
  const actives = (pathname: string, search: string) =>
    items.filter((it) => resolveNavActive(it as any, { pathname, search }, navMatch(it.to, pathname, (it as any).end))).map((it) => it.label);

  it("?tab=mutual-aid : Pilotage entraide", () => {
    expect(actives("/admin/pilotage-entraide", "")).toEqual(["Pilotage entraide"]);
  });
  it("?tab=templates : Emails transactionnels", () => {
    expect(actives("/admin/emails-transactionnels", "?tab=templates")).toEqual(["Emails transactionnels"]);
    expect(actives("/admin/emails-transactionnels", "")).toEqual(["Emails transactionnels"]);
  });
  it("/admin/emails : Santé email", () => {
    expect(actives("/admin/emails", "")).toEqual(["Santé email"]);
  });
  it("le menu mobile applique la même règle", () => {
    expect(read("src/components/admin/AdminLayout.tsx")).toContain("resolveNavActive(item, location, isActive)");
  });
});

describe("santé email et lien de délivrabilité", () => {
  it("la page lit le pipeline par RPC, plus la vue", () => {
    const src = read("src/pages/admin/AdminEmailHealth.tsx");
    expect(src).toContain('"admin_email_pipeline_health"');
    expect(src).not.toContain('from("v_email_pipeline_health"');
    expect(src).not.toContain(".limit(10000)");
  });
  it("l'email vise l'onglet delivery d'AdminEmails, contrôle d'appelant conservé", () => {
    const src = read("supabase/functions/email-delivery-daily/index.ts");
    expect(src).toContain("https://guardiens.fr/admin/emails-transactionnels?tab=delivery");
    expect(src).toContain('requireCronCaller(req, corsHeaders, "email-delivery-daily")');
  });
});
