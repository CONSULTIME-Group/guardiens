import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import {
  canWaitWithinBudget,
  isOutboundRateLimit,
  OUTBOUND_DEFAULT_RETRY_MS,
  retryAfterMsFrom,
  sendWithinRateLimit,
} from "../../../supabase/functions/_shared/outbound-rate-limit.ts";
import {
  isRetryOnlySit,
  RETRY_RELEASED_HOURS,
  sitIdFromPublishAlertKey,
} from "../../../supabase/functions/_shared/publish-alert-retry.ts";
import { cronOneLine } from "@/pages/admin/_components/dashboard/CronHealthCard";

// Message réel relevé dans cron_run_log le 13/10/2026.
const RATE_LIMIT = "RateLimitError: Rate limit exceeded for trace 01a13446a04e727988a8230840362c2f. Retry after 43968ms.";

describe("CRON1, limite de débit", () => {
  it("reconnaît la limite de débit levée par fetch et le délai annoncé", () => {
    const err = Object.assign(new Error("Rate limit exceeded for trace x. Retry after 43968ms."), { name: "RateLimitError" });
    expect(isOutboundRateLimit(err)).toBe(true);
    expect(isOutboundRateLimit(RATE_LIMIT)).toBe(true);
    expect(isOutboundRateLimit("Edge Function returned a non-2xx status code")).toBe(false);
    expect(retryAfterMsFrom(RATE_LIMIT)).toBe(43968);
    expect(retryAfterMsFrom("RateLimitError")).toBe(OUTBOUND_DEFAULT_RETRY_MS);
    expect(retryAfterMsFrom("Retry after 999999ms")).toBe(60_000);
  });

  it("attend le délai annoncé puis renvoie, dans le budget du passage", async () => {
    let calls = 0;
    const waits: number[] = [];
    let clock = 0;
    const out = await sendWithinRateLimit(async () => {
      calls++;
      if (calls === 1) throw Object.assign(new Error(RATE_LIMIT), { name: "RateLimitError" });
      return { ok: true, status: 200, body: "" };
    }, { startedAtMs: 0, now: () => clock, sleep: async (ms) => { waits.push(ms); clock += ms; } });
    expect(out.kind).toBe("sent");
    expect(waits).toEqual([43968]);
  });

  it("sans budget pour attendre, s'arrête proprement sans compter d'échec", async () => {
    const out = await sendWithinRateLimit(async () => ({ ok: false, status: 429, body: RATE_LIMIT }), {
      startedAtMs: 0, now: () => 90_000, sleep: async () => {},
    });
    expect(out.kind).toBe("rate_limited");
    expect(canWaitWithinBudget(0, 90_000, 43_968)).toBe(false);
    expect(canWaitWithinBudget(0, 20_000, 43_968)).toBe(true);
  });

  it("un vrai refus reste un échec, sans attente", async () => {
    let waited = false;
    const out = await sendWithinRateLimit(async () => ({ ok: false, status: 500, body: '{"providerStatus":422}' }), {
      startedAtMs: 0, sleep: async () => { waited = true; },
    });
    expect(out.kind).toBe("failed");
    expect(waited).toBe(false);
  });
});

describe("CRON1, reprise des alertes de publication", () => {
  it("lit l'annonce d'une clé et reprend pendant 72 heures", () => {
    expect(RETRY_RELEASED_HOURS).toBe(72);
    expect(sitIdFromPublishAlertKey("publish-alert-dff478f6-0a75-4f40-ba67-f6d3ad5bdca9-36bcd482-9b3a-4d83-ad38-5e495a8c553c"))
      .toBe("dff478f6-0a75-4f40-ba67-f6d3ad5bdca9");
    expect(sitIdFromPublishAlertKey("listing-proximity-abc")).toBeNull();
  });

  it("une annonce publiée avant la fenêtre ne reprend que ses alertes relâchées", () => {
    const since = "2026-10-16T10:00:00Z";
    expect(isRetryOnlySit("2026-10-12T14:00:00Z", since)).toBe(true);
    expect(isRetryOnlySit("2026-10-16T10:30:00Z", since)).toBe(false);
  });

  it("la fonction n'appelle plus invoke, relâche avec un motif et vise les clés relâchées", () => {
    const src = readFileSync("supabase/functions/notify-sitters-on-publish/index.ts", "utf8");
    expect(src).not.toContain('functions.invoke("send-transactional-email"');
    expect(src).toContain("sendWithinRateLimit");
    expect(src).toContain('release_reason: outcome.kind === "rate_limited" ? "rate_limited" : "send_failed"');
    expect(src).toContain("if (retryOnly && !releasedKeys.has(idempotencyKey)) continue;");
    expect(src).toMatch(/PUBLISH_LOOKBACK_MINUTES = 90;/);
  });

  it("le résumé hebdomadaire de l'entraide envoie un par un et reporte le reste", () => {
    const src = readFileSync("supabase/functions/send-mutual-aid-weekly-digest/index.ts", "utf8");
    expect(src).not.toContain("runInBatches(");
    expect(src).toContain("sendWithinRateLimit");
    expect(src).toContain("deferred,");
  });
});

describe("CRON1, santé des crons", () => {
  const row = (label: string, state: "ok" | "degraded" | "critical") => ({
    edge_name: label, label, state, expected_interval_min: 15, last_started_at: null, last_finished_at: null,
    last_status: null, last_error: null, age_minutes: null, runs_7d: 1, failed_7d: 0, partial_7d: 0, failed_in_last_3: 0,
  });

  it("distingue tâche à l'arrêt et incidents sur 7 jours", () => {
    expect(cronOneLine([row("A", "critical"), row("B", "degraded"), row("C", "degraded"), row("D", "ok")] as never))
      .toBe("1 tâche à l'arrêt : A. 2 tâches avec incidents sur 7 jours : B, C.");
    expect(cronOneLine([row("D", "ok")] as never)).toBe("1 tâche en bonne santé");
  });

  it("la migration écarte les tâches dont toutes les planifications sont désactivées", () => {
    const sql = readFileSync("drizzle/migrations/0089_cron1_sante_crons.sql", "utf8");
    expect(sql).toContain("AND NOT EXISTS (SELECT 1 FROM cron.job j WHERE j.active");
    expect(sql).toContain("GRANT EXECUTE ON FUNCTION public.admin_cron_health() TO authenticated, service_role;");
    expect(sql).not.toMatch(/[—–]/);
  });
});
