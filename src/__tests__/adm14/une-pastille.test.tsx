/**
 * Lot ADM14 (lot 3 du plan de l'arène admin du 09/11/2026, « go lot 3 » de
 * Jérémie) : la vue d'ensemble devient la liste, une seule pastille.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { render, screen, waitFor, fireEvent, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";

const { rpcSpy, updates, toastSuccess, newsReads, newsCounts } = vi.hoisted(() => ({
  rpcSpy: vi.fn(),
  updates: [] as Array<{ values: Record<string, unknown>; ids: unknown; filter: string }>,
  toastSuccess: vi.fn(),
  newsReads: [] as Array<{ table: string; ops: Array<[string, unknown[]]> }>,
  newsCounts: { sits: 0, small_missions: 0 } as Record<string, number>,
}));

vi.mock("@/integrations/supabase/client", () => {
  // Lectures de comptage (nouveautés) : chaîne select(...).gte().in()... puis await.
  const counter = (table: string) => {
    const entry = { table, ops: [] as Array<[string, unknown[]]> };
    newsReads.push(entry);
    const b: Record<string, unknown> = new Proxy({}, {
      get: (_t, k: string) => {
        if (k === "then") return (ok: (v: unknown) => unknown) => Promise.resolve({ count: newsCounts[table] ?? 0, error: null }).then(ok);
        return (...a: unknown[]) => { entry.ops.push([k, a]); return b; };
      },
    });
    return b;
  };
  const from = (table: string) => ({
    select: (...a: unknown[]) => { const c = counter(table) as Record<string, (...x: unknown[]) => unknown>; return c.select(...a); },
    update: (values: Record<string, unknown>) => ({
      in: (_c: string, ids: unknown) => ({
        is: (col: string) => { updates.push({ values, ids, filter: `is:${col}` }); return Promise.resolve({ error: null }); },
        eq: (col: string, v: unknown) => { updates.push({ values, ids, filter: `eq:${col}=${String(v)}` }); return Promise.resolve({ error: null }); },
      }),
    }),
  });
  return {
    supabase: {
      rpc: (...a: unknown[]) => rpcSpy(...a),
      from,
      auth: { getUser: () => Promise.resolve({ data: { user: { id: "admin-1" } } }) },
    },
  };
});
vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: { id: "admin-1" }, logout: vi.fn(), isAuthenticated: true, loading: false }),
}));
vi.mock("@/hooks/useAdmin", () => ({ useAdmin: () => ({ isAdmin: true, loading: false }) }));
vi.mock("@/hooks/useFeatureFlag", () => ({ useFeatureFlag: () => ({ enabled: true, loading: false }) }));
vi.mock("@/lib/admin/readError", async (orig) => ({ ...(await orig<Record<string, unknown>>()), reportAdminReadError: vi.fn() }));
vi.mock("@/components/PageMeta", () => ({ default: () => null }));
vi.mock("sonner", () => ({ toast: { success: (...a: unknown[]) => toastSuccess(...a), error: vi.fn() } }));

import { AdminSidebar, adminNavGroups_export, isToolPath } from "@/components/admin/AdminSidebar";
import { AdminLayout, resolveAdminTitle } from "@/components/admin/AdminLayout";
import { workListBadgeText, workListBadgeLabel } from "@/hooks/useWorkList";
import { markAdminNewsSeen, newsKeyForPath, readNewsSince, NEWS_DEFAULT_WINDOW_MS } from "@/hooks/useAdminNews";
import { SystemSection, TechnicalSignalsLine, TodaySection } from "@/pages/admin/_components/dashboard/PilotageBlocks";
import { SiteHealthStrip } from "@/pages/admin/_components/dashboard/SiteHealthStrip";
import { IgnoreSignalsButton, ignoreConfirmTitle } from "@/components/admin/signals/IgnoreSignalsButton";
import { isMondayInParis, shortDetectedAt, technicalFamiliesText } from "@/lib/admin/overviewText";
import {
  buildWorkList,
  isVerbFirst,
  QUEUE_COPY,
  type WorkListRaw,
} from "../../../supabase/functions/_shared/admin-work-list.ts";

const read = (p: string) => readFileSync(p, "utf8");
const APP = read("src/App.tsx");
const MIGRATION = read("drizzle/migrations/0127_adm14_files_completes.sql");

const sig = (id: string, type: string, severity = "warning") => ({
  id, signal_type: type, severity, entity_type: "sit", entity_id: id, detected_at: "2026-11-05T08:00:00Z", metadata: {},
});

const RAW: WorkListRaw = {
  sources: { signals: true, sits: true, queues: true, relances: true, health: true },
  signals: [sig("a", "no_applications"), sig("b", "no_applications"), sig("c", "alma_bug_report"), sig("d", "email_delivery_low", "critical")],
  sits: [],
  queues: [
    { key: "contactMessages", count: 2, oldest: "2026-11-07T06:00:00Z" },
    { key: "reviewsModeration", count: 1, oldest: "2026-11-08T06:00:00Z" },
  ],
  relances_failed_7d: 0,
  health: [
    { key: "tasks", label: "Tâches planifiées", state: "alert", detail: "Dernier passage en échec", link: "/admin?plus=taches" },
    { key: "emails", label: "Emails", state: "ok", detail: "File normale", link: "/admin/emails" },
    { key: "ai", label: "IA", state: "ok", detail: "Normal", link: null },
  ],
};
const LINES = buildWorkList(RAW).items.length;

const wrap = (ui: React.ReactNode, path = "/admin") => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={qc}><MemoryRouter initialEntries={[path]}>{ui}</MemoryRouter></QueryClientProvider>);
};

beforeEach(() => {
  rpcSpy.mockReset();
  updates.length = 0;
  newsReads.length = 0;
  newsCounts.sits = 0;
  newsCounts.small_missions = 0;
  toastSuccess.mockReset();
  try { localStorage.clear(); } catch { /* stockage indisponible */ }
});

