/**
 * Lot L6 (09/11/2026) : la candidature reçue a sa page, /candidatures/:id.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route, useLocation } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { readFileSync } from "node:fs";
import { applicationDeepLinkPath, applicationPagePath, withApplicationIdFromKey } from "../../../supabase/functions/_shared/application-page.ts";
import { KIND_DECLINE_MESSAGES } from "@/lib/applicationDecline";
import { afterReplyTarget, noticeFirstName, REPLIED_PARAM } from "@/lib/afterPublish";
import { resolveOwnerStory } from "@/lib/dashboardStory";
import { buildOwnerStoryInput } from "@/lib/ownerStoryInput";
import { isGateAlwaysOpenPath } from "@/lib/onboardingGateRules";

const APP_ID = "11111111-2222-4333-8444-555555555555";
const OWNER = "00000000-0000-4000-8000-000000000001";

const h = vi.hoisted(() => ({ updates: [] as any[], inserts: [] as any[], rpcs: [] as any[], status: "pending" }));

vi.mock("@/integrations/supabase/client", () => {
  const rows: Record<string, any> = {
    applications: () => ({ id: "11111111-2222-4333-8444-555555555555", sit_id: "s1", sitter_id: "u2", status: h.status, message: "Bonjour, j'adore les chats.\nÀ bientôt.", created_at: "2026-11-08T10:00:00Z" }),
    sits: () => ({ id: "s1", title: "Garde de Caramel", start_date: "2026-12-19", end_date: "2027-01-03", status: "published", user_id: "00000000-0000-4000-8000-000000000001" }),
    public_profiles: () => ({ id: "u2", first_name: "Camille", city: "Lyon", avatar_url: null, identity_verified: true, completed_sits_count: 3, created_at: "2025-03-01T00:00:00Z" }),
    sitter_profiles_affinity: () => null,
    conversations: () => ({ id: "c1" }),
  };
  const builder = (table: string) => {
    const q: any = {
      select: () => q, eq: () => q, in: () => q, order: () => q, limit: () => q,
      maybeSingle: async () => ({ data: rows[table] ? rows[table]() : null, error: null }),
      update: (v: any) => { h.updates.push({ table, v }); return { eq: async () => ({ error: null }) }; },
      insert: async (v: any) => { h.inserts.push({ table, v }); return { error: null }; },
      then: (r: any) => Promise.resolve({ data: [], error: null }).then(r),
    };
    return q;
  };
  return {
    supabase: {
      from: builder,
      rpc: async (name: string, args: any) => {
        h.rpcs.push({ name, args });
        if (name === "public_profile_reviews") {
          return { data: [{ overall_rating: 5, comment: "Très attentionnée avec nos chats.", created_at: "2026-09-10T00:00:00Z", sit_start_date: "2026-09-01", sit_end_date: "2026-09-08", review_type: "garde" }], error: null };
        }
        return { data: true, error: null };
      },
      functions: { invoke: async () => ({ data: null, error: null }) },
    },
  };
});
vi.mock("@/contexts/AuthContext", () => {
  const user = { id: "00000000-0000-4000-8000-000000000001", role: "owner", firstName: "Jérémie" };
  return { useAuth: () => ({ user, activeRole: "owner" }) };
});
vi.mock("@/lib/analytics", () => ({ trackEvent: vi.fn() }));
vi.mock("@/lib/sendTransactionalEmail", () => ({ sendTransactionalEmail: vi.fn(async () => undefined) }));
vi.mock("@/components/matching/OwnerToSitterAffinity", () => ({ default: () => null }));

import ApplicationDetail from "@/pages/ApplicationDetail";

describe("L6, liens vers la page d'une candidature", () => {
  it("chemin de la page et lien profond des deux emails de candidature", () => {
    expect(applicationPagePath(APP_ID)).toBe(`/candidatures/${APP_ID}`);
    expect(applicationPagePath("x")).toBeNull();
    expect(applicationDeepLinkPath("new-application", APP_ID)).toBe(`/candidatures/${APP_ID}`);
    expect(applicationDeepLinkPath("first-application-received", APP_ID)).toBe(`/candidatures/${APP_ID}`);
    expect(applicationDeepLinkPath("new-message", APP_ID)).toBeNull();
  });

  it("migration 0120 : lien de notification réécrit par déclencheur, sans le coffre, lecture marquée", () => {
    const sql = readFileSync("drizzle/migrations/0120_l6_candidature_recue.sql", "utf8");
    // L'outil de migration refuse tout texte qui cite le coffre des secrets.
    expect(sql).not.toMatch(/vault/i);
    expect(sql).not.toContain("FUNCTION public.notify_new_application");
    expect(sql).toContain("NEW.link := '/candidatures/' || v_app_id::text;");
    expect(sql).toContain("AND a.created_at = now()");
    expect(sql).toContain("IF v_count = 1 AND v_app_id IS NOT NULL THEN");
    expect(sql).toMatch(/CREATE TRIGGER trg_notification_application_page_link\s+BEFORE INSERT ON public\.notifications/);
    expect(sql).toContain("REVOKE EXECUTE ON FUNCTION public.notification_application_page_link() FROM PUBLIC, anon, authenticated;");
    expect(sql).toContain("FUNCTION public.mark_application_viewed(p_application_id uuid)");
    expect(sql).toContain("REVOKE EXECUTE ON FUNCTION public.mark_application_viewed(uuid) FROM PUBLIC, anon, authenticated;");
    const contracts = JSON.parse(readFileSync("scripts/db/production-contracts.json", "utf8"));
    const c = contracts.contracts.find((x: any) => x.migration === "0120_l6_candidature_recue.sql");
    expect(c.checks.map((k: any) => k.name)).toEqual(["new_application_link_to_application_page", "mark_application_viewed_owner_only"]);
    expect(c.checks[0].sql).toContain("trg_notification_application_page_link");
  });

  it("email de candidature : l'identifiant vient de la clé d'envoi", () => {
    const k = `new-application-${APP_ID}`;
    expect(withApplicationIdFromKey("new-application", { a: 1 }, k)).toEqual({ a: 1, applicationId: APP_ID });
    expect(withApplicationIdFromKey("first-application-received", {}, `first-application-${APP_ID}`)).toEqual({ applicationId: APP_ID });
    const other = "11111111-2222-4333-8444-555555555555";
    expect(withApplicationIdFromKey("new-application", { applicationId: other }, k)).toEqual({ applicationId: other });
    expect(withApplicationIdFromKey("new-message", {}, k)).toEqual({});
    expect(withApplicationIdFromKey("new-application", {}, "new-application-x")).toEqual({});
    expect(withApplicationIdFromKey("new-application", {}, undefined)).toEqual({});
  });

  it("le récit mène à la candidature à lire", () => {
    const s = resolveOwnerStory(buildOwnerStoryInput({
      today: "2026-11-09", sits: [{ id: "s1", status: "published" }], pets: [{ name: "Caramel" }],
      awaitingApps: [{ id: APP_ID, sit_id: "s1", sitter_id: "u2", status: "pending" }],
      sitterProfiles: { u2: { first_name: "Camille" } }, pendingReviews: [],
    }));
    expect(s.cta).toEqual({ label: "Lire la candidature de Camille", href: `/candidatures/${APP_ID}` });
  });

  it("la porte d'affinité laisse ouverte la page d'une candidature", () => {
    expect(isGateAlwaysOpenPath(`/candidatures/${APP_ID}`)).toBe(true);
  });

  it("retour au récit après une réponse (B-07)", () => {
    expect(noticeFirstName("Marie-Anne Dupont")).toBe("Marie-Anne");
    expect(noticeFirstName("<script>")).toBe("script");
    expect(afterReplyTarget({ sitId: "s1", firstName: "Camille", phone: true })).toBe(`/dashboard?${REPLIED_PARAM}=Camille`);
    expect(afterReplyTarget({ sitId: "s1", firstName: "Camille", phone: false })).toBe("/sits/s1#candidatures");
  });

  it("mots aimables sans tournure négative ni tiret long", () => {
    for (const m of KIND_DECLINE_MESSAGES) {
      expect(m).not.toMatch(/[—–]/);
      expect(m).not.toMatch(/(?<!\p{L})(ne|pas|jamais|aucun|aucune)(?!\p{L})|(?<!\p{L})n['’]/iu);
    }
  });
});

function mount() {
  let loc = "";
  const Probe = () => { const l = useLocation(); loc = l.pathname + l.search; return null; };
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[`/candidatures/${APP_ID}`]}>
        <Routes>
          <Route path="/candidatures/:id" element={<ApplicationDetail />} />
          <Route path="*" element={<Probe />} />
        </Routes>
        <Probe />
      </MemoryRouter>
    </QueryClientProvider>,
  );
  return () => loc;
}

describe("L6, page /candidatures/:id", () => {
  beforeEach(() => { h.updates = []; h.inserts = []; h.rpcs = []; h.status = "pending"; });
  afterEach(cleanup);

  it("lit la candidature en entier, un seul bouton plein, marque lue", async () => {
    mount();
    await screen.findByRole("heading", { name: /Camille/ });
    expect(screen.getByTestId("application-message").textContent).toContain("j'adore les chats");
    expect(screen.getByTestId("application-last-review").textContent).toContain("Très attentionnée");
    const footer = screen.getByTestId("application-actions");
    const filled = Array.from(footer.querySelectorAll("button")).filter((b) => /(^|\s)bg-primary(\s|$)/.test(b.className));
    expect(filled.map((b) => b.textContent)).toEqual(["Répondre à Camille"]);
    expect(footer.textContent).toContain("Choisir Camille");
    expect(footer.textContent).toContain("Décliner avec un mot aimable");
    await waitFor(() => expect(h.rpcs.some((r) => r.name === "mark_application_viewed" && r.args.p_application_id === APP_ID)).toBe(true));
  });

  it("décliner : mot aimable choisi d'office, envoyé, retour au récit", async () => {
    const where = mount();
    await screen.findByRole("heading", { name: /Camille/ });
    fireEvent.click(screen.getByText("Décliner avec un mot aimable"));
    const radios = screen.getByTestId("decline-sheet").querySelectorAll("[role='radio']");
    expect(radios[0].getAttribute("aria-checked")).toBe("true");
    expect((document.getElementById("decline-word") as HTMLTextAreaElement).value).toBe(KIND_DECLINE_MESSAGES[0]);
    fireEvent.click(screen.getByTestId("decline-confirm"));
    await waitFor(() => expect(where()).toBe(`/dashboard?${REPLIED_PARAM}=Camille`));
    expect(h.updates).toContainEqual({ table: "applications", v: { status: "rejected" } });
    expect(h.inserts.map((i) => i.v.content)).toEqual(["Votre candidature a été déclinée pour cette garde.", KIND_DECLINE_MESSAGES[0]]);
  });

  it("candidature déjà déclinée : état dit, aucun geste", async () => {
    h.status = "rejected";
    mount();
    await screen.findByTestId("application-closed");
    expect(screen.queryByTestId("application-actions")).toBeNull();
    expect(screen.getByTestId("application-closed").textContent).toBe("Vous avez décliné la candidature de Camille.");
  });
});
