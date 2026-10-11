/**
 * Lot I2 : la migration des propositions privées est jouée sur un Postgres
 * local (PGlite) par scripts/test-sit-private-proposals.mjs. Ce test la
 * rattache à la garde des tests, donc à chaque build et à la CI.
 */
import { it, expect } from "vitest";
import { spawnSync } from "node:child_process";

it("propositions privées : migration vérifiée sur Postgres local", () => {
  const run = spawnSync(process.execPath, ["scripts/test-sit-private-proposals.mjs"], {
    encoding: "utf8",
    timeout: 120_000,
  });
  const output = `${run.stdout ?? ""}\n${run.stderr ?? ""}`;
  expect(output).toContain("contrôles verts");
  expect(run.status, output).toBe(0);
}, 130_000);
