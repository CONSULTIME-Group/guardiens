#!/usr/bin/env node
/**
 * Garde différentielle des tests.
 *
 * Principe : la suite Vitest complète est exécutée, puis ses échecs sont
 * comparés à la référence figée dans scripts/test-guard/baseline.json.
 *
 * Le script ÉCHOUE (exit 1) dans deux cas uniquement :
 *   1. un échec NOUVEAU apparaît (absent de la référence) ;
 *   2. un test de la référence se remet à passer : la référence pourrit,
 *      il faut le retirer de baseline.json (ou relancer avec --update).
 *
 * Les fichiers listés dans `excludedFiles` (dépendants de la base de
 * production, instables par nature en CI) sont ignorés dans les deux sens.
 *
 * Usage :
 *   node scripts/test-guard/diff-guard.mjs           vérifie
 *   node scripts/test-guard/diff-guard.mjs --update  régénère la référence
 *                                                    depuis l'exécution courante
 *
 * Aide de débogage : TEST_GUARD_REPORT_PATH=<fichier.json> saute l'exécution
 * Vitest et compare le rapport JSON fourni.
 */
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(fileURLToPath(new URL(".", import.meta.url)), "../..");
const BASELINE_PATH = join(ROOT, "scripts", "test-guard", "baseline.json");
const UPDATE = process.argv.includes("--update");

/** Normalise un chemin absolu Vitest en chemin relatif au dépôt (src/...). */
const toRel = (p) => {
  const norm = String(p).replace(/\\/g, "/");
  const i = norm.indexOf("/src/");
  return i >= 0 ? norm.slice(i + 1) : norm;
};

const runSuite = () => {
  const reportPath = join(tmpdir(), `vitest-guard-${process.pid}.json`);
  const bin = join(ROOT, "node_modules", ".bin", process.platform === "win32" ? "vitest.cmd" : "vitest");
  // Vitest sort en code non nul dès qu'un test échoue : ce n'est PAS une
  // erreur de la garde, seul le rapport JSON compte.
  spawnSync(bin, ["run", "--reporter=default", "--reporter=json", `--outputFile.json=${reportPath}`], {
    cwd: ROOT,
    stdio: "inherit",
    env: process.env,
  });
  return reportPath;
};

const reportPath = process.env.TEST_GUARD_REPORT_PATH || runSuite();
if (!existsSync(reportPath)) {
  console.error(`Garde impossible : rapport Vitest introuvable (${reportPath}).`);
  process.exit(2);
}

let report;
try {
  report = JSON.parse(readFileSync(reportPath, "utf8"));
} catch (e) {
  console.error(`Garde impossible : rapport Vitest illisible (${e.message}).`);
  process.exit(2);
}

// Identifiant stable d'un test : "<fichier> :: <describe > ... > <it>"
const current = new Set();
for (const suite of report.testResults ?? []) {
  const file = toRel(suite.name);
  const assertions = suite.assertionResults ?? [];
  if (assertions.length === 0 && suite.status === "failed") {
    current.add(`${file} :: (échec d'exécution du fichier de test)`);
  }
  for (const t of assertions) {
    if (t.status !== "failed") continue;
    current.add(`${file} :: ${[...(t.ancestorTitles ?? []), t.title].join(" > ")}`);
  }
}

const baseline = JSON.parse(readFileSync(BASELINE_PATH, "utf8"));
const excluded = new Set((baseline.excludedFiles ?? []).map((e) => e.file));
const known = new Map((baseline.knownFailures ?? []).map((k) => [`${k.file} :: ${k.test}`, k.reason]));

const inScope = (id) => !excluded.has(id.split(" :: ")[0]);

if (UPDATE) {
  const previousReasons = new Map(known);
  const knownFailures = [...current]
    .filter(inScope)
    .sort()
    .map((id) => {
      const [file, ...rest] = id.split(" :: ");
      return {
        file,
        test: rest.join(" :: "),
        reason: previousReasons.get(id) || "à documenter",
      };
    });
  const next = { ...baseline, updated: new Date().toISOString().slice(0, 10), knownFailures };
  writeFileSync(BASELINE_PATH, JSON.stringify(next, null, 2) + "\n");
  console.log(`Référence régénérée : ${knownFailures.length} échec(s) toléré(s) dans ${BASELINE_PATH}`);
  process.exit(0);
}

const newFailures = [...current].filter((id) => inScope(id) && !known.has(id)).sort();
const fixed = [...known.keys()].filter((id) => !current.has(id)).sort();

const passed = report.numPassedTests ?? "?";
console.log(`Suite exécutée : ${passed} test(s) au vert, ${current.size} échec(s) dont ${baseline.excludedFiles?.length ?? 0} fichier(s) exclu(s) du périmètre.`);

let ko = false;
if (newFailures.length > 0) {
  ko = true;
  console.error(`\nÉCHEC DE LA GARDE : ${newFailures.length} échec(s) NOUVEAU(x) absent(s) de la référence :`);
  for (const id of newFailures) console.error(`  - ${id}`);
}
if (fixed.length > 0) {
  ko = true;
  console.error(`\nÉCHEC DE LA GARDE : ${fixed.length} test(s) de la référence passent désormais. Retirez-les de scripts/test-guard/baseline.json (ou --update) :`);
  for (const id of fixed) console.error(`  - ${id}`);
}
if (ko) process.exit(1);

console.log(`Garde OK : aucun nouvel échec, ${known.size} échec(s) connu(s) toujours présents et tolérés.`);
