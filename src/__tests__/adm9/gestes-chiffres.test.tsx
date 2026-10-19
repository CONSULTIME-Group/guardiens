import { describe, it, expect, vi, beforeEach } from "vitest";
import { readFileSync } from "node:fs";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fetchAllRows } from "@/lib/admin/fetchAllRows";
import { checkLink, prefilledLink, SIT_LINK_LABEL } from "@/lib/admin/personalMessageLink";
import {
  countPlacesByGuide, distinctCohortPeople, rateOf, ONBOARDING_DEFINITION,
  massOutcome, deferredSentByCampaign, proximityStats, MASS_OUTCOME_LABELS,
} from "@/lib/admin/trueCounts";
import { validateAdminPersonalInput } from "../../../supabase/functions/_shared/admin-personal-message";

// Données fictives : identifiants générés, aucune donnée personnelle.
const uuid = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const DASHES = new RegExp("[\\u2013\\u2014]");
const read = (p: string) => readFileSync(p, "utf8");

const tables: Record<string, any[]> = {};
const rpcs: Record<string, any> = {};
const invoked: any[] = [];
vi.mock("@/lib/analytics", () => ({ trackEvent: vi.fn() }));
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => ({ user: { id: "admin" } }) }));
vi.mock("@/integrations/supabase/client", () => {
  const builder = (table: string): any => {
    const res = () => ({ data: tables[table] ?? [], error: null, count: (tables[table] ?? []).length });
    const q: any = new Proxy({}, {
      get: (_t, k) => {
        if (k === "then") return (r: any) => r(res());
        if (k === "single" || k === "maybeSingle") return async () => ({ data: (tables[table] ?? [])[0] ?? null, error: null });
        return () => q;
      },
    });
    return q;
  };
  return { supabase: {
    from: (t: string) => builder(t),
    rpc: async (n: string) => ({ data: rpcs[n] ?? null, error: null }),
    functions: { invoke: async (_n: string, opts: any) => { invoked.push(opts.body); return { data: { html: "<p>ok</p>" }, error: null }; } },
    auth: { getUser: async () => ({ data: { user: null } }), onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }) },
    channel: () => ({ on: () => ({ subscribe: () => ({}) }), subscribe: () => ({}) }),
    removeChannel: () => {},
  } };
});

const wrap = (el: React.ReactNode) => render(
  <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
    <MemoryRouter>{el}</MemoryRouter>
  </QueryClientProvider>,
);

beforeEach(() => {
  for (const k of Object.keys(tables)) delete tables[k];
  for (const k of Object.keys(rpcs)) delete rpcs[k];
  invoked.length = 0;
});

