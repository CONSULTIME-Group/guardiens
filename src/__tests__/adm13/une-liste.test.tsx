/**
 * Lot ADM13 (09/11/2026) : une fonction, une liste. La vue d'ensemble et
 * l'email du matin lisent public.admin_work_list et la même mise en forme
 * (supabase/functions/_shared/admin-work-list.ts).
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { readFileSync } from "node:fs";
import { render, screen, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import {
  buildWorkList,
  HEALTH_COVERED_TYPES,
  HEALTH_TITLES,
  isVerbFirst,
  QUEUE_COPY,
  WORK_COPY,
  WORK_FAMILY_ORDER,
  type PilotageSignal,
  type WorkListRaw,
} from "../../../supabase/functions/_shared/admin-work-list.ts";
import { AUTO_RELANCE_TEMPLATES, SIGNAL_TYPES, signalNature } from "../../../supabase/functions/_shared/admin-signal-config.ts";
import { workListDigestLines, workListNotices } from "../../../supabase/functions/alert-admin-signals/digest.ts";

const read = (p: string) => readFileSync(p, "utf8");
const MIGRATION = read("drizzle/migrations/0126_adm13_une_liste.sql");
const NOW = Date.parse("2026-11-09T06:00:00Z");

const sig = (type: string, severity: string, extra: Partial<PilotageSignal> = {}): PilotageSignal => ({
  id: `${type}-${Math.random()}`, signal_type: type, severity, entity_type: null, entity_id: null,
  detected_at: "2026-11-05T08:00:00Z", metadata: {}, ...extra,
});

// État du 09/11/2026 rejoué : une liste de travail typique.
const RAW: WorkListRaw = {
  sources: { signals: true, sits: true, queues: true, relances: true, health: true },
  signals: [
    sig("no_applications", "warning", { entity_type: "sit", entity_id: "far" }),
    sig("no_applications", "info", { entity_type: "sit", entity_id: "vabres" }),
    sig("stale_draft", "critical", { entity_type: "sit", entity_id: "soon" }),
    sig("pending_application", "warning", { entity_type: "application", entity_id: "a1", metadata: { sit_id: "far" } }),
    sig("alma_churn", "critical", { metadata: { title: "Paul, Lyon", admin_url: "https://guardiens.fr/admin/users?user=u1" } }),
    sig("alma_bug_report", "warning"),
    sig("mission_no_audience", "critical", { entity_type: "small_mission", entity_id: "m1" }),
    sig("identity_needs_review", "warning"),
    sig("email_queue_failures", "critical"),
    sig("sit_notification_claim_starvation", "critical"),
    sig("content_quality_drift", "warning"),
    sig("dormant_sitter", "warning"),
  ],
  sits: [
    { id: "far", title: "Garde à Gap", city: "Gap", start_date: "2026-12-20" },
    { id: "vabres", title: "Garde à Vabres", city: "Vabres-l'Abbaye", start_date: "2026-12-01" },
    { id: "soon", title: "Brouillon de Lyon", city: "Lyon", start_date: "2026-11-12" },
  ],
  queues: [
    { key: "contactMessages", count: 2, oldest: "2026-11-07T06:00:00Z" },
    { key: "verifications", count: 1, oldest: null },
    { key: "reports", count: 0, oldest: null },
  ],
  relances_failed_7d: 3,
  health: [
    { key: "tasks", label: "Tâches planifiées", state: "alert", detail: "Dernier passage en échec ou en retard : Récapitulatif", link: "/admin?plus=taches" },
    { key: "emails", label: "Emails", state: "ok", detail: "File d'envoi normale", link: "/admin/emails" },
  ],
};

describe("chaque ligne dit quoi faire et où", () => {
  const listable = Object.entries(SIGNAL_TYPES)
    .filter(([t, c]) => !c.deprecated && signalNature(t) !== "hebdo")
    .map(([t]) => t);

  it.each(listable)("%s a une phrase avec verbe, un bouton et un lien", (t) => {
    const c = WORK_COPY[t];
    expect(c, `${t} sans entrée dans WORK_COPY`).toBeDefined();
    for (const k of [1, 3]) expect(isVerbFirst(c.title(k)), c.title(k)).toBe(true);
    expect(c.action.length).toBeGreaterThan(0);
    expect(c.link.startsWith("/admin")).toBe(true);
    expect(c.title(3)).not.toMatch(/[\u2013\u2014]/);
  });

  it("chaque file humaine et chaque voyant ont leur phrase", () => {
    const queueKeys = [...read("drizzle/migrations/0091_adm2_file_matin.sql").matchAll(/'key', '([a-zA-Z]+)'/g)].map((m) => m[1]);
    expect(queueKeys.length).toBe(5);
    for (const k of queueKeys) expect(isVerbFirst(QUEUE_COPY[k].title(2))).toBe(true);
    const healthKeys = [...new Set([...read("drizzle/migrations/0121_adm12_rouges_vrais.sql").matchAll(/'key', '([a-z]+)'/g)].map((m) => m[1]))];
    for (const k of healthKeys) expect(isVerbFirst(HEALTH_TITLES[k]), k).toBe(true);
  });
});

describe("une liste, mêmes lignes à l'écran et dans l'email", () => {
  const model = buildWorkList(RAW, NOW);

  it("familles dans l'ordre, une seule ligne par cause", () => {
    const fam = model.items.map((i) => i.family);
    expect([...fam].sort((a, b) => WORK_FAMILY_ORDER.indexOf(a) - WORK_FAMILY_ORDER.indexOf(b))).toEqual(fam);
    expect(model.items.map((i) => i.title)).toEqual([
      "Vérifier les tâches planifiées",
      "Vérifier la diffusion des annonces aux gardiens",
      "Écrire au propriétaire dont le brouillon part dans 3 jours",
      "Répondre à 2 messages de contact",
      "Contrôler 1 pièce d'identité",
      "Diffuser 2 annonces sans candidature après 48 heures",
      "Écrire au membre qui veut partir",
      "Reproduire le problème signalé à Alma",
      "Relayer 1 coup de main : tout le monde à 30 km a été prévenu",
      "Vérifier 3 relances automatiques en échec",
    ]);
  });

  it("panne portée par un voyant lu, file humaine et relance seule : jamais deux fois", () => {
    expect(HEALTH_COVERED_TYPES.has("email_queue_failures")).toBe(true);
    expect(model.items.some((i) => i.type === "email_queue_failures")).toBe(false);
    expect(model.items.some((i) => i.type === "identity_needs_review")).toBe(false);
    expect(model.items.some((i) => i.type === "pending_application")).toBe(false);
    expect(model.autoTotal).toBe(1);
    expect(model.technique.map((s) => s.signal_type).sort()).toEqual(["content_quality_drift", "email_queue_failures", "sit_notification_claim_starvation"]);
  });

  it("longueur de la liste = lignes de l'email = somme des sources recalculée", () => {
    const lines = workListDigestLines(model, NOW);
    expect(lines).toHaveLength(model.items.length);
    // Recalcul à la main sur RAW : 1 voyant rouge, 1 panne technique critique hors voyant
    // (claim_starvation), 1 brouillon à 3 jours du départ, 2 files non vides (contact,
    // vérifications), 4 types « seul vous » (annonces sans candidature, churn, bug, entraide),
    // 1 ligne de relances en échec. L'identité à contrôler est comptée par sa file.
    expect(lines).toHaveLength(1 + 1 + 1 + 2 + 4 + 1);
    expect(lines.every((l) => l.link.startsWith("https://guardiens.fr/admin"))).toBe(true);
  });

  it("le portage du test Deno : ordre « en retard » d'abord", () => {
    const m = buildWorkList({ signals: [sig("suspicious_account", "warning"), sig("suspicious_account", "warning"), sig("alma_churn", "critical", { detected_at: "2026-11-04T08:00:00Z" })] }, NOW);
    expect(m.items.map((i) => i.title)).toEqual(["Écrire au membre qui veut partir", "Examiner 2 comptes suspects"]);
  });

  it("une pièce d'identité orpheline garde sa ligne : la file des vérifications ne la compte pas", () => {
    const m = buildWorkList({ ...RAW, signals: [sig("identity_orphan_documents", "warning")], queues: [{ key: "verifications", count: 0, oldest: null }] }, NOW);
    expect(m.items.map((i) => i.type)).toContain("identity_orphan_documents");
  });

  it("état du site illisible : la panne d'envoi garde sa ligne", () => {
    const m = buildWorkList({ ...RAW, sources: { ...RAW.sources, health: false }, health: [] }, NOW);
    expect(m.items.some((i) => i.type === "email_queue_failures")).toBe(true);
    expect(m.unavailable).toEqual(["health"]);
  });

  it("la file des messages de contact cite le message reçu depuis Alma (lot J1)", () => {
    const m = buildWorkList({
      signals: [sig("alma_contact_request", "critical", { metadata: { title: "Lucie, Nantes", messages: [{ text: "Je voudrais vous parler de ma garde" }] } })],
      queues: [{ key: "contactMessages", count: 1, oldest: "2026-11-08T06:00:00Z" }],
    }, NOW);
    expect(m.items).toHaveLength(1);
    expect(m.items[0].elements[0].label).toBe("Lucie, Nantes : « Je voudrais vous parler de ma garde »");
  });

  it("deux candidatures d'une annonce : un seul élément, au-delà de cinq « et N autres »", () => {
    const sits = Array.from({ length: 7 }, (_, i) => ({ id: `s${i}`, title: `Garde ${i}`, city: "Gap", start_date: "2026-11-12" }));
    const signals = [
      sig("pending_application", "warning", { metadata: { sit_id: "s0" } }),
      sig("pending_application", "warning", { metadata: { sit_id: "s0" } }),
      ...sits.slice(1).map((x) => sig("no_applications", "warning", { entity_type: "sit", entity_id: x.id })),
    ];
    const m = buildWorkList({ signals, sits }, NOW);
    const pending = m.items.find((i) => i.type === "pending_application")!;
    expect(pending.elements).toHaveLength(1);
    const diffuse = workListDigestLines(m, NOW).find((l) => l.signalTypes.includes("no_applications"))!;
    expect(diffuse.elements).toHaveLength(5);
    expect(diffuse.moreCount).toBe(1);
  });

  it("un élément porte son lien exact et le nom de l'annonce", () => {
    const churn = model.items.find((i) => i.type === "alma_churn")!;
    expect(churn.elements[0]).toEqual({ label: "Paul, Lyon", link: "/admin/users?user=u1" });
    const diffuse = model.items.find((i) => i.type === "no_applications")!;
    expect(diffuse.elements.map((e) => e.label)).toEqual(expect.arrayContaining(["Garde à Gap, Gap", "Garde à Vabres, Vabres-l'Abbaye"]));
    expect(diffuse.link).toBe("/admin/listings?filter=to_staff");
  });

  it("une source illisible se dit, la liste ne prétend jamais au calme", () => {
    const m = buildWorkList({ ...RAW, sources: { ...RAW.sources, queues: false }, queues: [] }, NOW);
    expect(m.unavailable).toEqual(["queues"]);
    expect(workListNotices(m)[0]).toBe("Lecture impossible : files des membres. La liste est incomplète.");
    // Sans la file, les vérifications d'identité gardent leur ligne de signal.
    expect(m.items.some((i) => i.type === "identity_needs_review")).toBe(true);
  });
});

describe("base : une lecture, des définitions resserrées", () => {
  it("admin_work_list lit toutes les sources, chacune avec son état", () => {
    for (const k of ["'signals', ok_signals", "'sits', ok_sits", "'queues', ok_queues", "'relances', ok_relances", "'health', ok_health"]) expect(MIGRATION).toContain(k);
    expect(MIGRATION).toContain("public.admin_human_queues()");
    expect(MIGRATION).toContain("public.admin_site_health()");
    expect(MIGRATION).toMatch(/REVOKE ALL ON FUNCTION public\.admin_work_list\(\) FROM PUBLIC, anon;/);
  });

  it("gabarits des relances identiques à AUTO_RELANCE_TEMPLATES", () => {
    const arr = MIGRATION.match(/template_name = ANY \(ARRAY\[([^\]]+)\]\)/)![1];
    expect(arr.split(",").map((x) => x.trim().replace(/'/g, ""))).toEqual(AUTO_RELANCE_TEMPLATES);
  });

  it("candidatures sans réponse : en attente, vues ou en discussion, garde non commencée", () => {
    expect(MIGRATION).toContain("a.status IN ('pending', 'viewed', 'discussing')");
    expect(MIGRATION).toContain("s.start_date::date >= (now() AT TIME ZONE 'Europe/Paris')::date");
  });

  it("un tarif = un montant avec sa monnaie, les mots seuls ne suffisent plus", () => {
    const fn = MIGRATION.slice(MIGRATION.indexOf("FUNCTION public.looks_like_pricing"), MIGRATION.indexOf("$function$;", MIGRATION.indexOf("FUNCTION public.looks_like_pricing")));
    expect(fn).not.toMatch(/tarif\|devis/);
    expect(fn).toContain("€|eur(os?)?");
    expect(MIGRATION).toContain("auto_resolved_sans_montant");
  });
});

// ── Rendu de la vue d'ensemble ───────────────────────────────────────────────

const { rpcSpy } = vi.hoisted(() => ({ rpcSpy: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: { rpc: (...a: unknown[]) => rpcSpy(...a), from: vi.fn() },
}));
vi.mock("@/hooks/useFeatureFlag", () => ({ useFeatureFlag: () => ({ enabled: true, loading: false }) }));
// Lot ADM14 : la liste est lue par useWorkList, une fois l'admin connu.
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => ({ user: { id: "admin-1" }, logout: vi.fn() }) }));
vi.mock("@/hooks/useAdmin", () => ({ useAdmin: () => ({ isAdmin: true, loading: false }) }));
vi.mock("@/lib/admin/readError", async (orig) => ({ ...(await orig<Record<string, unknown>>()), reportAdminReadError: vi.fn() }));

import { TodaySection } from "@/pages/admin/_components/dashboard/PilotageBlocks";

const renderToday = () => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={qc}><MemoryRouter><TodaySection /></MemoryRouter></QueryClientProvider>);
};

describe("vue d'ensemble rendue", () => {
  beforeEach(() => rpcSpy.mockReset());

  it("affiche toute la liste, une lecture, le compte égal aux lignes", async () => {
    rpcSpy.mockResolvedValue({ data: RAW, error: null });
    renderToday();
    expect(await screen.findByText("Répondre à 2 messages de contact")).toBeTruthy();
    const lines = screen.getAllByTestId("pilotage-line");
    expect(screen.getByTestId("pilotage-count").textContent).toBe(`${lines.length} lignes`);
    expect(lines).toHaveLength(buildWorkList(RAW).items.length);
    expect(rpcSpy).toHaveBeenCalledTimes(1);
    expect(rpcSpy).toHaveBeenCalledWith("admin_work_list");
    // Une ligne sans signal mène à sa file.
    const contact = lines.find((l) => l.textContent?.includes("messages de contact"))!;
    expect(within(contact).getByRole("link").getAttribute("href")).toBe("/admin/contact-messages");
  });

  it("source en échec : la liste le dit", async () => {
    rpcSpy.mockResolvedValue({ data: { ...RAW, sources: { ...RAW.sources, health: false }, health: [] }, error: null });
    renderToday();
    expect((await screen.findByTestId("pilotage-unavailable")).textContent).toContain("état du site");
  });

  it("lecture en échec : phrase d'erreur, jamais « tout est à jour »", async () => {
    rpcSpy.mockResolvedValue({ data: null, error: { message: "boom" } });
    renderToday();
    expect(await screen.findByTestId("pilotage-error", undefined, { timeout: 4000 })).toBeTruthy();
    expect(screen.queryByText("Tout est à jour aujourd'hui.")).toBeNull();
  });
});
