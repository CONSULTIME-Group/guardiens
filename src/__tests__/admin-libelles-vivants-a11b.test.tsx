import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import * as L from "@/lib/admin/labels";
import { readFileSync } from "fs";

const SNAKE = /\b[a-z]+_[a-z0-9]+(?:_[a-z0-9]+)*\b/;

const tables: Record<string, any[]> = {};
const rpcs: Record<string, any> = {};
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
    functions: { invoke: async () => ({ data: null, error: null }) },
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

const RELEVES = {
  event: ["signup_form_submitted", "signup_email_confirmed"],
  reason: ["daily_limit", "no_hard_criterion", "sitter_children_not_accepted"],
  conversation: ["mission_help", "helper_inquiry"],
  field: ["animal_types", "work_during_sit", "presence_expected"],
  segment: ["listing_proximity", "owner_activation"],
  campaign: ["entraide_ligne_relance", "entraide_ligne", "owner_activation"],
  setting: ["applies_since", "flag_off", "admin_dashboard_snapshot", "admin_action_logs"],
  auditEntity: ["small_mission", "profiles_bulk"],
  auditAction: ["gdpr_account_erasure", "hide_duplicate_mission"],
  column: ["sit_id"],
};

describe("A11b, fonctions de libellé", () => {
  const fns: Record<string, (k: string) => string> = {
    event: L.eventLabel, reason: L.reasonLabel, conversation: L.conversationTypeLabel, field: L.profileFieldLabel,
    segment: L.segmentLabel, campaign: L.campaignLabel, setting: L.settingLabel, auditEntity: L.auditEntityLabel,
    auditAction: L.auditActionLabel, column: L.columnLabel,
  };
  for (const [fam, keys] of Object.entries(RELEVES)) {
    it(`famille ${fam} : libellé français pour chaque clé relevée`, () => {
      for (const k of keys) {
        const l = fns[fam](k);
        expect(l).not.toBe(k);
        expect(l).not.toMatch(/_/);
        expect(l).not.toBe(L.humanizeKey(k));
      }
    });
  }
  it("repli d'une clé inconnue : aucun tiret bas, première lettre capitale", () => {
    const l = L.adminLabel("some_unknown_key_xyz");
    expect(l).toBe("Some unknown key xyz");
    expect(L.campaignLabel("bffe-5359-38")).not.toMatch(/_/);
  });
  it("mots restants traduits dans les textes venus de la base", () => {
    expect(L.displayText("Feedback utilisateur")).toBe("Retour utilisateur");
    expect(L.displayText("Digest gardiens")).toBe("Résumé quotidien gardiens");
    expect(L.displayText("Gardiens dont animal_types est vide")).not.toMatch(SNAKE);
  });
});