describe("ADM9 · 1. Écrire au propriétaire", () => {
  it("adresse de l'annonce préremplie avec son libellé, acceptée telle quelle par le serveur", () => {
    const link = prefilledLink(uuid(1));
    expect(link).toEqual({ linkLabel: SIT_LINK_LABEL, linkUrl: `https://guardiens.fr/sits/${uuid(1)}` });
    const server = validateAdminPersonalInput({ mode: "send", recipientUserId: uuid(2), subject: "Objet", body: "Texte", ...link, sitId: uuid(1) });
    expect(server.ok).toBe(true);
    expect(prefilledLink(undefined)).toEqual({ linkLabel: "", linkUrl: "" });
  });

  it("le contrôle client rend le même verdict que le serveur", () => {
    const cases: Array<[string, string]> = [
      ["", ""], [SIT_LINK_LABEL, ""], ["", "https://guardiens.fr/sits/x"], [SIT_LINK_LABEL, "http://guardiens.fr"],
      ["x".repeat(61), "https://guardiens.fr"], [" Voir ", " https://guardiens.fr/a "], [SIT_LINK_LABEL, "https://guardiens.fr/sits/x"],
    ];
    for (const [label, url] of cases) {
      const client = checkLink(label, url);
      const server = validateAdminPersonalInput({ mode: "preview", subject: "Objet", body: "Texte", linkLabel: label, linkUrl: url });
      expect(client.ok, `${label} | ${url}`).toBe(server.ok);
      if (!server.ok) expect(client.error).toBe((server as { error: string }).error);
    }
  });

  it("rendu : aperçu envoyé tel quel avec le lien prérempli entier", async () => {
    const { WriteToMemberDialog } = await import("@/pages/admin/_components/users/WriteToMemberDialog");
    wrap(<WriteToMemberDialog target={{ userId: uuid(2), userName: "le propriétaire", sitId: uuid(1) }} onClose={() => {}} />);
    expect((screen.getByLabelText("Libellé du lien") as HTMLInputElement).value).toBe(SIT_LINK_LABEL);
    fireEvent.change(screen.getByLabelText("Objet"), { target: { value: "Votre annonce" } });
    fireEvent.change(screen.getByLabelText(/^Texte/), { target: { value: "Bonjour" } });
    const preview = screen.getByRole("button", { name: "Aperçu" }) as HTMLButtonElement;
    expect(preview.disabled).toBe(false);
    fireEvent.click(preview);
    await waitFor(() => expect(invoked).toHaveLength(1));
    expect(invoked[0]).toMatchObject({ mode: "preview", linkLabel: SIT_LINK_LABEL, linkUrl: `https://guardiens.fr/sits/${uuid(1)}`, sitId: uuid(1) });
    expect(validateAdminPersonalInput(invoked[0]).ok).toBe(true);
  });

  it("rendu : un lien incomplet bloque l'aperçu avec le message du serveur", async () => {
    const { WriteToMemberDialog } = await import("@/pages/admin/_components/users/WriteToMemberDialog");
    wrap(<WriteToMemberDialog target={{ userId: uuid(2), userName: "le propriétaire", sitId: uuid(1) }} onClose={() => {}} />);
    fireEvent.change(screen.getByLabelText("Objet"), { target: { value: "Votre annonce" } });
    fireEvent.change(screen.getByLabelText(/^Texte/), { target: { value: "Bonjour" } });
    fireEvent.change(screen.getByLabelText("Libellé du lien"), { target: { value: "" } });
    expect(screen.getByTestId("wtm-link-error").textContent).toBe("Le lien demande un libellé et une adresse.");
    expect((screen.getByRole("button", { name: "Aperçu" }) as HTMLButtonElement).disabled).toBe(true);
  });

  it("aucun changement de la fonction serveur", () => {
    expect(read("supabase/functions/_shared/admin-personal-message.ts")).toContain('if (!!linkLabel !== !!linkUrl) return { ok: false, error: "Le lien demande un libellé et une adresse." };');
  });
});

describe("ADM9 · 2a. Lieux par guide", () => {
  it("2 757 lieux sur 107 guides lus par pages : chaque guide garde son vrai nombre", async () => {
    const places: Array<{ id: string; city_guide_id: string }> = [];
    const expected: Record<string, number> = {};
    for (let g = 0; g < 107; g++) {
      const n = 13 + (g % 28); // 13 à 40 lieux
      expected[uuid(g)] = n;
      for (let i = 0; i < n; i++) places.push({ id: `${g}-${i}`, city_guide_id: uuid(g) });
    }
    const total = places.length;
    const { rows, pages } = await fetchAllRows(async (from, to) => ({ data: places.slice(from, to + 1), error: null }));
    expect(pages).toBeGreaterThan(1);
    const counts = countPlacesByGuide(rows);
    expect(Object.keys(counts)).toHaveLength(107);
    expect(counts).toEqual(expected);
    expect(Object.values(counts).reduce((a, b) => a + b, 0)).toBe(total);
    // L'ancien calcul sur la seule première réponse (plafond 1 000) laissait des guides à 0.
    const capped = countPlacesByGuide(places.slice(0, 1000));
    expect(Object.keys(capped).length).toBeLessThan(107);
  });

  it("l'écran lit city_guide_places par pages, sur un ordre stable", () => {
    const src = read("src/pages/admin/AdminGuides.tsx");
    const block = src.slice(src.indexOf("admin-guide-place-counts"), src.indexOf("admin-guide-requests"));
    expect(block).toContain("fetchAllRows");
    expect(block).toContain('.order("id", { ascending: true })');
    expect(block).toContain(".range(from, to)");
    expect(block).toContain("countPlacesByGuide(rows)");
  });
});

