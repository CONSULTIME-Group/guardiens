import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

// Verrou JOURN2 du 16/11/2026 : les tâches planifiées qui n'écrivaient rien
// dans cron_run_log passent par le journal, et aucune tâche appelée par pg_net
// ne part sur une minute multiple de 5 (délais DNS relevés le 16/11/2026).
const read = (path: string) => readFileSync(path, "utf8");
const MIGRATION = "drizzle/migrations/0178_journ2_taches_journalisees.sql";
const sql = read(MIGRATION);
const helper = read("supabase/functions/_shared/cron-run-log.ts");

type Wrapped = [name: string, wrapper: "withCronRunLog" | "withCronFailureLog", tail: string];
const WRAPPED: Wrapped[] = [
  ["alert-content-quality", "withCronRunLog", "}));"],
  ["send-analysis-requests-digest", "withCronRunLog", "}));"],
  ["email-delivery-daily", "withCronRunLog", "}));"],
  ["send-mission-meetup-prompt", "withCronRunLog", "}));"],
  ["enrich-guide-places-osm", "withCronFailureLog", "}, 10, { isScheduledCall: isGeocodeSecretCall }));"],
  ["geocode-city-pages", "withCronFailureLog", "}, 10, { isScheduledCall: isGeocodeSecretCall }));"],
  ["source-guide-places", "withCronFailureLog", "}, 2, { isScheduledCall: isGeocodeSecretCall }));"],
];

/** Minutes d'un champ cron simple : nombres, listes, plages et pas. */
function cronMinutes(field: string): number[] {
  const out = new Set<number>();
  for (const part of field.split(",")) {
    const [range, stepRaw] = part.split("/");
    const step = stepRaw ? Number(stepRaw) : 1;
    let from: number;
    let to: number;
    if (range === "*") {
      from = 0;
      to = 59;
    } else if (range.includes("-")) {
      [from, to] = range.split("-").map(Number);
    } else {
      from = Number(range);
      to = stepRaw ? 59 : from;
    }
    for (let m = from; m <= to; m += step) out.add(m);
  }
  return [...out];
}

/** Lignes (tâche, ancien horaire, nouvel horaire) de la migration. */
function scheduleRows(): Array<[string, string, string]> {
  const block = sql.slice(sql.indexOf("$journ2_horaires$"), sql.lastIndexOf("$journ2_horaires$"));
  const rows: Array<[string, string, string]> = [];
  for (const m of block.matchAll(/\('([a-z0-9_-]+)',\s*'([^']+)',\s*'([^']+)'\)/g)) {
    rows.push([m[1], m[2], m[3]]);
  }
  return rows;
}

describe("JOURN2, fonctions planifiées journalisées", () => {
  it.each(WRAPPED)("%s importe et utilise %s", (name, wrapper, tail) => {
    const source = read(`supabase/functions/${name}/index.ts`);
    expect(source).toMatch(new RegExp(`import \\{[^}]*\\b${wrapper}\\b[^}]*\\} from "\\.\\./_shared/cron-run-log\\.ts";`));
    expect(source).toContain(`Deno.serve(${wrapper}("${name}", async (req) => {`);
    expect(source.trimEnd().endsWith(tail)).toBe(true);
    expect(source.match(/Deno\.serve\(/g)).toHaveLength(1);
  });

  it("send-mission-meetup-prompt n'écrit plus de seconde ligne par startCronRun", () => {
    const source = read("supabase/functions/send-mission-meetup-prompt/index.ts");
    expect(source).not.toContain("startCronRun(");
  });

  it("le secret des tâches de guides compte comme appel planifié, la clé de service d'abord", () => {
    expect(helper).toContain("export function isGeocodeSecretCall(req: Request): boolean {");
    expect(helper).toContain('req.headers.get("x-geocode-secret") === secret');
    expect(helper).toContain("if (isServiceRoleCall(req)) return true;");
    expect(helper.match(/!isScheduledCronCall\(req, options\)/g)).toHaveLength(2);
  });
});

describe("JOURN2, horaires des tâches pg_net", () => {
  const rows = scheduleRows();

  it("la migration déplace les 55 tâches relevées le 16/11/2026", () => {
    expect(rows).toHaveLength(55);
    expect(new Set(rows.map((r) => r[0])).size).toBe(55);
  });

  it.each(rows)("%s ne part sur aucune minute multiple de 5 (%s puis %s)", (_job, _old, next) => {
    expect(next).not.toBe("* * * * *");
    const minutes = cronMinutes(next.split(" ")[0]);
    expect(minutes.length).toBeGreaterThan(0);
    expect(minutes.filter((m) => m % 5 === 0)).toEqual([]);
    expect(minutes.every((m) => m >= 0 && m <= 59)).toBe(true);
  });

  it.each(rows)("%s garde ses heures, jours et mois", (_job, old, next) => {
    expect(next.split(" ").slice(1)).toEqual(old.split(" ").slice(1));
    expect(cronMinutes(next.split(" ")[0]).length).toBeLessThanOrEqual(cronMinutes(old.split(" ")[0]).length);
  });

  it("les tâches calées sur l'heure de Paris gardent leurs deux heures UTC (CRON2)", () => {
    const byJob = new Map(rows.map(([job, , next]) => [job, next]));
    expect(byJob.get("alert-digest-12h")).toBe("2 10,11 * * *");
    expect(byJob.get("alert-digest-18h")).toBe("2 16,17 * * *");
    expect(byJob.get("nearby-daily-digest")).toBe("8 6-11 * * *");
  });

  it("aucune tâche chaque minute n'est touchée, la migration est rejouable", () => {
    for (const job of ["dispatch-web-push", "flush-deferred-emails", "process-mass-email-queue"]) {
      expect(sql).not.toContain(`'${job}'`);
    }
    expect(sql).toContain("ELSIF v_current = r.old_schedule THEN");
    expect(sql).toContain("PERFORM cron.alter_job(job_id := v_job, schedule := r.new_schedule);");
    expect(sql).not.toMatch(/cron\.schedule\(/);
  });

  it("admin_cron_health suit les six fonctions, repère et délai de grâce", () => {
    expect(sql).toContain("journ2_taches_journalisees");
    for (const name of [
      "alert-content-quality",
      "send-analysis-requests-digest",
      "email-delivery-daily",
      "send-mission-meetup-prompt",
      "geocode-city-pages",
      "source-guide-places",
    ]) {
      expect(sql).toMatch(new RegExp(`\\('${name}', \\d+, '`));
      expect(sql).toContain(`('${name}', timestamptz '2026-11-17 08:00:00+00')`);
    }
    expect(sql).not.toMatch(/\('enrich-guide-places-osm', \d+, '/);
  });

  it("le contrat de production couvre la migration", () => {
    const manifest = JSON.parse(read("scripts/db/production-contracts.json"));
    const contract = manifest.contracts.find((c: { migration: string }) => c.migration === "0178_journ2_taches_journalisees.sql");
    expect(contract).toBeTruthy();
    expect(contract.checks.map((c: { name: string }) => c.name)).toEqual([
      "sante_repere",
      "aucun_appel_pg_net_minute_multiple_de_5",
    ]);
  });
});
