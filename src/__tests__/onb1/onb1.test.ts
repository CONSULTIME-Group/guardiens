/**
 * Lot ONB1 (08/11/2026) : fin du parcours d'arrivée v2 comptée, ancienne
 * modale jamais montrée à un compte v2, intention écrite à la première
 * étape, remplissage du profil par rôle à 7 jours, compléments proposés
 * sur l'annonce en ligne.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const updates: Array<{ table: string; patch: unknown; id: unknown }> = [];
const events: Array<{ type: string; payload: Record<string, unknown> }> = [];
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: (table: string) => ({
      update: (patch: unknown) => ({
        eq: (_c: string, id: unknown) => { updates.push({ table, patch, id }); return Promise.resolve({ error: null }); },
      }),
    }),
  },
}));
vi.mock("@/lib/analytics", () => ({
  trackEvent: (type: string, payload: Record<string, unknown>) => { events.push({ type, payload }); return Promise.resolve(); },
}));

import { markArrivalOnboardingDone } from "@/lib/arrivalOnboardingDone";
import { isOnboardingEndEvent, ONBOARDING_END_EVENT_TYPES } from "@/lib/admin/trueCounts";
import { resolveArrivalV2Account } from "@/hooks/useArrivalV2Account";
import { buildP1Writes } from "@/pages/arrival/ArriveeVous";
import { buildG1Writes } from "@/pages/arrival/ArriveeVousGardien";
import { computeCompletionCohorts, cohortGroupOf } from "@/lib/admin/profileCompletionCohorts";
import { publishedProfileBoosts } from "@/lib/publishedProfileBoosts";

const src = (p: string) => readFileSync(resolve(process.cwd(), p), "utf8");

describe("point 1 : fin du parcours v2 comptée", () => {
  beforeEach(() => { updates.length = 0; events.length = 0; });

  it("G3 et P3 posent onboarding_completed et émettent onboarding_completed", async () => {
    await markArrivalOnboardingDone("u1", "G3", "sitter");
    await markArrivalOnboardingDone("u2", "P3", "owner");
    expect(updates).toEqual([
      { table: "profiles", patch: { onboarding_completed: true }, id: "u1" },
      { table: "profiles", patch: { onboarding_completed: true }, id: "u2" },
    ]);
    expect(events.map((e) => e.type)).toEqual(["onboarding_completed", "onboarding_completed"]);
    expect(events[0].payload).toMatchObject({ source: "/arrivee/vous-connaitre", metadata: { via: "arrival_v2", step: "G3", role: "sitter" } });
    expect(events[1].payload).toMatchObject({ source: "/arrivee/affinites", metadata: { step: "P3", role: "owner" } });
  });

  it("les deux écrans de fin appellent la règle avant l'invalidation du profil", () => {
    for (const [file, step] of [["src/pages/arrival/ArriveeVousConnaitre.tsx", "G3"], ["src/pages/arrival/ArriveeAffinites.tsx", "P3"]] as const) {
      const s = src(file);
      const call = s.indexOf(`markArrivalOnboardingDone(user.id, "${step}"`);
      expect(call).toBeGreaterThan(0);
      expect(s.indexOf("invalidateMyOnboardingStatus(user.id)", call)).toBeGreaterThan(call);
    }
  });

  it("l'indicateur admin compte aussi arrival_step_completed G3 et P3, rien d'autre", () => {
    expect(ONBOARDING_END_EVENT_TYPES).toContain("arrival_step_completed");
    expect(isOnboardingEndEvent({ event_type: "onboarding_completed", metadata: null })).toBe(true);
    expect(isOnboardingEndEvent({ event_type: "affinity_onboarding_completed", metadata: {} })).toBe(true);
    expect(isOnboardingEndEvent({ event_type: "arrival_step_completed", metadata: { step: "G3" } })).toBe(true);
    expect(isOnboardingEndEvent({ event_type: "arrival_step_completed", metadata: { step: "P3" } })).toBe(true);
    expect(isOnboardingEndEvent({ event_type: "arrival_step_completed", metadata: { step: "G1" } })).toBe(false);
    expect(isOnboardingEndEvent({ event_type: "arrival_step_completed", metadata: null })).toBe(false);
    expect(isOnboardingEndEvent({ event_type: "page_view", metadata: { step: "G3" } })).toBe(false);
  });
});

describe("point 2 : ancienne modale jamais montrée à un compte v2", () => {
  const flag = { enabled: true, appliesSince: "2026-11-01T07:44:00Z" };

  it("compte créé après la bascule : v2, même sans clic sur /bienvenue", () => {
    expect(resolveArrivalV2Account(flag, { created_at: "2026-11-03T10:00:00Z", arrival_welcome_seen_at: null })).toBe(true);
  });
  it("compte ancien passé par /bienvenue : v2", () => {
    expect(resolveArrivalV2Account(flag, { created_at: "2026-10-01T10:00:00Z", arrival_welcome_seen_at: "2026-11-02T10:00:00Z" })).toBe(true);
  });
  it("compte ancien sans /bienvenue, ou drapeau éteint : ancienne modale possible", () => {
    expect(resolveArrivalV2Account(flag, { created_at: "2026-10-01T10:00:00Z" })).toBe(false);
    expect(resolveArrivalV2Account({ enabled: false, appliesSince: flag.appliesSince }, { created_at: "2026-11-03T10:00:00Z" })).toBe(false);
    expect(resolveArrivalV2Account(flag, null)).toBe(false);
  });

  it("AppLayout et OwnerDashboard attendent le critère et l'appliquent", () => {
    const layout = src("src/components/layout/AppLayout.tsx");
    expect(layout).toContain("useArrivalV2Account(user?.id)");
    expect(layout).toMatch(/arrivalV2\.ready && !arrivalV2\.isV2/);
    expect(layout).not.toContain("useArrivalWelcomeSeen");
    const dash = src("src/components/dashboard/OwnerDashboard.tsx");
    expect(dash).toMatch(/arrivalV2\.ready && !arrivalV2\.isV2/);
    expect(dash).not.toContain("useArrivalWelcomeSeen");
  });
});

describe("point 3 : intention écrite à la première étape", () => {
  it("P1 écrit owner quand demandé, rien sinon", () => {
    const base = { userId: "u", firstName: "Marie", postalCode: "69001", city: "Lyon", country: "FR", type: "house", hasProperty: false };
    expect(buildP1Writes({ ...base, arrivalIntent: "owner" }).profile.arrival_intent).toBe("owner");
    expect(buildP1Writes(base).profile).not.toHaveProperty("arrival_intent");
    expect(buildP1Writes({ ...base, arrivalIntent: null }).profile).not.toHaveProperty("arrival_intent");
  });
  it("G1 écrit sitter ou entraide quand demandé, rien sinon", () => {
    const base = { firstName: "Paul", postalCode: "38000", city: "Grenoble", country: "FR" };
    expect(buildG1Writes({ ...base, arrivalIntent: "sitter" }).arrival_intent).toBe("sitter");
    expect(buildG1Writes({ ...base, arrivalIntent: "entraide" }).arrival_intent).toBe("entraide");
    expect(buildG1Writes(base)).not.toHaveProperty("arrival_intent");
  });
  it("les écrans ne l'écrivent que si le profil n'en a pas", () => {
    expect(src("src/pages/arrival/ArriveeVous.tsx")).toContain('arrivalIntent: intentMissing ? "owner" : null');
    expect(src("src/pages/arrival/ArriveeVousGardien.tsx")).toContain('arrivalIntent: intentMissing ? (entraide ? "entraide" : "sitter") : null');
    for (const f of ["src/pages/arrival/ArriveeVous.tsx", "src/pages/arrival/ArriveeVousGardien.tsx"]) {
      expect(src(f)).toContain("setIntentMissing(!prof.arrival_intent)");
    }
  });
});

describe("point 4 : remplissage du profil par rôle, comptes de 7 jours et plus", () => {
  const now = new Date(2026, 10, 8, 12, 0, 0); // dimanche 08/11/2026
  const row = (role: string | null, score: number, d: Date) => ({ role, profile_completion: score, created_at: d.toISOString() });

  it("groupes : gardiens seuls, propriétaires avec le double rôle", () => {
    expect(cohortGroupOf("sitter")).toBe("sitter");
    expect(cohortGroupOf("owner")).toBe("owner");
    expect(cohortGroupOf("both")).toBe("owner");
    expect(cohortGroupOf(null)).toBeNull();
  });

  it("une semaine mûre : part au seuil, médiane, part de propriétaires", () => {
    const d = new Date(2026, 9, 20, 10); // mardi 20/10
    const rows = [row("sitter", 80, d), row("sitter", 30, d), row("sitter", 60, d), row("owner", 20, d), row("both", 45, d)];
    const weeks = computeCompletionCohorts(rows, now);
    const w = weeks.find((x) => x.weekStart === "2026-10-19")!;
    expect(w.partial).toBe(false);
    expect(w.signups).toBe(5);
    expect(w.ownerShare).toBe(40);
    expect(w.sitter).toEqual({ mature: 3, shareAbove: 67, median: 60 });
    expect(w.owner).toEqual({ mature: 2, shareAbove: 50, median: 33 });
  });

  it("comptes de moins de 7 jours écartés, semaine marquée provisoire", () => {
    const young = new Date(2026, 10, 5, 10); // jeudi 05/11, 3 jours
    const old = new Date(2026, 10, 2, 9); // lundi 02/11, 6 jours et plus
    const weeks = computeCompletionCohorts([row("sitter", 90, young), row("sitter", 10, new Date(2026, 9, 31, 9))], now);
    const cur = weeks.find((x) => x.weekStart === "2026-11-02")!;
    expect(cur.partial).toBe(true);
    expect(cur.signups).toBe(1);
    expect(cur.sitter.mature).toBe(0);
    expect(cur.sitter.shareAbove).toBeNull();
    expect(old.getDay()).toBe(1);
    expect(weeks[0].weekStart).toBe("2026-11-02");
    expect(weeks).toHaveLength(8);
  });
});

describe("point 5 : compléments proposés sur l'annonce en ligne", () => {
  it("seulement ce qui manque, dans l'ordre animaux, photo, présentation", () => {
    expect(publishedProfileBoosts({ avatarUrl: null, bio: "", petsCount: 0 }).map((b) => b.key)).toEqual(["pet", "avatar", "bio"]);
    expect(publishedProfileBoosts({ avatarUrl: "a.jpg", bio: "x".repeat(50), petsCount: 1 })).toEqual([]);
    expect(publishedProfileBoosts({ avatarUrl: "a.jpg", bio: "x".repeat(49), petsCount: 2 }).map((b) => b.key)).toEqual(["bio"]);
  });
  it("liens vers les sections du profil propriétaire", () => {
    const all = publishedProfileBoosts({ avatarUrl: null, bio: null, petsCount: 0 });
    expect(all.map((b) => b.href)).toEqual(["/owner-profile?section=animals", "/owner-profile?section=identity", "/owner-profile?section=identity"]);
  });
  it("textes sans tiret cadratin ni demi-cadratin", () => {
    const all = publishedProfileBoosts({ avatarUrl: null, bio: null, petsCount: 0 });
    for (const b of all) expect(`${b.title} ${b.text}`).not.toMatch(/[–—]/);
    expect(src("src/components/sits/owner/PublishedProfileBoosts.tsx")).not.toMatch(/[–—]/);
    expect(src("src/components/admin/analytics/ProfileCompletionCohortsCard.tsx")).not.toMatch(/[–—]/);
  });
  it("monté sur l'annonce en ligne, après « Ce qui va se passer », sans lecture de plus", () => {
    const view = src("src/components/sits/views/OwnerSitView.tsx");
    expect(view).toMatch(/<PublishedNextSteps key="next" \/><PublishedProfileBoosts key="boosts" avatarUrl=\{owner\?\.avatar_url\} bio=\{owner\?\.bio\} petsCount=/);
    expect(src("src/components/sits/owner/PublishedProfileBoosts.tsx")).not.toContain("supabase");
  });
});