describe("ADM9 · 2b. Onboarding en personnes distinctes", () => {
  it("cohorte de 56, 100 événements pour 44 personnes dont 40 de la cohorte : 71 %", () => {
    const cohort = Array.from({ length: 56 }, (_, i) => uuid(i));
    const events: string[] = [];
    for (let p = 0; p < 40; p++) events.push(cohort[p], cohort[p]); // 80 événements, 40 personnes de la cohorte
    for (let p = 0; p < 4; p++) for (let k = 0; k < 5; k++) events.push(uuid(900 + p)); // 20 événements hors cohorte
    expect(events).toHaveLength(100);
    expect(new Set(events).size).toBe(44);
    const people = distinctCohortPeople(cohort, events);
    expect(people).toBe(40);
    expect(rateOf(people, cohort.length)).toBe(71);
    // Ancien calcul : événements / comptes, plafonné à 100.
    expect(Math.min(100, Math.round((events.length / cohort.length) * 100))).toBe(100);
  });

  it("le taux n'est pas plafonné et la définition est écrite sous la tuile", async () => {
    expect(rateOf(3, 2)).toBe(150);
    expect(rateOf(1, 0)).toBe(0);
    const src = read("src/pages/admin/AdminAnalytics.tsx");
    expect(src).toContain("activationRate: rateOf(onboardedPeople, realSignups)");
    expect(src).toContain("definition={ONBOARDING_DEFINITION}");
    expect(src).toContain('.eq("event_type", "onboarding_completed")');
    const { ConversionTile } = await import("@/pages/admin/AdminAnalytics");
    render(<ConversionTile label="Compte créé → Onboarding terminé" value={71} hint="40 / 56 personnes" definition={ONBOARDING_DEFINITION} />);
    expect(screen.getByText("71%")).toBeTruthy();
    expect(screen.getByText(ONBOARDING_DEFINITION)).toBeTruthy();
    expect(ONBOARDING_DEFINITION).not.toMatch(DASHES);
  });
});

describe("ADM9 · 2c et 3. Abonnements", () => {
  const seed = () => {
    tables.subscriptions = [{ id: uuid(500), user_id: uuid(1), plan: "founder_free", status: "active", started_at: "2026-05-13", expires_at: null }];
    tables.profiles = Array.from({ length: 197 }, (_, i) => ({ id: uuid(i + 1), first_name: "Membre", last_name: "Test", role: "sitter", is_founder: true, avatar_url: null }));
  };

  it("« Fondateurs actifs » lit profiles.is_founder : 197", async () => {
    seed();
    const Page = (await import("@/pages/admin/AdminSubscriptions")).default;
    const { container } = wrap(<Page />);
    await waitFor(() => expect(screen.getByText("197")).toBeTruthy());
    expect(screen.getByText("Fondateurs actifs").previousElementSibling?.textContent).toBe("197");
    expect(container.textContent).not.toMatch(DASHES);
    const src = read("src/pages/admin/AdminSubscriptions.tsx");
    expect(src).toContain('.eq("is_founder", true)');
    expect(src).not.toContain('s.plan === "founder_free" && s.status === "active"');
  });

  it("gestes d'écriture désactivés tant que PRICING_IS_ACTIVE vaut false, phrase affichée", async () => {
    seed();
    const mod = await import("@/pages/admin/AdminSubscriptions");
    expect(mod.SUBSCRIPTION_WRITES_ENABLED).toBe(false);
    wrap(<mod.default />);
    await waitFor(() => expect(screen.getByTestId("subscriptions-free-notice").textContent).toBe(mod.SUBSCRIPTION_FREE_NOTICE));
    expect(mod.SUBSCRIPTION_FREE_NOTICE.startsWith("Guardiens est gratuit")).toBe(true);
    for (const title of ["Prolonger", "Révoquer Fondateur", "Attribuer Fondateur"]) expect(screen.queryByTitle(title)).toBeNull();
    const writeButtons = screen.getAllByTitle(mod.SUBSCRIPTION_FREE_NOTICE) as HTMLButtonElement[];
    expect(writeButtons).toHaveLength(2); // prolonger + badge fondateur
    for (const b of writeButtons) expect(b.disabled).toBe(true);
    const src = read("src/pages/admin/AdminSubscriptions.tsx");
    expect(src).toContain("if (!SUBSCRIPTION_WRITES_ENABLED) return;");
    expect(src).toContain("export const SUBSCRIPTION_WRITES_ENABLED = PRICING_IS_ACTIVE;");
  });
});

