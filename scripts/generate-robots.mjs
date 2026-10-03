#!/usr/bin/env node
/**
 * Genere public/robots.txt depuis src/data/siteRoutes.ts (SITE_URL et
 * privateDisallowPaths), lus par l'arbre syntaxique TypeScript.
 * Logique pure dans scripts/robots-lib.mjs.
 *
 * robots.txt controle l'exploration seulement. Les routes `index: false`
 * restent explorables pour que leur noindex soit lu.
 *
 * Mode CI :
 *   node scripts/generate-robots.mjs --check
 *     -> exit 1 si public/robots.txt differe de la sortie generee (sans ecrire).
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { readRobotsConfig, buildRobotsTxt } from "./robots-lib.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const ROUTES_FILE = path.join(ROOT, "src/data/siteRoutes.ts");
const OUT_FILE = path.join(ROOT, "public/robots.txt");
const CHECK = process.argv.includes("--check");

function main() {
  const config = readRobotsConfig(fs.readFileSync(ROUTES_FILE, "utf-8"));
  const generated = buildRobotsTxt(config);

  if (CHECK) {
    const current = fs.existsSync(OUT_FILE) ? fs.readFileSync(OUT_FILE, "utf-8") : "";
    if (current !== generated) {
      console.error("public/robots.txt n'est PAS synchronise avec siteRoutes.ts.");
      console.error("Executez : npm run generate-robots");
      process.exit(1);
    }
    console.log("public/robots.txt synchronise.");
    return;
  }

  fs.writeFileSync(OUT_FILE, generated, "utf-8");
  console.log(`robots.txt genere : ${OUT_FILE} (${config.privatePaths.length} chemins prives).`);
}

try {
  main();
} catch (err) {
  console.error(`Generation robots.txt echouee : ${err.message}`);
  process.exit(2);
}