describe("A11b, rendu sans snake_case sur données simulées", () => {
  it("Affinité", async () => {
    tables.analytics_events = [
      { metadata: { context: "sitter_dashboard", displayed: false, hidden_reason: "no_hard_criterion" } },
      { metadata: { context: "owner_dashboard", displayed: false, hidden_reason: "sitter_children_not_accepted" } },
    ];
    const { AffinityPilotCard } = await import("@/pages/admin/_components/dashboard/AffinityPilotCard");
    const { container } = wrap(<AffinityPilotCard />);
    await waitFor(() => expect(container.textContent).toMatch(/Enfants non acceptés/));
    expect(container.textContent).not.toMatch(SNAKE);
  });

  it("Messagerie", async () => {
    rpcs.admin_message_stats = { total_human: 3, total_system: 0, conversations_active: 1, conversations_total: 2, conversations_started_period: 1, conversations_with_reply: 1, reply_rate: 50, active_days: 1, avg_per_active_day: 1, last_message_at: null, by_context: { mission_help: 2, helper_inquiry: 1 }, daily: [] };
    rpcs.admin_top_message_users = [];
    const AdminMessages = (await import("@/pages/admin/AdminMessages")).default;
    const { container } = wrap(<AdminMessages />);
    await waitFor(() => expect(container.textContent).toMatch(/Question à un membre entraide/));
    expect(container.textContent).not.toMatch(SNAKE);
  });

  it("Stats campagnes", async () => {
    tables.email_campaign_events = [];
    tables.mass_emails = [
      { id: "a", subject: "S", cta_url: "https://guardiens.fr/x?utm_campaign=entraide_ligne_relance", status: "sent", created_at: "2026-09-01", filters: null },
      { id: "b", subject: "S", cta_url: null, status: "sent", created_at: "2026-09-01", filters: { template_name: "owner_activation" } },
    ];
    tables.mass_email_sends = [];
    const Page = (await import("@/pages/admin/AdminMassEmailsStats")).default;
    const { container } = wrap(<Page />);
    await waitFor(() => expect(container.textContent).toMatch(/Relance de la phrase d'entraide/));
    expect(container.textContent).not.toMatch(SNAKE);
  });

  it("Journal d'audit", async () => {
    tables.admin_action_logs = [
      { id: "1", admin_id: "admin", action: "gdpr_account_erasure", target_type: "profiles_bulk", target_id: null, note: null, metadata: {}, created_at: "2026-09-01T10:00:00Z" },
      { id: "2", admin_id: "admin", action: "hide_duplicate_mission", target_type: "small_mission", target_id: null, note: null, metadata: {}, created_at: "2026-09-01T10:00:00Z" },
    ];
    tables.profiles = [{ id: "admin", first_name: "Jérémie", last_name: "M", email: "j@x.fr" }];
    const Page = (await import("@/pages/admin/AdminAudit")).default;
    const { container } = wrap(<Page />);
    await waitFor(() => expect(container.textContent).toMatch(/Effacement de compte/), { timeout: 8000 });
    expect(container.textContent).toMatch(/Profils \(lot\)/);
    expect(container.textContent).not.toMatch(SNAKE);
  }, 15000);

  it("Trafic, entonnoir d'inscription", async () => {
    rpcs.get_signup_funnel_metrics = {
      period_start: "2026-09-01", period_end: "2026-09-30",
      funnel: [{ step: "signup_form_submitted", volume: 10, conv_prev: 0.5, conv_top: 0.5 }, { step: "signup_email_confirmed", volume: 5, conv_prev: 0.5, conv_top: 0.25 }],
      blocked_reasons: [{ reason: "password_too_weak_xyz", volume: 1, pct_of_blocked: 1 }],
      failed_by_code: [{ code: "user_already_exists", volume: 1, last_seen: null }],
      features: { password_meter_seen: 0, password_generated_used: 0, generated_used_rate: 0, first_shot_strong_rate: null },
    };
    const Page = (await import("@/components/admin/AdminSignupFunnelTab")).default;
    const { container } = wrap(<Page />);
    await waitFor(() => expect(container.textContent).toMatch(/Email d'inscription confirmé|Email confirmé/));
    expect(container.textContent).not.toMatch(SNAKE);
  });

  it("Envois groupés : segments lus par segmentLabel", () => {
    const src = readFileSync("src/pages/admin/AdminMassEmails.tsx", "utf8");
    expect(src).not.toMatch(/SEGMENT_LABELS\[[^\]]+\] \|\| (row\.)?segment\b/);
    expect(L.segmentLabel("listing_proximity")).toBe("Annonces à proximité");
    expect(L.segmentLabel("owner_activation")).toBe("Activation des propriétaires");
  });
});

describe("A11b, menu", () => {
  it("aucun « & » dans les libellés de groupe", async () => {
    const src = readFileSync("src/components/admin/AdminSidebar.tsx", "utf8");
    const groups = [...src.matchAll(/label:\s*"([A-ZÀ-Ý &ÉÈ]+)"/g)].map((m) => m[1]);
    expect(groups.length).toBeGreaterThan(0);
    for (const g of groups) expect(g).not.toMatch(/&/);
  });
});

describe("A11b, Alma : listes longues par 24", () => {
  it("Conversations : 24 au plus, page suivante fonctionne", async () => {
    tables.alma_conversations = Array.from({ length: 30 }, (_, i) => ({
      id: `c${i}`, created_at: "2026-09-01T10:00:00Z", surface: "sitter_dashboard", active_role: "sitter",
      question: `Question numéro ${i}`, answer: "Réponse", register: null, refusal_reason: i === 0 ? "daily_limit" : null, input_mode: null, user_id: "u",
    }));
    rpcs.admin_alma_action_rate = [];
    const { ConversationsTab } = await import("@/pages/admin/_components/alma/ConversationsTab");
    const { container } = wrap(<ConversationsTab since="2026-08-01T00:00:00Z" />);
    await waitFor(() => expect(screen.getAllByText(/^Question numéro/).length).toBe(24));
    expect(container.textContent).toMatch(/30 trouvés/);
    expect(container.textContent).toMatch(/Limite quotidienne atteinte/);
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Suivante" })); });
    expect(screen.getAllByText(/^Question numéro/).length).toBe(6);
    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "numero 2" } });
    expect(container.textContent).toMatch(/Page|trouvé/);
    expect(screen.queryByRole("button", { name: "Suivante" })).toBeNull();
  });
});

describe("A11b, Alma : faits culturels par 24", () => {
  it("24 au plus, page suivante, type en français", async () => {
    tables.alma_cultural_facts = Array.from({ length: 30 }, (_, i) => ({
      id: `f${i}`, fact_type: "breed", content: `Fait culturel ${i}`, source_url: null, context_filter: { surface: ["sitter_dashboard"] }, active: true, created_at: "2026-09-01",
    }));
    rpcs.admin_a10_cultural_fact_stats = [];
    const AdminAlma = (await import("@/pages/admin/AdminAlma")).default;
    const { container } = render(
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
        <MemoryRouter initialEntries={["/admin/alma?tab=cultural-facts"]}><AdminAlma /></MemoryRouter>
      </QueryClientProvider>,
    );
    await waitFor(() => expect(screen.getAllByText(/^Fait culturel \d+$/).length).toBe(24), { timeout: 8000 });
    expect(container.textContent).toMatch(/30 trouvés/);
    await act(async () => { fireEvent.click(screen.getAllByRole("button", { name: "Suivante" })[0]); });
    expect(screen.getAllByText(/^Fait culturel \d+$/).length).toBe(6);
  }, 15000);
});