describe("ADM9 · 2d. Envois « Terminé » à 0 envoyé", () => {
  const sitA = uuid(700);
  const sitB = uuid(701);
  const campaigns = [
    { id: uuid(10), segment: "listing_proximity", created_at: "2026-09-10T04:28:34Z", filters: { sit_id: sitA }, status: "done" },
    { id: uuid(11), segment: "listing_proximity", created_at: "2026-10-11T19:21:45Z", filters: { sit_id: sitB }, status: "done" },
    { id: uuid(12), segment: "listing_proximity", created_at: "2026-10-12T06:42:35Z", filters: { sit_id: sitB }, status: "done" },
    { id: uuid(13), segment: "tous", created_at: "2026-10-11T22:39:32Z", filters: null, status: "done" },
  ];
  const deferred = [
    ...Array.from({ length: 61 }, (_, i) => ({ idempotency_key: `listing-proximity-${sitA}-${uuid(1000 + i)}`, status: "sent", created_at: "2026-09-10T04:30:00Z" })),
    ...Array.from({ length: 39 }, (_, i) => ({ idempotency_key: `mass-${uuid(13)}-membre${i}@exemple.test`, status: "sent", created_at: "2026-10-15T21:31:00Z" })),
    { idempotency_key: `mass-${uuid(13)}-autre@exemple.test`, status: "abandoned", created_at: "2026-10-15T21:32:00Z" },
    // Report de la diffusion suivante de la même annonce : jamais rattaché à celle du 11/10.
    { idempotency_key: `listing-proximity-${sitB}-${uuid(2000)}`, status: "sent", created_at: "2026-10-12T06:45:00Z" },
  ];

  it("règle : « Envoyé plus tard » si un report est parti, « Annulé » sinon, statut gardé autrement", () => {
    expect(massOutcome("done", 0, 61)).toBe("sent_later");
    expect(massOutcome("done", 0, 0)).toBe("cancelled");
    expect(massOutcome("done", 412, 0)).toBeNull();
    expect(massOutcome("sending", 0, 0)).toBeNull();
    expect(MASS_OUTCOME_LABELS.sent_later).toBe("Envoyé plus tard");
    expect(MASS_OUTCOME_LABELS.cancelled).toBe("Annulé");
  });

  it("reports rattachés : le 10/09 à 61 reçus, le 11/10 à 538 annulé, l'envoi libre du 11/10 parti plus tard", () => {
    const m = deferredSentByCampaign(campaigns, deferred);
    expect(m.get(uuid(10))).toBe(61);
    expect(m.get(uuid(11))).toBe(0);
    expect(m.get(uuid(12))).toBe(1);
    expect(m.get(uuid(13))).toBe(39);
    expect(massOutcome("done", 0, m.get(uuid(10))!)).toBe("sent_later");
    expect(massOutcome("done", 0, m.get(uuid(11))!)).toBe("cancelled");
  });

  it("la liste des envois précédents lit email_deferred_queue et affiche le motif", () => {
    const src = read("src/pages/admin/AdminMassEmails.tsx");
    expect(src).toContain('supabase.from("email_deferred_queue")');
    expect(src).toContain('.eq("status", "sent")');
    expect(src).toContain("massOutcome(row.status, sent, later)");
    expect(src).toContain("OUTCOME_META[outcome]");
  });
});

