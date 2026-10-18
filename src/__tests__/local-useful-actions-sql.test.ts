/** Migration exécutée sur PostgreSQL local ; aucune donnée de production. */
import { expect, it } from "vitest";
import { spawnSync } from "node:child_process";

it("actions locales : distances, droits et changement de compte vérifiés sur Postgres", () => {
  const run = spawnSync(process.execPath, ["scripts/test-local-useful-actions.mjs"], {
    encoding: "utf8", timeout: 90_000,
  });
  expect(run.status, `${run.stdout ?? ""}\n${run.stderr ?? ""}`).toBe(0);
}, 100_000);
