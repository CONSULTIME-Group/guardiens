import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import {
  WAVE_SEND_SPACING_MS,
  parseRetryAfterMs,
  sendWithRateLimitRetry,
  selectStaleQueued,
  queueUpdateFor,
  waveRunStatus,
  type SendOutcome,
} from "../../supabase/functions/_shared/mission-wave-delivery";

const src = readFileSync("supabase/functions/notify-mission-wave/index.ts", "utf8");
const noSleep = async () => {};
const rl: SendOutcome = { ok: false, rateLimited: true, retryAfterMs: 16404 };
const ok: SendOutcome = { ok: true, rateLimited: false, retryAfterMs: null };

describe("rattrapage des personnes restées en file", () => {
  const now = new Date("2026-09-27T17:40:00Z");
  const rows = [
    { helper_id: "a", status: "queued", sent_at: null, queued_at: "2026-09-27T17:25:46Z" },
    { helper_id: "b", status: "queued", sent_at: null, queued_at: "2026-09-27T17:35:00Z" },
    { helper_id: "c", status: "sent", sent_at: "2026-09-27T17:26:00Z", queued_at: "2026-09-27T17:25:46Z" },
  ];

  it("reprend une ligne queued depuis plus de dix minutes et la passe à sent", async () => {
    const stale = selectStaleQueued(rows, now);
    expect(stale.map((r) => r.helper_id)).toEqual(["a"]);
    const result = await sendWithRateLimitRetry(async () => ok, noSleep);
    expect(queueUpdateFor(result, now.toISOString())).toMatchObject({ status: "sent", sent_at: now.toISOString() });
  });

  it("laisse wave_count inchangé", () => {
    const body = src.slice(src.indexOf("async function catchUpQueued"), src.indexOf("async function runWave"));
    expect(body).not.toMatch(/small_missions"\)\s*\.update/);
    expect(body).not.toContain("enqueue_mission_wave");
    expect(body).not.toMatch(/wave_count\s*:/);
    // reprise avec le jeton actif, sinon token_missing
    expect(body).toContain('.eq("action", "can_help")');
    expect(body).toContain('"token_missing"');
  });

  it("est appelé en tête de runWave et à chaque passage horaire", () => {
    const run = src.slice(src.indexOf("async function runWave"));
    expect(run.indexOf("catchUpQueued(")).toBeLessThan(run.indexOf("enqueue_mission_wave"));
    expect(src).toContain("const cu = await catchUpQueued(supabase, m.id as string, now);");
  });
});

describe("limite de débit", () => {
  it("lit le délai annoncé", () => {
    expect(parseRetryAfterMs("Rate limit exceeded for trace x. Retry after 16404ms.")).toBe(16404);
    expect(parseRetryAfterMs("", "2")).toBe(2000);
  });

  it("une seule nouvelle tentative après le délai, puis envoi", async () => {
    const waits: number[] = [];
    let calls = 0;
    const r = await sendWithRateLimitRetry(async () => (++calls === 1 ? rl : ok), async (ms) => { waits.push(ms); });
    expect(r).toBe("sent");
    expect(calls).toBe(2);
    expect(waits).toEqual([16404]);
  });

  it("un second échec laisse la ligne en queued plutôt que de la perdre", async () => {
    let calls = 0;
    const r = await sendWithRateLimitRetry(async () => { calls++; return rl; }, noSleep);
    expect(calls).toBe(2);
    expect(r).toBe("deferred");
    expect(queueUpdateFor(r, new Date().toISOString())).toBeNull();
    expect(src).toContain('if (result === "deferred") { deferred++; continue; }');
  });

  it("espace les envois d'environ 600 ms", () => {
    expect(WAVE_SEND_SPACING_MS).toBe(600);
    expect(src).toContain("await sleep(WAVE_SEND_SPACING_MS);");
  });
});

describe("statut du passage", () => {
  it("27 envois sur 29 : partial", () => {
    expect(waveRunStatus(27, 2, 0)).toBe("partial");
    expect(waveRunStatus(27, 0, 1)).toBe("partial");
  });
  it("failed seulement si rien n'est parti", () => {
    expect(waveRunStatus(0, 2, 0)).toBe("failed");
    expect(waveRunStatus(0, 0, 1)).toBe("failed");
    expect(waveRunStatus(5, 0, 0)).toBe("success");
  });
  it("le passage horaire écrit partial dans le journal", () => {
    expect(src).toContain("await run.finish(runStatus, metrics);");
  });
});
