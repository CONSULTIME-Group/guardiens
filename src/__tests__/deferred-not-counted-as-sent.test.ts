import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const fn = (p: string) => readFileSync(resolve(process.cwd(), "supabase/functions", p), "utf8");

describe("Une ligne de report n'est jamais un envoi", () => {
  it("flush-deferred-emails ne requalifie plus le miroir en sent", () => {
    const src = fn("flush-deferred-emails/index.ts");
    expect(src).not.toMatch(/syncSendLogMirror\([^)]*"sent"/);
    expect(src).toContain("markMirrorFlushed");
    expect(src).toContain("flushed_at");
  });

  it("le calcul quotidien exclut les lignes de report", () => {
    const src = fn("email-delivery-daily/index.ts");
    expect(src).toContain("metadata?.defer_reason");
    expect(src).toContain("resend_id");
  });

  it("les gardes anti renvoi tiennent compte du statut deferred", () => {
    const guarded = [
      "send-sitter-daily-digest/index.ts",
      "send-mission-daily-digest/index.ts",
      "send-mutual-aid-weekly-digest/index.ts",
      "send-nearby-daily-digest/index.ts",
      "send-mission-nudges/index.ts",
      "nudge-missing-photo/index.ts",
      "remind-unread-messages/index.ts",
      "send-relance-profil-incomplet/index.ts",
      "evaluate-journeys/index.ts",
      "notify-new-message/index.ts",
    ];
    for (const f of guarded) {
      expect(fn(f), f).toMatch(/['"]deferred['"]/);
    }
  });

  it("le drainage de la file reste autorise malgre la garde deferred", () => {
    const src = fn("send-transactional-email/index.ts");
    expect(src).toContain("status.eq.sent,status.eq.pending,status.eq.deferred");
    expect(src).toContain("sourceQueueId");
  });
});