describe("pastille unique = longueur de la liste", () => {
  it("texte : nombre de lignes, « ? » en échec ou liste vide incomplète, rien si tout est à jour", () => {
    const m = buildWorkList(RAW);
    expect(workListBadgeText(m, false)).toBe(String(m.items.length));
    expect(workListBadgeText(null, true)).toBe("?");
    expect(workListBadgeText(null, false)).toBeNull();
    expect(workListBadgeText(buildWorkList({ sources: { queues: false } }), false)).toBe("?");
    expect(workListBadgeText(buildWorkList({ sources: {} }), false)).toBeNull();
    expect(workListBadgeLabel("1")).toBe("1 chose à faire");
    expect(workListBadgeLabel("6")).toBe("6 choses à faire");
    expect(workListBadgeLabel("?")).toBe("Liste de travail indisponible");
  });

  it("menu de bureau : une pastille, sur la vue d'ensemble, égale aux lignes", async () => {
    rpcSpy.mockResolvedValue({ data: RAW, error: null });
    wrap(<AdminSidebar />);
    const pill = await screen.findByTitle(`${LINES} choses à faire`);
    expect(pill.textContent).toBe(String(LINES));
    expect(pill.closest("a")?.getAttribute("href")).toBe("/admin");
    expect(screen.getAllByTestId("admin-badge")).toHaveLength(1);
  });

  it("bouton du menu mobile : même nombre, et le tiroir ne montre que cette pastille", async () => {
    rpcSpy.mockResolvedValue({ data: RAW, error: null });
    wrap(<AdminLayout />);
    const btn = await screen.findByTestId("admin-mobile-menu-button");
    await waitFor(() => expect(btn.getAttribute("aria-label")).toBe(`Ouvrir le menu, ${LINES} choses à faire`));
    expect(within(btn).getByTestId("admin-badge").textContent).toBe(String(LINES));
    fireEvent.click(btn);
    // Pastille du bureau (cachée sous md), puis celle du tiroir : deux, sur la même entrée.
    const pills = screen.getAllByTestId("admin-badge");
    expect(pills.every((p) => p.textContent === String(LINES))).toBe(true);
    expect(rpcSpy.mock.calls.filter((c) => c[0] === "admin_work_list")).toHaveLength(1);
    expect(rpcSpy).not.toHaveBeenCalledWith("admin_menu_badges");
  });
});

