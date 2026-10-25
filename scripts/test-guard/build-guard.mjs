#!/usr/bin/env node
/**
 * Garde ciblée du build de production (décision de Jérémie du 25/10/2026).
 *
 * La suite complète (test:guard, 11 min 24 s mesurées le 25/10/2026) faisait
 * dépasser au build Lovable son temps limite : plus aucune publication ne
 * passait. Elle reste exécutée par la CI GitHub sur chaque push vers main et
 * sur chaque PR (.github/workflows/test-guard.yml), et une publication se
 * fait seulement quand la CI de main est verte.
 *
 * Le build rejoue ici les tests qui lisent ce qu'il produit ou sert :
 * llms.txt, sitemap, robots.txt, index.html, fichiers de public/, dist
 * (P2_BUILD_DIR). Un test rouge bloque toujours la publication.
 */
import { existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const BUILD_GUARD_FILES = [
  "src/__tests__/associations.test.ts",
  "src/__tests__/build-garde-cible.test.ts",
  "src/__tests__/cpt1/compteurs-coherents.test.ts",
  "src/__tests__/llms-txt-coverage.test.ts",
  "src/__tests__/lot0-signup-role-and-push.test.tsx",
  "src/__tests__/n2/push-badge.test.ts",
  "src/__tests__/og-apercus-rubriques.test.tsx",
  "src/__tests__/p2/startup-build.test.ts",
  "src/__tests__/p5/sitemap-canonical.test.ts",
  "src/__tests__/push-nearby-and-self-test.test.ts",
  "src/__tests__/push-worker.test.ts",
  "src/__tests__/qc1/gardiennage-quebec.test.ts",
  "src/__tests__/robots-groups.test.ts",
  "src/__tests__/seo1/llms-et-gratuite.test.ts",
  "src/__tests__/seo3/live-sitemap.test.ts",
  "src/__tests__/seoe/regle-villes-llms.test.ts",
  "src/__tests__/sitter-profile-indexability-single-source.test.ts",
  "src/__tests__/sync-index-html-guard.test.ts",
  "src/__tests__/x3b/push-mission-response.test.ts",
  "src/__tests__/x3c/textes-gratuite-ponctuation.test.ts",
  "src/__tests__/y3/doctrine-textes.test.ts",
];

const isMain = Boolean(process.argv[1]) && import.meta.url.startsWith("file:")
  && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const ROOT = resolve(fileURLToPath(new URL(".", import.meta.url)), "../..");
  const missing = BUILD_GUARD_FILES.filter((f) => !existsSync(join(ROOT, f)));
  if (missing.length) {
    console.error(`❌ Garde du build : fichier(s) de test introuvable(s) :\n${missing.map((f) => `   ${f}`).join("\n")}`);
    process.exit(1);
  }
  const bin = join(ROOT, "node_modules", ".bin", process.platform === "win32" ? "vitest.cmd" : "vitest");
  const run = spawnSync(bin, ["run", ...BUILD_GUARD_FILES], { cwd: ROOT, stdio: "inherit", env: process.env });
  if (run.status !== 0) {
    console.error("❌ Garde du build : un test rouge bloque la publication.");
    process.exit(run.status ?? 1);
  }
  console.log(`✅ Garde du build : ${BUILD_GUARD_FILES.length} fichiers de tests au vert.`);
}
