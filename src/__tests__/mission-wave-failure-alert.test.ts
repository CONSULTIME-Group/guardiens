import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { hasConsecutiveFailures, CRON_ENTITY_IDS } from "../../supabase/functions/_shared/cron-failure-logic";

describe("alerte notify-mission-wave", () => {
  it("déclenche à 2 échecs consécutifs seulement", () => {
    expect(hasConsecutiveFailures(["failed", "failed"])).toBe(true);
    expect(hasConsecutiveFailures(["failed", "success"])).toBe(false);
    expect(hasConsecutiveFailures(["failed"])).toBe(false);
    expect(hasConsecutiveFailures([null, "failed", "failed"])).toBe(true);
  });
  it("est branchée dans la fonction de diffusion", () => {
    const src = readFileSync("supabase/functions/notify-mission-wave/index.ts", "utf8");
    expect(src).toMatch(/checkCronFailureAlert\(supabase, "notify-mission-wave"/);
    expect(src).toMatch(/resolveCronFailureAlert\(supabase, "notify-mission-wave"\)/);
    expect(CRON_ENTITY_IDS["notify-mission-wave"]).toBeTruthy();
  });
  it("réutilise alert-admin-signals et son adresse critique", () => {
    const shared = readFileSync("supabase/functions/_shared/cron-failure-alert.ts", "utf8");
    expect(shared).toContain("/functions/v1/alert-admin-signals");
    expect(shared).toContain('severity: "critical"');
  });
  it("la migration 0020 garde le DELETE borné", () => {
    const sql = readFileSync("drizzle/migrations/0020_enqueue_mission_wave_safeupdate.sql", "utf8");
    expect(sql).toContain("DELETE FROM _wave_pick WHERE true;");
  });
});
