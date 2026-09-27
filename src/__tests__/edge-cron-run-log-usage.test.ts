import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

/**
 * Non-régression : un client Supabase passé à startCronRun a été sérialisé
 * dans cron_run_log.edge_name, clé de service comprise.
 */
const ROOT = "supabase/functions";
const walk = (dir: string): string[] =>
  readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? walk(p) : p.endsWith(".ts") ? [p] : [];
  });
const files = walk(ROOT).map((p) => [p, readFileSync(p, "utf8")] as const);

describe("usage de startCronRun dans les edge functions", () => {
  const calls = files.flatMap(([p, src]) =>
    [...src.matchAll(/(?<!function )startCronRun\(\s*([^)]*)\)/g)].map((m) => [p, m[1].trim()] as const),
  );

  it("au moins un appel est trouvé", () => {
    expect(calls.length).toBeGreaterThan(10);
  });

  it.each(calls)("%s : premier argument littéral ou config.edgeName (%s)", (_p, args) => {
    expect(args).toMatch(/^(["'`])[a-z0-9-]+\1$|^config\.edgeName$/);
  });

  it("aucun appel à .ok sur le résultat de startCronRun", () => {
    for (const [p, src] of files) {
      if (!src.includes("startCronRun")) continue;
      expect(src, p).not.toMatch(/\brun\??\.ok\??\.?\(/);
    }
  });

  it("send-mission-choose-prompt termine et échoue proprement", () => {
    const src = readFileSync(`${ROOT}/send-mission-choose-prompt/index.ts`, "utf8");
    expect(src).toContain("run.finish(");
    expect(src).toContain("run.fail(");
  });

  it("le helper remplace un nom invalide sans sérialiser l'argument", () => {
    const src = readFileSync(`${ROOT}/_shared/cron-run-log.ts`, "utf8");
    expect(src).toContain('edge_name: "invalid-edge-name"');
    expect(src).toContain("startCronRun appelé sans nom valide");
  });
});
