import { describe, expect, it } from "vitest";
import {
  buildActionQueue,
  type SuggestedAction,
} from "@/components/admin/signals/actionQueue";
import type { AdminSignalBase } from "@/components/admin/signals/signalGrouping";

let seq = 0;
const sig = (over: Partial<AdminSignalBase> = {}): AdminSignalBase => ({
  id: `s${++seq}`,
  signal_type: "dormant_sitter",
  severity: "warning",
  entity_type: "profile",
  entity_id: "x",
  detected_at: "2026-08-01T00:00:00Z",
  metadata: {},
  ...over,
});

const ai = (over: Partial<SuggestedAction> = {}): SuggestedAction => ({
  title: "Action",
  why: "Parce que",
  link: "/admin/users",
  priority: "moyenne",
  ...over,
});

const keyOf = (e: ReturnType<typeof buildActionQueue>[number]): string =>
  e.kind === "ai" ? `ai:${e.action.title}` : e.kind === "group" ? `group:${e.group.signalType}` : e.signal.id;

describe("buildActionQueue", () => {
  it("applique une échelle unique : signal critique, IA haute, signal avertissement, IA basse", () => {
    const queue = buildActionQueue(
      [
        sig({ id: "w1", severity: "warning" }),
        sig({ id: "c1", severity: "critical", signal_type: "suspicious_account" }),
      ],
      [
        ai({ title: "basse", priority: "basse", topic: "acquisition", link: "/admin/emails" }),
        ai({ title: "haute", priority: "haute", topic: "crons", link: "/admin/reports" }),
      ],
    );
    expect(queue.map(keyOf)).toEqual(["c1", "ai:haute", "w1", "ai:basse"]);
  });

  it("écarte une suggestion IA dont le sujet est déjà porté par un signal, même avec un lien différent", () => {
    const queue = buildActionQueue(
      [sig({ signal_type: "dormant_sitter" })],
      [
        ai({
          title: "Réengager les gardiens dormants",
          topic: "gardiens_dormants",
          link: "/admin/envois-groupes",
          priority: "haute",
        }),
      ],
    );
    expect(queue).toHaveLength(1);
    expect(queue[0].kind).toBe("signal");
  });

  it("écarte la campagne Affinités de l'IA quand le signal onboarding affinité existe", () => {
    const queue = buildActionQueue(
      [sig({ signal_type: "affinity_onboarding_stale" })],
      [
        ai({
          title: "Campagne de relance Affinités",
          topic: "onboarding_affinite",
          link: "/admin/envois-groupes",
          priority: "haute",
        }),
      ],
    );
    expect(queue).toHaveLength(1);
    expect(queue[0].kind).toBe("signal");
  });

  it("écarte une suggestion IA dont le lien correspond à un signal, même sans sujet", () => {
    const queue = buildActionQueue(
      [sig({ signal_type: "suspicious_account" })],
      [ai({ link: "/admin/users", topic: "autre" })],
    );
    expect(queue).toHaveLength(1);
    expect(queue[0].kind).toBe("signal");
  });

  it("groupe dès 2 signaux non résolus du même type", () => {
    const queue = buildActionQueue([sig({ id: "a" }), sig({ id: "b" })], []);
    expect(queue).toHaveLength(1);
    expect(queue[0].kind).toBe("group");
  });

  it("déduplique les suggestions IA entre elles par sujet en gardant la plus prioritaire", () => {
    const queue = buildActionQueue([], [
      ai({ title: "basse", priority: "basse", topic: "acquisition" }),
      ai({ title: "haute", priority: "haute", topic: "acquisition" }),
    ]);
    expect(queue).toHaveLength(1);
    expect(queue[0]).toMatchObject({ kind: "ai", action: { title: "haute" } });
  });

  it("conserve les suggestions IA sans sujet doublon ni lien doublon", () => {
    const queue = buildActionQueue(
      [sig({ signal_type: "dormant_sitter" })],
      [ai({ title: "Campagne villes", topic: "acquisition", link: "/admin/envois-groupes" })],
    );
    expect(queue.map(keyOf)).toContain("ai:Campagne villes");
  });
});
