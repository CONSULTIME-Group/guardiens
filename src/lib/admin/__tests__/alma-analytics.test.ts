import { describe, it, expect } from "vitest";
import {
  aggregateMoments,
  computeBubbleKpis,
  aggregateWhispers,
  toCsv,
  rangeSinceISO,
} from "@/lib/admin/alma-analytics";

const now = new Date("2026-07-10T12:00:00Z");
const iso = (daysAgo: number) =>
  new Date(now.getTime() - daysAgo * 24 * 3600 * 1000).toISOString();

describe("alma-analytics", () => {
  it("aggregateMoments : calcule vues, actions, adoption, dernière utilisation", () => {
    const events = [
      { event_type: "alma_message_opener_bubble_seen", created_at: iso(1), user_id: "u1" },
      { event_type: "alma_message_opener_bubble_seen", created_at: iso(2), user_id: "u2" },
      { event_type: "alma_message_opener_generated", created_at: iso(1), user_id: "u1" },
      { event_type: "alma_review_draft_seen", created_at: iso(3), user_id: "u3" },
    ];
    const stats = aggregateMoments(events);
    const opener = stats.find((s) => s.moment === "alma_message_opener")!;
    expect(opener.views).toBe(2);
    expect(opener.actions).toBe(1);
    expect(opener.adoptionRate).toBe(0.5);
    expect(opener.lastUsedAt).toBe(iso(1));
    const review = stats.find((s) => s.moment === "alma_review_draft")!;
    expect(review.views).toBe(1);
    expect(review.actions).toBe(0);
  });

  it("computeBubbleKpis : compte utilisateurs uniques sur fenêtres 7j et 30j", () => {
    const events = [
      { event_type: "alma_message_opener_bubble_seen", created_at: iso(1), user_id: "u1" },
      { event_type: "alma_motivation_bubble_seen", created_at: iso(3), user_id: "u2" },
      { event_type: "alma_review_draft_seen", created_at: iso(20), user_id: "u3" },
      { event_type: "alma_review_draft_seen", created_at: iso(45), user_id: "u4" },
      { event_type: "alma_message_opener_generated", created_at: iso(1), user_id: "u1" },
    ];
    const kpis = computeBubbleKpis(events, now);
    expect(kpis.uniqueUsers7d).toBe(2);
    expect(kpis.uniqueUsers30d).toBe(3);
    expect(kpis.totalViews).toBe(4);
    expect(kpis.totalActions).toBe(1);
    expect(kpis.engagementRate).toBe(0.25);
  });

  it("aggregateWhispers : calcule taux action, dismiss, blacklist users uniques", () => {
    const history = [
      { whisper_type: "owner_reciprocal_interest", emitted_at: iso(1), action_taken: "primary", dismissed_reason: null, user_id: "u1" },
      { whisper_type: "owner_reciprocal_interest", emitted_at: iso(1), action_taken: null, dismissed_reason: "closed_manually", user_id: "u2" },
      { whisper_type: "owner_reciprocal_interest", emitted_at: iso(1), action_taken: null, dismissed_reason: "blacklist", user_id: "u3" },
      { whisper_type: "owner_reciprocal_interest", emitted_at: iso(1), action_taken: null, dismissed_reason: "blacklist", user_id: "u3" },
      { whisper_type: "owner_view_trend_up", emitted_at: iso(1), action_taken: "primary", dismissed_reason: null, user_id: "u5" },
    ];
    const stats = aggregateWhispers(history, {
      owner_reciprocal_interest: "P0",
      owner_view_trend_up: "P2",
    });
    const reciproc = stats.find((s) => s.whisperType === "owner_reciprocal_interest")!;
    expect(reciproc.emitted).toBe(4);
    expect(reciproc.actions).toBe(1);
    expect(reciproc.dismissed).toBe(1);
    expect(reciproc.blacklistedUsers).toBe(1);
    expect(reciproc.actionRate).toBe(0.25);
    expect(reciproc.dismissRate).toBe(0.25);
    expect(reciproc.priority).toBe("P0");
  });

  it("toCsv : échappe correctement virgules et guillemets", () => {
    const csv = toCsv(
      [{ a: "hello, world", b: 'quote "here"' }],
      ["a", "b"],
    );
    expect(csv).toBe('a,b\n"hello, world","quote ""here"""');
  });

  it("rangeSinceISO : produit une borne basse cohérente", () => {
    expect(rangeSinceISO("7d", now)).toBe(iso(7));
    expect(rangeSinceISO("30d", now)).toBe(iso(30));
    expect(rangeSinceISO("90d", now)).toBe(iso(90));
  });
});
