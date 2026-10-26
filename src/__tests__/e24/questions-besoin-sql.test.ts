/**
 * Lot E24 : la migration 0108 est jouée sur un Postgres local (PGlite) par
 * scripts/test-e24-questions.mjs. Recette : un visiteur lit les questions
 * publiques et jamais une réponse gardée privée, l'auteur et la personne qui
 * pose lisent aussi le privé, un projet participatif n'a aucune question, les
 * contraintes de la table tiennent.
 */
import { it, expect } from "vitest";
import { spawnSync } from "node:child_process";

it("questions d'un besoin : migration 0108 vérifiée sur Postgres local", () => {
  const run = spawnSync(process.execPath, ["scripts/test-e24-questions.mjs"], {
    encoding: "utf8",
    timeout: 120_000,
  });
  const output = `${run.stdout ?? ""}\n${run.stderr ?? ""}`;
  expect(output).toContain("recette E24 : 16 contrôles verts");
  expect(run.status, output).toBe(0);
}, 130_000);
