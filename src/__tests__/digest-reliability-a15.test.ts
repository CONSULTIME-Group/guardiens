import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import {
  runInBatches,
  DigestErrorCollector,
  sitterDigestRunStatus,
  DIGEST_BATCH_SIZE,
  DIGEST_BATCH_PAUSE_MS,
} from "../../supabase/functions/_shared/digest-batching";

const src = readFileSync("supabase/functions/send-mutual-aid-weekly-digest/index.ts", "utf8");

describe("A15, résumé hebdomadaire entraide", () => {
  it("au plus 5 appels ouverts, pause de 700 ms entre deux lots", async () => {
    let open = 0, max = 0;
    const pauses: number[] = [];
    const items = Array.from({ length: 23 }, (_, i) => i);
    const res = await runInBatches(items, async () => {
      open++; max = Math.max(max, open);
      await new Promise((r) => setTimeout(r, 1));
      open--; return "sent";
    }, { sleep: async (ms) => { pauses.push(ms); } });
    expect(DIGEST_BATCH_SIZE).toBe(5);
    expect(max).toBe(5);
    expect(pauses).toEqual([700, 700, 700, 700]);
    expect(DIGEST_BATCH_PAUSE_MS).toBe(700);
    expect(res.sent).toBe(23);
  });

  it("erreurs et failed_by_status, sans adresse email, limitées à 20", async () => {
    const c = new DigestErrorCollector();
    for (let i = 0; i < 25; i++) c.add(`u${i}`, i % 2 ? 503 : "TypeError", "échec pour jean@exemple.fr");
    expect(c.errors).toHaveLength(20);
    expect(c.byStatus).toEqual({ "503": 12, TypeError: 13 });
    expect(c.errors[0].message).not.toMatch(/@/);
  });

  it("une exception réseau compte en échec, les autres continuent", async () => {
    const c = new DigestErrorCollector();
    const res = await runInBatches([1, 2, 3], async (n) => {
      if (n === 2) throw new TypeError("fetch failed");
      return "sent";
    }, { sleep: async () => {}, onThrow: (n, e) => c.add(String(n), (e as Error).name, e) });
    expect(res).toEqual({ sent: 2, skipped: 0, failed: 1 });
    expect(c.byStatus).toEqual({ TypeError: 1 });
  });

  it("run.finish reçoit errors, failed_by_status, duration_ms et pass", () => {
    const finish = src.slice(src.indexOf("await run.finish(status"));
    for (const k of ["errors: collector.errors", "failed_by_status: collector.byStatus", "duration_ms", "pass,"]) {
      expect(finish).toContain(k);
    }
    expect(src).toContain("body.pass === 'catch_up' ? 'catch_up' : 'main'");
  });

  it("rattrapage : même clé du jour et même vérification du journal sur 6 jours, dry_run inchangé", () => {
    expect(src).toContain("`${TEMPLATE}-${row.user_id}-${dayKey}`");
    expect(src).toContain(".in('status', ['sent', 'pending', 'deferred'])");
    expect(src).toContain("6 * 86400_000");
    const dedup = src.indexOf("if (prev && prev.length > 0) return 'skipped'");
    const dry = src.indexOf("if (body.dry_run) return 'skipped'");
    const call = src.indexOf("functions/v1/send-transactional-email");
    expect(dedup).toBeGreaterThan(0);
    expect(dedup).toBeLessThan(call);
    expect(dry).toBeLessThan(call);
  });

  it("rattrapage : aucun appel pour un membre déjà servi", async () => {
    let calls = 0;
    const served = new Set(["a"]);
    const res = await runInBatches(["a", "b"], async (id) => {
      if (served.has(id)) return "skipped";
      calls++; return "sent";
    }, { sleep: async () => {} });
    expect(calls).toBe(1);
    expect(res.skipped).toBe(1);
  });

  it("migration du cron de rattrapage : mardi 10:00 UTC, pass catch_up", () => {
    const sql = readFileSync("supabase/migrations/20260929220000_mutual_aid_digest_catch_up_cron.sql", "utf8");
    expect(sql).toContain("'0 10 * * 2'");
    expect(sql).toContain("'pass','catch_up'");
  });
});

describe("A15, résumé quotidien gardiens", () => {
  it("budget atteint avec passage suivant prévu : success", () => {
    expect(sitterDigestRunStatus({ errorsCount: 0, budgetReached: true, queueRemaining: 41, utcHour: 6 })).toBe("success");
  });
  it("file non vide au dernier passage : partial", () => {
    expect(sitterDigestRunStatus({ errorsCount: 0, budgetReached: true, queueRemaining: 3, utcHour: 8 })).toBe("partial");
  });
  it("erreur d'envoi : partial", () => {
    expect(sitterDigestRunStatus({ errorsCount: 1, budgetReached: false, queueRemaining: 0, utcHour: 5 })).toBe("partial");
  });
  it("la fonction écrit budget_reached et queue_remaining", () => {
    const s = readFileSync("supabase/functions/send-sitter-daily-digest/index.ts", "utf8");
    expect(s).toContain("sitterDigestRunStatus(");
    expect(s).toContain("budget_reached: budgetReached");
    expect(s).toContain("queue_remaining: queueRemaining ?? 0");
  });
});
