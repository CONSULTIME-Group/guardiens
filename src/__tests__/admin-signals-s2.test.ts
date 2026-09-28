import { describe, expect, it } from "vitest";
import { buildActionQueue, groupQueueSignals } from "@/components/admin/signals/actionQueue";
import { SIGNAL_TYPE_LABELS } from "@/components/admin/signals/signalGrouping";
import type { AdminSignalBase } from "@/components/admin/signals/signalGrouping";
import {
  SIGNAL_TYPES, ANIMATE_TYPES, hasDestination, sitGroupLine,
} from "../../supabase/functions/_shared/admin-signal-config";

// Les 35 types présents dans admin_signals au 28/09/2026 (requête GROUP BY signal_type).
const DB_TYPES = [
  "affinity_onboarding_stale", "animal_rehoming_listing", "city_coverage_gap", "city_seo_tension",
  "contact_details_in_public_content", "content_defect_outside_freeze", "content_detector_broken",
  "content_freeze_expired", "content_quality_drift", "digest_queue_morning_backlog", "digest_queue_stalled",
  "dormant_sitter", "email_abandon_high", "email_delivery_low", "email_destroyed", "email_queue_failures",
  "email_recipient_address_invalid", "identity_needs_review", "identity_orphan_documents",
  "listing_proximity_large_broadcast", "no_applications", "notification_delivery_failed",
  "nurturing_run_anomaly", "owner_missing_coordinates", "owner_sit_unconfirmed", "pending_application",
  "prerender_monthly_budget_reached", "sit_like_mission", "sit_notification_claim_starvation",
  "sit_publish_error", "stale_draft", "stalled_discussion", "suspicious_account", "undeclared_pricing",
  "untapped_city",
];

let n = 0;
const sig = (signal_type: string, over: Partial<AdminSignalBase> = {}): AdminSignalBase => ({
  id: `s${++n}`, signal_type, severity: "warning", entity_type: "system", entity_id: `e${n}`,
  detected_at: "2026-09-27T06:00:00Z", metadata: {}, ...over,
});

describe("Lot S2, configuration des types", () => {
  it("couvre les 35 types en base, avec famille, gravité, destinations et résolution", () => {
    expect(DB_TYPES).toHaveLength(35);
    for (const t of DB_TYPES) {
      const c = SIGNAL_TYPES[t];
      expect(c, t).toBeDefined();
      expect(c.family).toBeTruthy();
      expect(["critical", "warning", "info"]).toContain(c.defaultSeverity);
      expect(typeof c.autoResolve).toBe("boolean");
    }
  });
  it("routages demandés", () => {
    expect(ANIMATE_TYPES.sort()).toEqual(["affinity_onboarding_stale", "dormant_sitter"]);
    for (const t of ["dormant_sitter", "affinity_onboarding_stale", "city_coverage_gap", "city_seo_tension", "untapped_city"]) {
      expect(hasDestination(t, "action_queue"), t).toBe(false);
    }
    expect(hasDestination("content_detector_broken", "daily_email")).toBe(true);
    expect(hasDestination("content_quality_drift", "daily_email")).toBe(false);
    expect(SIGNAL_TYPES.untapped_city.deprecated).toBe(true);
    expect(SIGNAL_TYPE_LABELS.untapped_city).toBeUndefined();
    expect(hasDestination("type_inconnu", "action_queue")).toBe(true);
  });
});

describe("Lot S2, regroupements de la file", () => {
  it("une entrée par annonce, gravité la plus haute, aucun signal perdu", () => {
    const rows = [
      sig("pending_application", { severity: "critical", metadata: { sit_id: "A" } }),
      sig("pending_application", { metadata: { sit_id: "A" } }),
      sig("stalled_discussion", { metadata: { sit_id: "A" } }),
      sig("stalled_discussion", { metadata: { sit_id: "B" } }),
      sig("digest_queue_stalled"), sig("digest_queue_morning_backlog", { severity: "critical" }),
      sig("content_quality_drift"), sig("content_detector_broken", { severity: "critical" }),
      sig("dormant_sitter"), sig("affinity_onboarding_stale"), sig("city_coverage_gap"), sig("untapped_city"),
      sig("suspicious_account"),
    ];
    const q = groupQueueSignals(rows);
    const sitA = q.find((e) => e.kind === "sit" && e.sitId === "A");
    expect(sitA && sitA.kind === "sit" && sitA.items.length).toBe(3);
    expect(sitA && sitA.kind === "sit" && sitA.severity).toBe("critical");
    const groups = q.filter((e) => e.kind === "group").map((e) => e.kind === "group" && e.group.signalType);
    expect(groups).toEqual(expect.arrayContaining(["group:digest_queue", "group:content"]));
    const inQueue = q.flatMap((e) => e.kind === "sit" ? e.items : e.kind === "group" ? e.group.items : e.kind === "signal" ? [e.signal] : []);
    expect(inQueue).toHaveLength(9);
    expect(inQueue.map((s) => s.signal_type)).not.toEqual(expect.arrayContaining(["dormant_sitter"]));
    expect(buildActionQueue(rows, []).length).toBe(q.length);
  });
  it("libellé de l'entrée par annonce", () => {
    expect(sitGroupLine({ title: "Garde 2 chats", city: "Marseille", start_date: "2026-10-31" },
      ["pending_application", "pending_application", "stalled_discussion"]))
      .toBe("Garde 2 chats, Marseille, début le 31 octobre 2026 : 2 candidatures sans réponse, 1 discussion à l'arrêt");
  });
});