describe("menu", () => {
  const daily = adminNavGroups_export.filter((g) => !g.tool);
  const tools = adminNavGroups_export.filter((g) => g.tool);
  const all = adminNavGroups_export.flatMap((g) => g.items);

  it("Vue d'ensemble, Annonces, Entraide, Utilisateurs, puis Chaque semaine, puis Outils sans pastille", () => {
    expect(daily.map((g) => g.label)).toEqual(["AU QUOTIDIEN", "CHAQUE SEMAINE"]);
    expect(daily[0].items.map((i) => i.label)).toEqual(["Vue d'ensemble", "Annonces", "Entraide", "Utilisateurs"]);
    expect(daily[1].items.map((i) => i.label)).toEqual(["Trafic", "Alma", "Affinité", "Pilotage entraide"]);
    expect(all.filter((i) => i.workList).map((i) => i.to)).toEqual(["/admin"]);
    for (const g of tools) for (const i of g.items) expect(i.workList, i.label).toBeFalsy();
  });

  it("Projets, Demandes d'analyse et Poids des hero hors menu, routes gardées", () => {
    for (const to of ["/admin/small-missions?tab=projets", "/admin/analysis-requests", "/admin/hero-weights"]) {
      expect(all.map((i) => i.to)).not.toContain(to);
      expect(APP).toContain(`path="${to.split("?")[0]}"`);
    }
    for (const it of all) expect(APP.includes(`<Route path="${it.to.split("?")[0]}" `), it.to).toBe(true);
  });

  it("onglet du navigateur juste sur une page hors menu", () => {
    expect(resolveAdminTitle("/admin/small-missions", "?tab=projets")).toBe("Projets");
    expect(resolveAdminTitle("/admin/small-missions", "")).toBe("Entraide");
    expect(resolveAdminTitle("/admin/analysis-requests")).toBe("Demandes d'analyse");
    expect(resolveAdminTitle("/admin/hero-weights")).toBe("Poids des hero");
  });

  it("Outils s'ouvre seul sur une page d'outil ; Annonces et Entraide restent au quotidien", () => {
    expect(isToolPath("/admin/small-missions")).toBe(false);
    expect(isToolPath("/admin/listings")).toBe(false);
    expect(isToolPath("/admin/reports")).toBe(true);
    expect(isToolPath("/admin/traffic")).toBe(false);
  });

  it("mode replié : une seule icône Outils, qui déplie le menu sur les outils", async () => {
    localStorage.setItem("admin.sidebar.collapsed", "1");
    rpcSpy.mockResolvedValue({ data: RAW, error: null });
    wrap(<AdminSidebar />);
    const icon = screen.getByTestId("admin-tools-collapsed");
    expect(screen.queryByText("Santé email")).toBeNull();
    fireEvent.click(icon);
    expect(await screen.findByText("Santé email")).toBeTruthy();
  });
});

