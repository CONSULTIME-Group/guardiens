import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const sql = readFileSync("drizzle/migrations/0157_dig1_recap_gardiens_demi_heure.sql", "utf8");
const fn = readFileSync("supabase/functions/send-sitter-daily-digest/index.ts", "utf8");

describe("DIG1, récapitulatif gardiens toutes les 30 minutes", () => {
  it("horaire aux minutes 05 et 35, hors de la minute 00", () => {
    expect(sql).toContain("schedule := '5,35 5-12 * * *'");
    expect(sql).toContain("j.jobname = 'sitter-daily-digest'");
    expect(sql).toContain("-- dig1_recap_gardiens_demi_heure");
  });
  it("le passage tient dans 30 minutes : budget et verrou inchangés", () => {
    expect(fn).toContain("const RUN_BUDGET_MS = 110_000");
    expect(fn).toContain("const DIGEST_LOCK_TTL_SECONDS = 180");
  });
});
