import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, configure } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { readFileSync } from "node:fs";
import { signalAdminLink, signalListLink, type AdminSignalBase } from "@/components/admin/signals/signalGrouping";
import { elementLinkOf, buildWorkList } from "../../../supabase/functions/_shared/admin-work-list.ts";
import { missionDatePassed } from "@/lib/admin/listingSituation";
import { maskEmail } from "@/lib/admin/maskEmail";
import { __resetAdminReadErrors, UNAVAILABLE_LABEL } from "@/lib/admin/readError";

configure({ asyncUtilTimeout: 8000 });
vi.setConfig({ testTimeout: 20000 });

/** Lot ADM16 (lot 4 de l'arène) : des destinations qui montrent l'élément, et des erreurs dites. */

let fail = false;
const ERR = { message: "boom", code: "57014" };
function chain() {
  const proxy: any = new Proxy({}, {
    get(_t, prop: string) {
      if (prop === "then") {
        const r = fail ? { data: null, count: null, error: ERR } : { data: [], count: 0, error: null };
        return (res: any, rej: any) => Promise.resolve(r).then(res, rej);
      }
      if (prop === "maybeSingle" || prop === "single") return () => Promise.resolve(fail ? { data: null, error: ERR } : { data: null, error: null });
      return () => proxy;
    },
  });
  return proxy;
}
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: () => chain(),
    rpc: () => Promise.resolve(fail ? { data: null, error: ERR } : { data: [], error: null }),
    functions: { invoke: () => Promise.resolve({ data: null, error: null }) },
    auth: {
      getUser: () => Promise.resolve({ data: { user: { id: "admin-1" } } }),
      getSession: () => Promise.resolve({ data: { session: null } }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }),
    },
    storage: { from: () => ({ getPublicUrl: () => ({ data: { publicUrl: "" } }), createSignedUrl: () => Promise.resolve({ data: null }) }) },
    channel: () => ({ on() { return this; }, subscribe() { return this; } }),
    removeChannel: () => {},
  },
}));
vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: { id: "admin-1", email: "a@b.c" }, isAuthenticated: true, loading: false, logout() {} }),
}));
vi.mock("@/hooks/useAdmin", () => ({ useAdmin: () => ({ isAdmin: true, loading: false }) }));

const wrap = (ui: React.ReactNode, url: string) => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[url]}>{ui}</MemoryRouter>
    </QueryClientProvider>,
  );
};
const sig = (over: Partial<AdminSignalBase>): AdminSignalBase => ({
  id: "s1", signal_type: "no_applications", severity: "warning", entity_type: "sit", entity_id: "sit-1",
  detected_at: "2026-11-09T08:00:00Z", metadata: {}, ...over,
});

beforeEach(() => { fail = false; __resetAdminReadErrors(); });

describe("ADM16, liens vers l'élément", () => {
  it("annonce, besoin, candidature, membre : l'élément même ; carte groupée : la liste", () => {
    expect(signalAdminLink(sig({}))).toBe("/admin/listings?sit=sit-1");
    expect(signalAdminLink(sig({ entity_type: "small_mission", entity_id: "m-9" }))).toBe("/admin/small-missions?mission=m-9");
    expect(signalAdminLink(sig({ entity_type: "application", entity_id: "a-1", metadata: { sit_id: "sit-7" } }))).toBe("/admin/listings?sit=sit-7");
    expect(signalAdminLink(sig({ entity_type: "profile", entity_id: "u-1" }))).toBe("/admin/users?user=u-1");
    expect(signalListLink(sig({ entity_type: "small_mission", entity_id: "m-9" }))).toBe("/admin/small-missions");
    expect(readFileSync("src/components/admin/signals/GroupedSignalCard.tsx", "utf8")).toContain("signalListLink(signals[0])");
  });

  it("liste de travail : chaque élément nommé mène à lui", () => {
    expect(elementLinkOf({ signal_type: "mission_no_audience", entity_type: "small_mission", entity_id: "m-3", metadata: {} } as any))
      .toBe("/admin/small-missions?mission=m-3");
    expect(elementLinkOf({ signal_type: "no_applications", entity_type: "sit", entity_id: "s-3", metadata: {} } as any))
      .toBe("/admin/listings?sit=s-3");
    expect(elementLinkOf({ signal_type: "email_delivery_low", entity_type: "system", entity_id: null, metadata: {} } as any)).toBeNull();
    const src = readFileSync("src/pages/admin/_components/dashboard/PilotageBlocks.tsx", "utf8");
    expect(src).toContain('data-testid="pilotage-elements"');
    expect(typeof buildWorkList).toBe("function");
  });

  it("signalement d'un besoin : vers le besoin ; ?user= ouvre la fiche", () => {
    expect(readFileSync("src/pages/admin/AdminReports.tsx", "utf8")).toContain("/admin/small-missions?mission=${targetId}");
    expect(readFileSync("src/pages/admin/AdminUsers.tsx", "utf8")).toContain("next.set(MEMBER_PARAM, focusUserId)");
  });
});