describe("nouveautés : compteur gris sur Annonces et Entraide", () => {
  it("repère : dernière ouverture de la page, sinon 7 jours", () => {
    const now = Date.parse("2026-11-09T18:00:00Z");
    expect(readNewsSince("listings", "admin-1", now)).toBe(new Date(now - NEWS_DEFAULT_WINDOW_MS).toISOString());
    markAdminNewsSeen("/admin/listings", "admin-1", now);
    expect(readNewsSince("listings", "admin-1", now + 1000)).toBe(new Date(now).toISOString());
    expect(readNewsSince("entraide", "admin-1", now)).toBe(new Date(now - NEWS_DEFAULT_WINDOW_MS).toISOString());
    // Le repère par défaut est gardé : il ne bouge plus d'un affichage à l'autre.
    expect(readNewsSince("entraide", "admin-1", now + 60_000)).toBe(new Date(now - NEWS_DEFAULT_WINDOW_MS).toISOString());
    expect(newsKeyForPath("/admin/small-missions")).toBe("entraide");
    expect(newsKeyForPath("/admin")).toBeNull();
  });

  it("compteurs gris, hors pastille rouge, lus sur published_at et sur les besoins visibles", async () => {
    newsCounts.sits = 3;
    newsCounts.small_missions = 1;
    rpcSpy.mockResolvedValue({ data: RAW, error: null });
    wrap(<AdminSidebar />);
    const listings = await screen.findByTitle("3 nouvelles annonces depuis votre dernière visite");
    expect(listings.closest("a")?.getAttribute("href")).toBe("/admin/listings");
    expect(screen.getByTitle("1 nouveau besoin d'entraide depuis votre dernière visite").closest("a")?.getAttribute("href")).toBe("/admin/small-missions");
    expect(screen.getAllByTestId("admin-badge")).toHaveLength(1);
    const sits = newsReads.find((r) => r.table === "sits")!;
    expect(sits.ops.map(([k]) => k)).toEqual(expect.arrayContaining(["gte", "in"]));
    expect(sits.ops.find(([k]) => k === "gte")?.[1][0]).toBe("published_at");
    const missions = newsReads.find((r) => r.table === "small_missions")!;
    expect(missions.ops).toContainEqual(["eq", ["mission_type", "besoin"]]);
    expect(missions.ops).toContainEqual(["is", ["moderation_hidden_at", null]]);
  });

  it("le bouton du menu mobile : la pastille rouge ne compte que les choses à faire, les nouveautés ont leur compteur gris à part (lot ADM19)", async () => {
    newsCounts.sits = 4;
    rpcSpy.mockResolvedValue({ data: RAW, error: null });
    wrap(<AdminLayout />, "/admin/traffic");
    const btn = await screen.findByTestId("admin-mobile-menu-button");
    await waitFor(() => expect(within(btn).getByTestId("admin-badge").textContent).toBe(String(LINES)));
    // Lot ADM19 : la pastille rouge reste égale à la liste de travail, le gris vient en plus.
    await waitFor(() => expect(within(btn).getByTestId("admin-news").textContent).toBe("4"));
    expect(within(btn).getAllByTestId("admin-badge")).toHaveLength(1);
  });

  it("ouvrir Annonces efface son compteur", async () => {
    newsCounts.sits = 2;
    rpcSpy.mockResolvedValue({ data: RAW, error: null });
    wrap(<AdminLayout />, "/admin/listings");
    await waitFor(() => expect(Date.now() - Date.parse(readNewsSince("listings", "admin-1"))).toBeLessThan(60_000));
  });
});

describe("erreurs du site ouvertes depuis plus de 24 h", () => {
  it("une ligne dans la famille du site, verbe en tête, lien vers les erreurs", () => {
    const m = buildWorkList({ ...RAW, queues: [{ key: "errorsOld", count: 2, oldest: "2026-11-01T08:00:00Z" }] });
    const line = m.items.find((i) => i.type === "queue:errorsOld")!;
    expect(line.family).toBe("site");
    expect(line.title).toBe("Corriger 2 erreurs du site ouvertes depuis plus de 24 h");
    expect(isVerbFirst(line.title)).toBe(true);
    expect(line.link).toBe("/admin/errors");
    expect(line.detail).toBe("La plus ancienne date du 01/11.");
    expect(MIGRATION).toContain("first_seen_at <= now() - interval '24 hours'");
  });
});

describe("la liste : « Voir » sur chaque ligne", () => {
  it("chaque bouton de ligne dit « Voir », la phrase porte le verbe", async () => {
    rpcSpy.mockResolvedValue({ data: RAW, error: null });
    wrap(<TodaySection />);
    const lines = await screen.findAllByTestId("pilotage-line");
    expect(lines).toHaveLength(LINES);
    for (const l of lines) {
      // Lot ADM16 : les liens des éléments nommés s'ajoutent, le bouton reste « Voir ».
      const buttons = [...l.querySelectorAll("button, a")].filter((b) => !b.closest('[data-testid="pilotage-elements"]'));
      expect(buttons.map((b) => b.textContent)).toEqual(["Voir"]);
    }
    expect(screen.getByTestId("pilotage-count").textContent).toBe(`${LINES} choses à faire`);
  });

  it("les files signalées jusqu'ici par une pastille ont leur ligne, verbe en tête et route réelle", () => {
    for (const key of ["reviewsModeration", "experiences", "skills", "guideRequests", "analysisRequests", "errorsOld"]) {
      const c = QUEUE_COPY[key];
      expect(c, key).toBeDefined();
      for (const k of [1, 2]) expect(isVerbFirst(c.title(k)), c.title(k)).toBe(true);
      expect(APP).toContain(`path="${c.link}"`);
      expect(MIGRATION).toContain(`'key', '${key}'`);
    }
    const m = buildWorkList(RAW);
    expect(m.items.find((i) => i.type === "queue:reviewsModeration")?.title).toBe("Valider 1 avis d'annulation");
  });

  it("migration : contrat de production, lecture réservée au service", () => {
    expect(read("scripts/db/production-contracts.json")).toContain("0127_adm14_files_completes.sql");
    expect(MIGRATION).toContain("GRANT EXECUTE ON FUNCTION public.admin_human_queues() TO service_role");
    expect(MIGRATION).toContain("REVOKE ALL ON FUNCTION public.admin_human_queues() FROM PUBLIC, anon, authenticated");
  });
});

