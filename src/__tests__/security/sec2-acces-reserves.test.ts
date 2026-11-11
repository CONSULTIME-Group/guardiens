import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

// Verrou SEC2 du 11/11/2026 (revue sécurité).
const read = (path: string) => readFileSync(join(process.cwd(), path), "utf8");

describe("accès réservés du lot SEC2", () => {
  it("notify-indexnow contrôle le rôle avant toute lecture du corps", () => {
    const source = read("supabase/functions/notify-indexnow/index.ts");
    const guard = source.indexOf("requireAdminOrServiceRole(req, corsHeaders)");
    expect(guard).toBeGreaterThan(-1);
    expect(guard).toBeLessThan(source.indexOf("req.json()"));
    expect(guard).toBeLessThan(source.indexOf("createClient(supabaseUrl"));
  });

  it("consume_application_action_token est réservée au rôle service", () => {
    const sql = read("drizzle/migrations/0137_sec2_jeton_candidature_service.sql");
    expect(sql).toMatch(/REVOKE EXECUTE ON FUNCTION public\.consume_application_action_token\(text, text\) FROM PUBLIC, anon, authenticated/);
    expect(sql).toMatch(/GRANT EXECUTE ON FUNCTION public\.consume_application_action_token\(text, text\) TO service_role/);
  });

  it("application-quick-action appelle la fonction avec le client de service", () => {
    const source = read("supabase/functions/application-quick-action/index.ts");
    expect(source).toMatch(/service\.rpc\("consume_application_action_token"/);
  });
});
