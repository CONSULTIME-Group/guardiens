#!/usr/bin/env node
/**
 * Lot perf 6 (15/10/2026) : poids du code par parcours, public et connecté.
 *
 * Construit le site (vite build, sans écrire dist) et compte, pour chaque
 * parcours, les fichiers JavaScript et CSS chargés avant l'affichage : entrée
 * et ses imports statiques, puis fichiers de la page et leurs imports
 * statiques (les imports dynamiques connus du parcours sont listés à part
 * dans ROUTES). Tailles compressées gzip (niveau 6), proches de ce que sert
 * Cloudflare en brotli à quelques pour cent près.
 *
 * Usage : node scripts/perf/bundle-report.mjs [--json out.json] [--top 15]
 */
import { build } from "vite";
import { gzipSync } from "node:zlib";
import { writeFileSync } from "node:fs";

const args = process.argv.slice(2);
const opt = (n, d) => { const i = args.indexOf(n); return i === -1 ? d : args[i + 1]; };
const jsonOut = opt("--json", null);
const TOP = Number(opt("--top", "15"));

export const ROUTES = {
  "/ (accueil, visiteur)": ["src/pages/Landing.tsx"],
  "/annonces (visiteur)": ["src/pages/PublicListings.tsx", "src/components/search/SearchSitter.tsx"],
  "/annonces/:slug (fiche, visiteur)": ["src/pages/PublicSitDetail.tsx"],
  "/dashboard (membre)": ["src/components/layout/AppLayout.tsx", "src/pages/Dashboard.tsx"],
  "/search (membre)": ["src/pages/SearchPage.tsx", "src/components/search/SearchSitter.tsx"],
  "/messages (membre)": ["src/components/layout/AppLayout.tsx", "src/pages/Messages.tsx"],
  "/sits/:id (membre, gardien)": ["src/components/layout/AppLayout.tsx", "src/pages/SitDetail.tsx", "src/components/sits/views/SitterSitView.tsx"],
  "/sits/:id (membre, propriétaire)": ["src/components/layout/AppLayout.tsx", "src/pages/SitDetail.tsx", "src/components/sits/views/OwnerSitView.tsx"],
};

let bundle = null;
await build({
  logLevel: "error",
  build: { write: false },
  plugins: [{ name: "perf6-capture", generateBundle(_o, b) { bundle = b; } }],
});

const chunks = Object.values(bundle).filter((c) => c.type === "chunk");
const assets = Object.values(bundle).filter((c) => c.type === "asset");
const byFile = new Map(chunks.map((c) => [c.fileName, c]));
const gz = new Map();
const size = (f) => {
  if (!gz.has(f)) {
    const c = byFile.get(f) ?? assets.find((a) => a.fileName === f);
    gz.set(f, c ? gzipSync(typeof c.code === "string" ? c.code : c.source, { level: 6 }).length : 0);
  }
  return gz.get(f);
};
const entry = chunks.find((c) => c.isEntry);
const closure = (start, seen = new Set()) => {
  const walk = (f) => { if (seen.has(f)) return; seen.add(f); for (const i of byFile.get(f)?.imports ?? []) walk(i); };
  walk(start);
  return seen;
};
const entrySet = closure(entry.fileName);
const cssOf = (files) => {
  const css = new Set();
  for (const f of files) for (const c of byFile.get(f)?.viteMetadata?.importedCss ?? []) css.add(c);
  return css;
};

const report = { entry: { files: entrySet.size, js_gz: [...entrySet].reduce((s, f) => s + size(f), 0) }, routes: {} };
for (const [name, roots] of Object.entries(ROUTES)) {
  const files = new Set(entrySet);
  for (const r of roots) {
    const c = chunks.find((x) => x.facadeModuleId && x.facadeModuleId.endsWith(r))
      ?? chunks.find((x) => x.isDynamicEntry && Object.keys(x.modules).some((m) => m.endsWith(r)));
    if (!c) { console.error(`racine introuvable : ${r}`); continue; }
    closure(c.fileName, files);
  }
  const css = cssOf(files);
  const js = [...files].reduce((s, f) => s + size(f), 0);
  const cssGz = [...css].reduce((s, f) => s + size(f), 0);
  // Modules les plus lourds (taille rendue, avant compression) sur ce parcours.
  const mods = [];
  for (const f of files) for (const [id, m] of Object.entries(byFile.get(f)?.modules ?? {})) mods.push([id.replace(/^.*node_modules\//, "nm:").replace(process.cwd() + "/", ""), m.renderedLength, f]);
  mods.sort((a, b) => b[1] - a[1]);
  const chunkList = [...files].map((f) => [f, size(f)]).sort((a, b) => b[1] - a[1]);
  report.routes[name] = { files: files.size, js_gz: js, css_gz: cssGz, total_gz: js + cssGz, chunks: chunkList.slice(0, TOP), modules: mods.slice(0, TOP).map(([id, len, f]) => [id, len, f]) };
}

const kb = (n) => `${(n / 1024).toFixed(0)} Ko`;
console.log(`Entrée : ${report.entry.files} fichiers, ${kb(report.entry.js_gz)} compressés`);
for (const [name, r] of Object.entries(report.routes)) {
  console.log(`\n${name} : ${kb(r.total_gz)} (JS ${kb(r.js_gz)}, CSS ${kb(r.css_gz)}, ${r.files} fichiers)`);
  for (const [f, s] of r.chunks.slice(0, 8)) console.log(`  ${kb(s).padStart(7)}  ${f}`);
}
if (jsonOut) writeFileSync(jsonOut, JSON.stringify(report, null, 2));
