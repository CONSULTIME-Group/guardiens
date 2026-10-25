/**
 * Lot E17 « La boucle tenue » : la migration 0099 est jouée sur un Postgres
 * local (PGlite) par scripts/test-e17-boucle-tenue.mjs. Recette : un bouton
 * par répondant dans mission-response-received, le jeton accepte la réponse
 * sans connexion, une requête distingue clôture et refus, arrival_intent est
 * écrit à l'inscription.
 */
import { it, expect } from "vitest";
import { spawnSync } from "node:child_process";

it("boucle tenue : migration 0099 vérifiée sur Postgres local", () => {
  const run = spawnSync(process.execPath, ["scripts/test-e17-boucle-tenue.mjs"], {
    encoding: "utf8",
    timeout: 120_000,
  });
  const output = `${run.stdout ?? ""}\n${run.stderr ?? ""}`;
  expect(output).toContain("9 contrôles verts");
  expect(run.status, output).toBe(0);
}, 130_000);
