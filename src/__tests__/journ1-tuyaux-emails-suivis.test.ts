import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

// Verrou JOURN1 du 11/11/2026 : les tâches d'emails très fréquentes écrivent
// chaque échec et un battement horaire dans cron_run_log.
const read = (path: string) => readFileSync(path, "utf8");
const helper = read("supabase/functions/_shared/cron-run-log.ts");

describe("journal des tâches d'emails très fréquentes", () => {
  const cases: Array<[string, number]> = [
    ["flush-deferred-emails", 1],
    ["process-mass-email-queue", 1],
    ["email-pipeline-watchdog", 5],
    ["mass-email-watchdog", 5],
  ];

  it.each(cases)("%s passe par withCronFailureLog, fenêtre de %i minute(s)", (name, window) => {
    const source = read(`supabase/functions/${name}/index.ts`);
    expect(source).toContain(`Deno.serve(withCronFailureLog("${name}", async (req) => {`);
    expect(source).toContain(`\n}, ${window}));`);
    expect(source.match(/Deno\.serve\(/g)).toHaveLength(1);
  });

  it("le journal écrit chaque échec et un succès par heure seulement", () => {
    const start = helper.indexOf("export function withCronFailureLog(");
    expect(start).toBeGreaterThan(-1);
    const body = helper.slice(start);
    expect(body).toContain('await write("failed", metrics, bodyError ? String(bodyError) : `HTTP ${res.status}`)');
    expect(body).toContain('await write("failed", {}, describeError(e))');
    expect(body).toContain("} else if (isHeartbeatMinute(startedAt, windowMinutes)) {");
    expect(body).toContain("if (req.method === \"OPTIONS\" || !isServiceRoleCall(req)) return handler(req);");
    // Aucune ligne ouverte en début de passage : pas de startCronRun ici.
    expect(body).not.toContain("startCronRun(");
  });

  it("la migration suit les quatre tâches avec un battement de 60 minutes", () => {
    const sql = read("drizzle/migrations/0138_journ1_tuyaux_emails_suivis.sql");
    for (const [name] of cases) {
      expect(sql).toContain(`('${name}', 60,`);
      expect(sql).toContain(`('${name}', timestamptz '2026-11-12 08:00:00+00')`);
    }
    expect(sql).toContain("journ1_tuyaux_suivis");
  });
});
