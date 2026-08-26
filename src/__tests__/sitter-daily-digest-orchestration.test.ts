import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";
import {
  parisWindowVerdictForHours,
  SITTER_DAILY_DIGEST_TARGET_PARIS_HOURS,
} from "../../supabase/functions/_shared/paris-hour";

const SRC = readFileSync("supabase/functions/send-sitter-daily-digest/index.ts", "utf8");

describe("send-sitter-daily-digest, orchestration bornée", () => {
  it("sert 8h, 9h et 10h Paris pour permettre les reprises du matin", () => {
    expect([...SITTER_DAILY_DIGEST_TARGET_PARIS_HOURS]).toEqual([8, 9, 10]);
    expect(parisWindowVerdictForHours(
      new Date("2026-08-26T06:05:00Z"),
      SITTER_DAILY_DIGEST_TARGET_PARIS_HOURS,
    ).run).toBe(true);
    expect(parisWindowVerdictForHours(
      new Date("2026-08-26T08:05:00Z"),
      SITTER_DAILY_DIGEST_TARGET_PARIS_HOURS,
    ).run).toBe(true);
  });

  it("conserve 8h comme premier passage utile en hiver", () => {
    expect(parisWindowVerdictForHours(
      new Date("2026-12-26T06:05:00Z"),
      SITTER_DAILY_DIGEST_TARGET_PARIS_HOURS,
    ).run).toBe(false);
    expect(parisWindowVerdictForHours(
      new Date("2026-12-26T07:05:00Z"),
      SITTER_DAILY_DIGEST_TARGET_PARIS_HOURS,
    ).run).toBe(true);
  });

  it("verrouille le FIFO, le budget et la mesure du reliquat", () => {
    expect(SRC).toContain(".order('queued_at', { ascending: true })");
    expect(SRC).toMatch(/const RUN_BUDGET_MS = 110_000/);
    expect(SRC).toMatch(/const MAX_SITTERS_PER_RUN = 500/);
    expect(SRC).toContain("Date.now() - startedAtMs >= RUN_BUDGET_MS");
    expect(SRC).toContain("queue_remaining: queueRemaining ?? 0");
    expect(SRC).toContain("nominalRun?.finish(runPartial ? 'partial' : 'success'");
  });
});