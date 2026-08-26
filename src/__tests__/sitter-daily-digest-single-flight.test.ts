import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";
import { isLockAvailable } from "../../supabase/functions/_shared/worker-lock";

const SRC = readFileSync("supabase/functions/send-sitter-daily-digest/index.ts", "utf8");

describe("send-sitter-daily-digest, verrou single flight", () => {
  it("prend un bail périmable, calibré au dessus du budget d'exécution", () => {
    expect(SRC).toContain("const DIGEST_LOCK_KEY = 'send-sitter-daily-digest'");
    expect(SRC).toContain("const DIGEST_LOCK_TTL_SECONDS = 180");
    expect(SRC).toContain("acquireWorkerLock(supabase as any, DIGEST_LOCK_KEY, DIGEST_LOCK_TTL_SECONDS)");
  });

  it("laisse la main sans erreur, motif explicite en réponse et dans cron_run_log", () => {
    expect(SRC).toContain("reason: 'lock_held', sitters_processed: 0");
    expect(SRC).toContain("json({ ok: true, skipped: true, reason: 'lock_held' })");
  });

  it("rend le bail en fin de passage, quelle que soit l'issue", () => {
    expect(SRC).toContain("} finally {");
    expect(SRC).toContain("if (lockHeld) await releaseWorkerLock(supabase as any, DIGEST_LOCK_KEY)");
  });

  it("le mode manuel et le mode dry_run passent outre", () => {
    expect(SRC).toContain("const needsLock = !body.manual && !body.dry_run");
  });

  it("un bail périmé est repris sans intervention humaine", () => {
    const now = Date.parse("2026-08-26T09:00:00Z");
    expect(isLockAvailable(now, "2026-08-26T08:58:00Z")).toBe(true);
    expect(isLockAvailable(now, "2026-08-26T09:02:00Z")).toBe(false);
    expect(isLockAvailable(now, null)).toBe(true);
  });
});

describe("send-sitter-daily-digest, adresse structurellement rejetée", () => {
  it("sort les lignes de la file avec un motif distinct et lève un signal", () => {
    expect(SRC).toContain("isPermanentRecipientRejection(_steTxt1)");
    expect(SRC).toContain("'invalid_recipient_email'");
    expect(SRC).toContain("raiseInvalidRecipientSignal(supabase, {");
  });

  it("conserve le chemin de report pour les échecs temporaires", () => {
    expect(SRC).toContain("deferred_retry:http_");
  });
});
