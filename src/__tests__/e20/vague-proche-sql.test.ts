/**
 * Lot E20 « Vague proche » : la migration 0098 est jouée sur un Postgres local
 * (PGlite) par scripts/test-e20-vague-proche.mjs. Recette : aucun envoi
 * au-delà de 30 km, vague 1 à 15 km quand au moins une personne y est, ordre
 * par distance, 10 au plus par vague, épuisement posé une seule fois.
 */
import { it, expect } from "vitest";
import { spawnSync } from "node:child_process";

it("vague proche : migration 0098 vérifiée sur Postgres local", () => {
  const run = spawnSync(process.execPath, ["scripts/test-e20-vague-proche.mjs"], {
    encoding: "utf8",
    timeout: 120_000,
  });
  const output = `${run.stdout ?? ""}\n${run.stderr ?? ""}`;
  expect(output).toContain("7 contrôles verts");
  expect(run.status, output).toBe(0);
}, 130_000);