describe("état du site : même lecture, voyants touchables, détail une fois", () => {
  it("voyant avec lien : lien ; rouge : renvoi vers la liste, sans répéter la phrase", async () => {
    rpcSpy.mockResolvedValue({ data: RAW, error: null });
    wrap(<SiteHealthStrip />);
    const chips = await screen.findAllByTestId("site-health-chip");
    expect(chips).toHaveLength(3);
    expect(chips[0].getAttribute("href")).toBe("/admin?plus=taches");
    expect(chips[1].getAttribute("href")).toBe("/admin/emails");
    expect(chips[2].tagName).toBe("SPAN");
    expect(screen.getByTestId("site-health-alerts").textContent).toContain("ouvre la liste ci-dessous");
    expect(screen.getByTestId("site-health-alerts").textContent).not.toContain("Dernier passage en échec");
    expect(rpcSpy).not.toHaveBeenCalledWith("admin_site_health");
  });

  it("source en échec : « lecture impossible », jamais vert", async () => {
    rpcSpy.mockResolvedValue({ data: { ...RAW, sources: { ...RAW.sources, health: false }, health: [] }, error: null });
    wrap(<SiteHealthStrip />);
    expect((await screen.findByTestId("site-health")).textContent).toContain("lecture impossible");
  });

  it("pendant le chargement, une forme tient la place", () => {
    rpcSpy.mockReturnValue(new Promise(() => {}));
    wrap(<SiteHealthStrip />);
    expect(screen.getByTestId("site-health-loading")).toBeTruthy();
  });

  it("signaux techniques : familles réelles, et « lecture impossible » en échec", async () => {
    expect(technicalFamiliesText([{ signal_type: "email_delivery_low" }, { signal_type: "sit_publish_error" }, { signal_type: "email_queue_failures" }]))
      .toBe("emails, annonces");
    const err = vi.spyOn(console, "error").mockImplementation(() => {});
    rpcSpy.mockResolvedValue({ data: null, error: { message: "boom" } });
    wrap(<TechnicalSignalsLine />);
    expect(await screen.findByTestId("pilotage-technique-error", undefined, { timeout: 4000 })).toBeTruthy();
    err.mockRestore();
  });
});

describe("le site s'en charge : replié, synthèse le lundi", () => {
  const HEBDO: WorkListRaw = { ...RAW, signals: [...(RAW.signals ?? []), sig("h", "dormant_sitter")] };
  const MONDAY = Date.parse("2026-11-09T09:00:00Z");
  const TUESDAY = Date.parse("2026-11-10T09:00:00Z");

  it("le lundi à Paris, et seulement lui", () => {
    expect(isMondayInParis(MONDAY)).toBe(true);
    expect(isMondayInParis(TUESDAY)).toBe(false);
    // Dimanche 23 h 30 UTC = lundi 0 h 30 à Paris.
    expect(isMondayInParis(Date.parse("2026-11-08T23:30:00Z"))).toBe(true);
  });

  it("replié par défaut, détail lu à l'ouverture", async () => {
    rpcSpy.mockResolvedValue({ data: HEBDO, error: null });
    wrap(<SystemSection now={TUESDAY} />);
    const section = await screen.findByTestId("pilotage-systeme");
    expect(within(section).getByRole("button", { name: "Voir" }).getAttribute("aria-expanded")).toBe("false");
    expect(screen.queryByTestId("pilotage-hebdo")).toBeNull();
  });

  it("la synthèse de la semaine s'affiche le lundi", async () => {
    rpcSpy.mockResolvedValue({ data: HEBDO, error: null });
    wrap(<SystemSection now={MONDAY} />);
    expect((await screen.findByTestId("pilotage-hebdo")).textContent).toMatch(/^Synthèse de la semaine : /);
  });
});

