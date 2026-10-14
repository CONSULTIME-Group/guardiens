/**
 * Lot A7 : la bulle de moment côté site. Fréquence « silent » : aucune bulle ;
 * sinon une seule par session, enregistrée dans alma_journal_shown et mesurée.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";

const h = vi.hoisted(() => ({
  shownRows: [] as Array<{ rule_key: string }>,
  upserts: [] as any[],
  track: [] as Array<{ name: string; opts: any }>,
}));

vi.mock("@/integrations/supabase/client", () => {
  const chain: any = {};
  chain.select = () => chain;
  chain.eq = () => chain;
  chain.in = () => Promise.resolve({ data: h.shownRows, error: null });
  chain.upsert = (rows: any) => { h.upserts.push(...rows); return Promise.resolve({ error: null }); };
  chain.update = () => chain;
  return { supabase: { from: () => chain } };
});
vi.mock("@/lib/myProfile", () => ({ fetchMyProfile: async () => ({ data: { alma_muted_categories: [] } }) }));
vi.mock("@/lib/analytics", () => ({ trackEvent: (name: string, opts: any) => h.track.push({ name, opts }) }));

import { useAlmaMoment, ALMA_MOMENT_SESSION_KEY } from "@/hooks/useAlmaMoment";
import { computeAlmaBond, todayParis } from "@/lib/alma/bond";

const bond = () => computeAlmaBond({
  today: todayParis(),
  activeRole: "owner",
  profileCompletion: 80,
  ownSits: [{ id: "s1", status: "published", published_at: new Date().toISOString() }],
  sentApplications: [],
  missions: [],
  server: { member_since: "2026-09-03T08:00:00Z" },
});

describe("A7, useAlmaMoment", () => {
  beforeEach(() => {
    h.shownRows = [{ rule_key: "stade:eveillee" }];
    h.upserts = [];
    h.track = [];
    window.sessionStorage.removeItem(ALMA_MOMENT_SESSION_KEY);
  });

  it("fréquence silent : aucune bulle, aucune mesure", async () => {
    const b = bond();
    const { result } = renderHook(() => useAlmaMoment({ userId: "u1", bond: b, frequency: "silent", role: "owner", enabled: true }));
    await act(async () => { await new Promise((r) => setTimeout(r, 30)); });
    expect(result.current.celebration).toBeNull();
    expect(h.track).toEqual([]);
    expect(h.upserts.some((r) => r.rule_key.startsWith("moment:"))).toBe(false);
  });

  it("moment récent : une bulle, enregistrée et mesurée, puis plus rien dans la session", async () => {
    const b = bond();
    const first = renderHook(() => useAlmaMoment({ userId: "u1", bond: b, frequency: "balanced", role: "owner", enabled: true }));
    await waitFor(() => expect(first.result.current.celebration?.ruleKey).toBe("moment:premiere_annonce"));
    expect(h.upserts).toEqual([expect.objectContaining({ user_id: "u1", rule_key: "moment:premiere_annonce" })]);
    expect(h.track[0]).toMatchObject({ name: "alma_moment_shown", opts: { metadata: { rule_key: "moment:premiere_annonce" } } });
    act(() => first.result.current.act());
    expect(h.track[1]).toMatchObject({ name: "alma_moment_clicked" });
    expect(first.result.current.celebration).toBeNull();

    const second = renderHook(() => useAlmaMoment({ userId: "u1", bond: b, frequency: "balanced", role: "owner", enabled: true }));
    await act(async () => { await new Promise((r) => setTimeout(r, 30)); });
    expect(second.result.current.celebration).toBeNull();
  });

  it("déjà montré : la bulle ne revient pas", async () => {
    window.sessionStorage.removeItem(ALMA_MOMENT_SESSION_KEY);
    h.shownRows = [{ rule_key: "stade:eveillee" }, { rule_key: "stade:complice" }, { rule_key: "moment:premiere_annonce" }];
    const b = bond();
    const { result } = renderHook(() => useAlmaMoment({ userId: "u1", bond: b, frequency: "talkative", role: "owner", enabled: true }));
    await act(async () => { await new Promise((r) => setTimeout(r, 30)); });
    expect(result.current.celebration).toBeNull();
  });
});
