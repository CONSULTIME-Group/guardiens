/**
 * Lot ERRFIX du 05/11 : la migration 0115 est jouée sur un Postgres local
 * (PGlite) par scripts/test-errfix-distance-file.mjs. Une distance de 16 089 km
 * échoue avant la migration et s'enregistre après.
 */
import { it, expect } from "vitest";
import { spawnSync } from "node:child_process";

it("une annonce d'outre-mer tient dans la file des gardiens", () => {
  const run = spawnSync(process.execPath, ["scripts/test-errfix-distance-file.mjs"], {
    encoding: "utf8",
    timeout: 120_000,
  });
  const output = `${run.stdout ?? ""}\n${run.stderr ?? ""}`;
  expect(output).toContain("3 contrôles verts");
  expect(run.status, output).toBe(0);
}, 130_000);