describe("ADM16, chiffres et libellés", () => {
  it("une date de fin fait foi (« du 5 au 11 » reste ouvert le 9)", () => {
    const now = new Date("2026-11-09T12:00:00");
    expect(missionDatePassed({ status: "open", date_needed: "2026-11-05", end_date: "2026-11-11" } as any, now)).toBe(false);
    expect(missionDatePassed({ status: "open", date_needed: "2026-11-05", end_date: "2026-11-08" } as any, now)).toBe(true);
    expect(missionDatePassed({ status: "open", date_needed: "2026-11-05" } as any, now)).toBe(true);
  });

  it("« Sans réponse » : besoins ouverts seulement", () => {
    const src = readFileSync("src/pages/admin/AdminSmallMissions.tsx", "utf8");
    expect(src).toContain('m.status === "open" && !responseCounts[m.id]');
    expect(src).toContain("Ouverts sans réponse");
  });

  it("adresse d'un compte effacé masquée", () => {
    expect(maskEmail("charlotte@gmail.com")).toBe("ch•••@gmail.com");
    expect(maskEmail("a@b.fr")).toBe("a•••@b.fr");
    expect(maskEmail("sans-arobase")).toBe("•••");
  });

  it("Annonces : Diffuser visible sur « Sans candidature » et dans la fiche", () => {
    const src = readFileSync("src/pages/admin/AdminListings.tsx", "utf8");
    expect(src).toContain('data-testid="row-broadcast"');
    expect(src).toContain("Message dans la messagerie");
    expect(src).toContain("trafficError ?");
  });
});

describe("ADM16, une lecture en échec se dit", () => {
  const PAGES: Array<[string, string]> = [
    ["@/pages/admin/AdminReports", "Aucun signalement"],
    ["@/pages/admin/AdminReviews", "Aucun avis"],
    ["@/pages/admin/AdminDeletionRequests", "Aucune demande enregistrée."],
    ["@/pages/admin/AdminExperienceVerification", "Toutes les expériences ont été vérifiées."],
    ["@/pages/admin/AdminSkills", "Aucune compétence dans ce filtre."],
    ["@/pages/admin/AdminReviewDisputes", "Aucune contestation en attente."],
    ["@/pages/admin/AdminVerifications", "Aucune vérification trouvée"],
  ];
  for (const [mod, empty] of PAGES) {
    it(mod.split("/").pop()!, async () => {
      fail = true;
      const { default: Page } = await import(/* @vite-ignore */ mod);
      wrap(<Page />, "/admin");
      const alerts = await screen.findAllByRole("alert");
      expect(alerts.some((a) => a.textContent?.includes(UNAVAILABLE_LABEL))).toBe(true);
      expect(screen.queryByText(empty)).toBeNull();
    });
  }

  it("Messagerie : statistiques en échec dites", async () => {
    fail = true;
    const { default: Page } = await import("@/pages/admin/AdminMessages");
    wrap(<Page />, "/admin/messages");
    const alerts = await screen.findAllByRole("alert");
    expect(alerts.some((a) => a.textContent?.includes(UNAVAILABLE_LABEL))).toBe(true);
    expect(screen.queryByText("Aucun message sur cette période.")).toBeNull();
  });

  it("Entraide : ?mission= filtre et le dit", async () => {
    const { default: Page } = await import("@/pages/admin/AdminSmallMissions");
    wrap(<Page />, "/admin/small-missions?mission=m-404");
    expect(await screen.findByText("Ce besoin se trouve dans l'onglet Projets, ou a été supprimé.")).toBeTruthy();
  });

  it("Projets : indicateurs en échec dits, jamais « Tous les projets ont reçu »", async () => {
    fail = true;
    const { default: Page } = await import("@/pages/admin/AdminSmallMissions");
    wrap(<Page />, "/admin/small-missions?tab=projets");
    expect(await screen.findByText("Indicateurs des projets")).toBeTruthy();
    expect(screen.queryByText("Tous les projets ouverts ont reçu au moins une candidature.")).toBeNull();
  });
});