describe("Ignorer : confirmation et Annuler", () => {
  it("rien n'est écrit avant la confirmation, le nombre est dit", async () => {
    wrap(<IgnoreSignalsButton ids={["s1", "s2", "s3"]} label="Tout ignorer" />);
    fireEvent.click(screen.getByRole("button", { name: "Tout ignorer" }));
    expect(await screen.findByText("Ignorer ces 3 signaux ?")).toBeTruthy();
    expect(updates).toHaveLength(0);
    fireEvent.click(screen.getByRole("button", { name: "Garder" }));
    expect(updates).toHaveLength(0);
  });

  it("confirmer ferme les signaux encore ouverts, Annuler les rouvre pendant 10 secondes", async () => {
    wrap(<IgnoreSignalsButton ids={["s1"]} />);
    fireEvent.click(screen.getByRole("button", { name: "Ignorer" }));
    const dialog = await screen.findByRole("alertdialog");
    fireEvent.click(within(dialog).getByRole("button", { name: "Ignorer" }));
    await waitFor(() => expect(updates).toHaveLength(1));
    expect(updates[0].values).toMatchObject({ action_taken: "dismissed", admin_id: "admin-1" });
    expect(updates[0].ids).toEqual(["s1"]);
    expect(updates[0].filter).toBe("is:resolved_at");
    await waitFor(() => expect(toastSuccess).toHaveBeenCalled());
    const [msg, opts] = toastSuccess.mock.calls[0] as [string, { duration: number; action: { label: string; onClick: () => Promise<void> } }];
    expect(msg).toBe("Signal ignoré.");
    expect(opts.duration).toBe(10_000);
    expect(opts.action.label).toBe("Annuler");
    await opts.action.onClick();
    expect(updates[1].values).toEqual({ resolved_at: null, action_taken: null, admin_id: null });
    expect(updates[1].filter).toBe("eq:action_taken=dismissed");
    expect(ignoreConfirmTitle(1)).toBe("Ignorer ce signal ?");
  });

  it("toutes les cartes passent par ce bouton, aucune écriture « dismissed » ailleurs", () => {
    const dir = "src/components/admin/signals";
    for (const f of readdirSync(dir).filter((x) => x.endsWith(".tsx") && x !== "IgnoreSignalsButton.tsx")) {
      const src = read(`${dir}/${f}`);
      expect(src, f).not.toContain('"dismissed"');
      if (src.includes("Ignorer") || src.includes("ignorer")) expect(src, f).toContain("IgnoreSignalsButton");
    }
  });
});

describe("textes et code mort", () => {
  it("dates sans secondes, jargon de priorité retiré", () => {
    expect(shortDetectedAt("2026-11-09T13:05:42Z")).toBe("9 nov. à 14 h 05");
    expect(existsSync("src/components/admin/signals/PriorityBadge.tsx")).toBe(false);
    for (const f of readdirSync("src/components/admin/signals")) {
      expect(read(`src/components/admin/signals/${f}`), f).not.toMatch(/Priorité \{|SIGNAL AUTOMATIQUE|Signal automatique/);
    }
  });

  it("ancienne file et ligne des membres retirées", () => {
    expect(existsSync("src/pages/admin/_components/dashboard/SignalsSection.tsx")).toBe(false);
    const src = [
      "src/pages/admin/_components/dashboard/PilotageBlocks.tsx",
      "src/pages/admin/_components/dashboard/signalEntries.tsx",
      "src/hooks/useAdminBadges.ts",
    ].map(read).join("\n");
    expect(src).not.toMatch(/<WaitingMembersLine|const WaitingMembersLine|rpc\("admin_menu_badges"|fetchAdminBadges/);
  });

  it("aucun tiret cadratin ni demi-cadratin dans les fichiers du lot", () => {
    for (const f of [
      "src/hooks/useWorkList.ts", "src/lib/admin/overviewText.ts", "src/components/admin/signals/IgnoreSignalsButton.tsx",
      "src/components/admin/AdminSidebar.tsx", "src/components/admin/AdminLayout.tsx",
      "src/pages/admin/_components/dashboard/PilotageBlocks.tsx", "src/pages/admin/_components/dashboard/SiteHealthStrip.tsx",
      "drizzle/migrations/0127_adm14_files_completes.sql",
    ]) expect(read(f), f).not.toMatch(/[–—]/);
  });
});
