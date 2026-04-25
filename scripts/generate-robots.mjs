#!/usr/bin/env node
/**
 * Génère public/robots.txt à partir de la source de vérité unique :
 * src/data/siteRoutes.ts (`staticRoutes` + `privateDisallowPaths`).
 *
 * Règles appliquées :
 *   1. `Allow: /` global pour toutes les pages publiques indexables.
 *   2. `Disallow:` pour chaque chemin de `privateDisallowPaths` (espace privé).
 *   3. `Disallow:` pour chaque route de `staticRoutes` marquée `index: false`
 *      (ex. `/login`, `/recherche` — outils internes ou pages auth).
 *   4. Référence du sitemap (`Sitemap: …/sitemap.xml`).
 *
 * Mode CI :
 *   node scripts/generate-robots.mjs --check
 *     → exit 1 si public/robots.txt diffère de la sortie générée (sans écrire).
 *
 * Source de vérité unique → impossible d'avoir une page Disallow + dans le
 * sitemap, ou Allow + noindex dans son composant. Toute incohérence est
 * fatale : éditer siteRoutes.ts, pas robots.txt.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const ROUTES_FILE = path.join(ROOT, "src/data/siteRoutes.ts");
const OUT_FILE = path.join(ROOT, "public/robots.txt");
const CHECK = process.argv.includes("--check");

// ─── 1. Parse siteRoutes.ts (sans dépendance TS runtime) ──────────────
function parseSiteRoutes() {
  const src = fs.readFileSync(ROUTES_FILE, "utf-8");

  // SITE_URL
  const siteUrlMatch = src.match(/export\s+const\s+SITE_URL\s*=\s*["']([^"']+)["']/);
  if (!siteUrlMatch) throw new Error("SITE_URL introuvable dans siteRoutes.ts");
  const siteUrl = siteUrlMatch[1];

  // privateDisallowPaths : extraire le contenu du tableau
  const privateMatch = src.match(
    /export\s+const\s+privateDisallowPaths\s*:\s*string\[\]\s*=\s*\[([\s\S]*?)\];/,
  );
  if (!privateMatch) {
    throw new Error("privateDisallowPaths introuvable dans siteRoutes.ts");
  }
  const privatePaths = [...privateMatch[1].matchAll(/["']([^"']+)["']/g)].map(
    (m) => m[1],
  );
  if (privatePaths.length === 0) {
    throw new Error("privateDisallowPaths est vide");
  }

  // staticRoutes : on ne récupère que `path` et `index` pour décider Allow/Disallow
  const staticMatch = src.match(
    /export\s+const\s+staticRoutes\s*:\s*SiteRoute\[\]\s*=\s*\[([\s\S]*?)\n\];/,
  );
  if (!staticMatch) throw new Error("staticRoutes introuvable dans siteRoutes.ts");

  const noindexFromStatic = [];
  // Chaque entrée commence par "{ path:" — on découpe à plat
  const entryRe = /\{\s*path:\s*["']([^"']+)["']([\s\S]*?)\n\s{2}\}/g;
  let m;
  while ((m = entryRe.exec(staticMatch[1])) !== null) {
    const path_ = m[1];
    const body = m[2];
    const indexMatch = body.match(/index:\s*(true|false)/);
    if (indexMatch && indexMatch[1] === "false") {
      noindexFromStatic.push(path_);
    }
  }

  return { siteUrl, privatePaths, noindexFromStatic };
}

// ─── 2. Composer le robots.txt ────────────────────────────────────────
function buildRobotsTxt({ siteUrl, privatePaths, noindexFromStatic }) {
  // Détecter les doublons accidentels entre les deux sources
  const dupes = noindexFromStatic.filter((p) => privatePaths.includes(p));
  if (dupes.length > 0) {
    throw new Error(
      `Doublons détectés entre privateDisallowPaths et staticRoutes (index:false) : ${dupes.join(", ")}\n` +
        `Une page index:false ne doit pas figurer dans privateDisallowPaths (généré automatiquement).`,
    );
  }

  const lines = [
    "# AUTO-GÉNÉRÉ par scripts/generate-robots.mjs — NE PAS ÉDITER À LA MAIN.",
    "# Source de vérité : src/data/siteRoutes.ts (privateDisallowPaths + index:false).",
    "",
    "User-agent: *",
    "Allow: /",
    "",
    "# Pages privées (espace authentifié)",
    ...privatePaths.map((p) => `Disallow: ${p}`),
    "",
    "# Routes publiques marquées index:false dans staticRoutes",
    "# (outils internes / pages d'auth — cohérent avec <meta robots> + sitemap)",
    ...noindexFromStatic.map((p) => `Disallow: ${p}`),
    "",
    "# Profils publics : /gardiens/:id reste indexable.",
    "# Le sitemap filtre déjà les profils non-publics (politique : seuls sitter/both publics).",
    "",
    "# Crawl rate",
    "Crawl-delay: 1",
    "",
    `Sitemap: ${siteUrl}/sitemap.xml`,
    "",
  ];

  return lines.join("\n");
}

// ─── 3. Main ──────────────────────────────────────────────────────────
function main() {
  const data = parseSiteRoutes();
  const generated = buildRobotsTxt(data);

  if (CHECK) {
    const current = fs.existsSync(OUT_FILE)
      ? fs.readFileSync(OUT_FILE, "utf-8")
      : "";
    if (current !== generated) {
      console.error(
        "❌ public/robots.txt n'est PAS synchronisé avec siteRoutes.ts.",
      );
      console.error("   Exécutez : npm run generate-robots");
      process.exit(1);
    }
    console.log("✓ public/robots.txt synchronisé.");
    return;
  }

  fs.writeFileSync(OUT_FILE, generated, "utf-8");
  console.log(`✓ robots.txt généré : ${OUT_FILE}`);
  console.log(
    `  ${data.privatePaths.length} chemins privés + ${data.noindexFromStatic.length} routes publiques noindex.`,
  );
}

try {
  main();
} catch (err) {
  console.error(`❌ Génération robots.txt échouée : ${err.message}`);
  process.exit(2);
}
