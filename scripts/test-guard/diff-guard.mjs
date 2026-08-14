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
 * Confirmation en isolation : plusieurs gardes-fous sont des scans statiques
 * (comptage de fichiers, lecture disque) sensibles à la charge I/O du run
 * complet — ils peuvent y échouer de façon non reproductible (constaté le
 * 14/08/2026 sur global-bottom-nav, i18n-single-storage-key,
 * llms-txt-coverage, no-unconsumed-supabase-call : rouges en run complet,
 * verts en isolation). Tout écart est donc rejoué fichier par fichier,
 * séquentiellement, avant verdict : seul un écart REPRODUCTIBLE en
 * isolation bloque. Les écarts non reproductibles sont listés en avertissement.
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
 * Vitest (et la confirmation en isolation) et compare le rapport JSON fourni.
 */
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(fileURLToPath(new URL(".", import.meta.url)), "../..");
const BASELINE_PATH = join(ROOT, "scripts", "test-guard", "baseline.json");
const UPDATE = process.argv.includes("--update");
const SKIP_ISOLATION = Boolean(process.env.TEST_GUARD_REPORT_PATH);
const VITEST_BIN = join(ROOT, "node_modules", ".bin", process.platform === "win32" ? "vitest.cmd" : "vitest");

/** Normalise un chemin absolu Vitest en chemin relatif au dépôt (src/...). */
const toRel = (p) => {
  const norm = String(p).replace(/\\/g, "/");
  const i = norm.indexOf("/src/");
  return i >= 0 ? norm.slice(i + 1) : norm;
};

/**
 * Exécute Vitest (suite complète si `files` est vide) et retourne le chemin
 * du rapport JSON. Vitest sort en code non nul dès qu'un test échoue : ce
 * n'est PAS une erreur de la garde, seul le rapport compte.
 */
const runVitest = (files, quiet) => {
  const reportPath = join(tmpdir(), `vitest-guard-${process.pid}-${Math.random().toString(36).slice(2)}.json`);
  const reporters = quiet
    ? ["--reporter=json"]
    : ["--reporter=default", "--reporter=json"];
  spawnSync(
    VITEST_BIN,
    ["run", ...files, ...reporters, `--outputFile.json=${reportPath}`],
    { cwd: ROOT, stdio: quiet ? ["ignore", "ignore", "inherit"] : "inherit", env: process.env },
  );
  return reportPath;
};

/** Extrait les identifiants stables "<fichier> :: <describe > ... > <it>" des échecs d'un rapport. */
const collectFailedIds = (report) => {
  const ids = new Set();
  for (const suite of report.testResults ?? []) {
    const file = toRel(suite.name);
    const assertions = suite.assertionResults ?? [];
    if (assertions.length === 0 && suite.status === "failed") {
      ids.add(`${file} :: (échec d'exécution du fichier de test)`);
    }
    for (const t of assertions) {
      if (t.status !== "failed") continue;
      ids.add(`${file} :: ${[...(t.ancestorTitles ?? []), t.title].join(" > ")}`);
    }
  }
  return ids;
};

const parseReport = (path) => {
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch {
    return null;
  }
};

/**
 * Rejoue les fichiers concernés un par un (séquentiel, sortie silencieuse)
 * et retourne le sous-ensemble d'identifiants qui échouent AUSSI en
 * isolation. Rapport illisible : prudence, l'identifiant est conservé.
 */
const confirmInIsolation = (ids) => {
  const byFile = new Map();
  for (const id of ids) {
    const file = id.split(" :: ")[0];
    if (!byFile.has(file)) byFile.set(file, []);
    byFile.get(file).push(id);
  }
  const confirmed = new Set();
  for (const [file, fileIds] of byFile) {
    const report = parseReport(runVitest([file], true));
    const stillFailing = report ? collectFailedIds(report) : null;
    for (const id of fileIds) {
      if (!stillFailing || stillFailing.has(id)) confirmed.add(id);
    }
  }
  return confirmed;
};

const reportPath = process.env.TEST_GUARD_REPORT_PATH || runVitest([], false);
if (!existsSync(reportPath)) {
  console.error(`Garde impossible : rapport Vitest introuvable (${reportPath}).`);
  process.exit(2);
}
const report = parseReport(reportPath);
if (!report) {
  console.error(`Garde impossible : rapport Vitest illisible (${reportPath}).`);
  process.exit(2);
}
const current = collectFailedIds(report);

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

const newFailuresRaw = [...current].filter((id) => inScope(id) && !known.has(id)).sort();
const fixedRaw = [...known.keys()].filter((id) => !current.has(id)).sort();

const passed = report.numPassedTests ?? "?";
console.log(`Suite exécutée : ${passed} test(s) au vert, ${current.size} échec(s) dont ${baseline.excludedFiles?.length ?? 0} fichier(s) exclu(s) du périmètre.`);

// Confirmation en isolation des écarts avant verdict (voir en-tête).
let newFailures = newFailuresRaw;
let fixed = fixedRaw;
let flaky = [];
if (!SKIP_ISOLATION && (newFailuresRaw.length > 0 || fixedRaw.length > 0)) {
  console.log(`Rejeu en isolation de ${newFailuresRaw.length + fixedRaw.length} écart(s) avant verdict…`);
  const confirmedNew = confirmInIsolation(newFailuresRaw);
  flaky = newFailuresRaw.filter((id) => !confirmedNew.has(id));
  newFailures = [...confirmedNew].sort();
  const stillFailing = confirmInIsolation(fixedRaw);
  fixed = fixedRaw.filter((id) => !stillFailing.has(id));
}

if (flaky.length > 0) {
  console.warn(`\n${flaky.length} échec(s) NON reproductible(s) en isolation (instables sous charge, non bloquants) :`);
  for (const id of flaky) console.warn(`  ~ ${id}`);
}

let ko = false;
if (newFailures.length > 0) {
  ko = true;
  console.error(`\nÉCHEC DE LA GARDE : ${newFailures.length} échec(s) NOUVEAU(x) confirmé(s) en isolation, absent(s) de la référence :`);
  for (const id of newFailures) console.error(`  - ${id}`);
}
if (fixed.length > 0) {
  ko = true;
  console.error(`\nÉCHEC DE LA GARDE : ${fixed.length} test(s) de la référence passent désormais. Retirez-les de scripts/test-guard/baseline.json (ou --update) :`);
  for (const id of fixed) console.error(`  - ${id}`);
}
if (ko) process.exit(1);

console.log(`Garde OK : aucun nouvel échec confirmé, ${known.size} échec(s) connu(s) toujours présents et tolérés.`);