describe("ADM9 · 2e. Annonces à proximité dans Stats campagnes", () => {
  const sit = uuid(800);
  const broadcasts = [
    { id: uuid(20), subject: "Diffusion", cta_url: `https://guardiens.fr/sits/${sit}`, status: "done", created_at: "2026-10-03T08:29:37Z", segment: "listing_proximity", filters: { sit_id: sit } },
    { id: uuid(21), subject: "Diffusion", cta_url: `https://guardiens.fr/sits/${sit}`, status: "done", created_at: "2026-10-11T19:21:45Z", segment: "listing_proximity", filters: { sit_id: sit } },
  ];
  const sends = [
    ...Array.from({ length: 5 }, (_, i) => ({ mass_email_id: uuid(20), recipient_email: `g${i}@exemple.test`, status: i < 4 ? "delivered" : "opened", first_clicked_at: i < 2 ? "2026-10-03T09:00:00Z" : null })),
    { mass_email_id: uuid(20), recipient_email: "ignore@exemple.test", status: "skipped", first_clicked_at: null },
    ...Array.from({ length: 3 }, (_, i) => ({ mass_email_id: uuid(21), recipient_email: `h${i}@exemple.test`, status: "skipped", first_clicked_at: null })),
  ];
  const applications = [
    { id: uuid(30), sit_id: sit, created_at: "2026-10-04T10:00:00Z" },
    { id: uuid(31), sit_id: sit, created_at: "2026-10-20T10:00:00Z" }, // hors fenêtre de 7 jours
    { id: uuid(32), sit_id: uuid(801), created_at: "2026-10-04T10:00:00Z" }, // autre annonce
  ];

  it("envoyés et clics uniques par destinataire, candidatures sous 7 jours, diffusion sans envoi écartée", () => {
    expect(proximityStats(broadcasts, sends, applications)).toEqual({ broadcasts: 1, sent: 5, clickers: 2, applications: 1 });
  });

  it("rendu : bloc « Annonces à proximité » et ligne de campagne", async () => {
    tables.email_campaign_events = [];
    tables.mass_emails = broadcasts;
    tables.mass_email_sends = sends;
    rpcs.admin_get_applications_diagnostic = applications;
    const Page = (await import("@/pages/admin/AdminMassEmailsStats")).default;
    const { container } = wrap(<Page />);
    const block = await screen.findByTestId("proximity-stats");
    expect(block.textContent).toMatch(/Diffusions envoyées1/);
    expect(block.textContent).toMatch(/Envois cumulés5/);
    expect(block.textContent).toMatch(/Clics uniques2/);
    expect(block.textContent).toMatch(/Candidatures sous 7 jours1/);
    const rows = Array.from(container.querySelectorAll("tbody tr")).map((r) => r.textContent ?? "");
    expect(rows.some((r) => r.startsWith("Annonces à proximité5"))).toBe(true);
    expect(container.textContent).not.toMatch(DASHES);
  });
});

describe("ADM9 · textes", () => {
  it("aucun tiret cadratin ni demi-cadratin dans les fichiers du lot", () => {
    for (const f of [
      "src/lib/admin/trueCounts.ts", "src/lib/admin/personalMessageLink.ts",
      "src/pages/admin/_components/users/WriteToMemberDialog.tsx", "src/pages/admin/AdminMassEmailsStats.tsx",
    ]) expect(read(f), f).not.toMatch(DASHES);
  });
});
