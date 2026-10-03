/**
 * Logique pure du générateur de sitemap (SEO-3, 03/10/2026).
 * Aucune écriture disque ici : lue par scripts/generate-sitemap.mjs et par
 * les tests.
 *
 * Lecture paginée : chaque source est lue par tranches `range()` triées sur
 * une clé unique, avec contrôle d'erreur par page, du nombre total annoncé,
 * des répétitions et d'un plafond de pages. La pagination n'est PAS une
 * photographie transactionnelle : une écriture concurrente entre deux pages
 * fait échouer le contrôle du total ou des clés, elle n'est jamais masquée.
 */
import ts from "typescript";

export const PAGE_SIZE = 1000;

/**
 * Lit toutes les lignes d'une source publique.
 * @param {object} p
 * @param {string} p.source nom journalisé (jamais de données membre)
 * @param {(from:number,to:number,withCount:boolean)=>Promise<{data:any,error:any,count?:number|null}>} p.page
 *   lit une page déjà filtrée et triée sur `key`
 * @param {string} p.key clé unique de tri
 */
export async function fetchAllPages({ source, page, key, pageSize = PAGE_SIZE }) {
  const rows = [];
  const seen = new Set();
  let expected = null;
  let maxPages = Infinity;
  for (let i = 0; ; i++) {
    if (i >= maxPages) throw new Error(`${source}: plafond de pages dépassé (${i}), lecture interrompue`);
    const from = i * pageSize;
    const res = await page(from, from + pageSize - 1, i === 0);
    if (!res || res.error) {
      throw new Error(`${source}: erreur de lecture page ${i + 1} (${res?.error?.message ?? "réponse vide"})`);
    }
    if (!Array.isArray(res.data)) throw new Error(`${source}: page ${i + 1} sans tableau`);
    if (i === 0) {
      if (typeof res.count !== "number") throw new Error(`${source}: total non fourni`);
      expected = res.count;
      maxPages = Math.ceil(expected / pageSize) + 1;
    }
    if (res.data.length > pageSize) throw new Error(`${source}: page ${i + 1} plus longue que la taille demandée`);
    for (const r of res.data) {
      const k = r?.[key];
      if (k == null) throw new Error(`${source}: clé ${key} absente`);
      if (seen.has(k)) throw new Error(`${source}: ligne répétée entre pages, lecture instable`);
      seen.add(k);
      rows.push(r);
    }
    if (res.data.length < pageSize) break;
  }
  if (rows.length !== expected) {
    throw new Error(`${source}: ${rows.length} lignes lues pour ${expected} annoncées`);
  }
  return rows;
}

/** Fabrique `page` pour un client supabase-js : `build(q)` applique les filtres. */
export function supabasePage(client, table, columns, key, build = (q) => q) {
  return (from, to, withCount) => {
    let q = client.from(table).select(columns, withCount ? { count: "exact" } : undefined);
    q = build(q);
    return q.order(key, { ascending: true }).range(from, to);
  };
}

/** Date AAAA-MM-JJ valide, non future, sinon null (balise omise). */
export function normalizeLastmod(value, todayIso) {
  if (value == null || value === "") return null;
  const s = String(value);
  const day = s.slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return null;
  const d = new Date(`${day}T00:00:00Z`);
  if (Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== day) return null;
  if (todayIso && day > todayIso) return null;
  return day;
}

/**
 * Déduplique par `loc` : garde la première entrée (priorité, fréquence), et
 * reprend la date fiable la plus récente portée par un doublon.
 */
export function dedupeEntries(entries) {
  const byLoc = new Map();
  let dupes = 0;
  for (const e of entries) {
    const prev = byLoc.get(e.loc);
    if (!prev) { byLoc.set(e.loc, { ...e }); continue; }
    dupes++;
    if (e.lastmod && (!prev.lastmod || e.lastmod > prev.lastmod)) prev.lastmod = e.lastmod;
  }
  return { entries: [...byLoc.values()], dupes };
}

function escapeXml(s) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
}

export function renderSitemapXml(siteUrl, entries) {
  const body = entries.map((e) => [
    "  <url>",
    `    <loc>${escapeXml(siteUrl + e.loc)}</loc>`,
    e.lastmod ? `    <lastmod>${e.lastmod}</lastmod>` : null,
    `    <changefreq>${e.changefreq}</changefreq>`,
    `    <priority>${e.priority}</priority>`,
    "  </url>",
  ].filter(Boolean).join("\n")).join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${body}
</urlset>`;
}

/** Contrôle structurel avant écriture. Renvoie la liste des <loc>. */
export function validateSitemapXml(xml, siteUrl, todayIso) {
  if (!xml.startsWith('<?xml') || !xml.includes("<urlset") || !xml.trimEnd().endsWith("</urlset>")) {
    throw new Error("sitemap: XML incomplet");
  }
  const opens = (xml.match(/<url>/g) || []).length;
  const closes = (xml.match(/<\/url>/g) || []).length;
  if (opens !== closes) throw new Error("sitemap: balises <url> déséquilibrées");
  const locs = [...xml.matchAll(/<loc>([^<]*)<\/loc>/g)].map((m) => m[1]);
  if (locs.length !== opens) throw new Error("sitemap: <url> sans <loc>");
  if (new Set(locs).size !== locs.length) throw new Error("sitemap: <loc> en double");
  for (const l of locs) {
    if (!l.startsWith(`${siteUrl}/`) && l !== siteUrl) throw new Error(`sitemap: domaine inattendu (${l})`);
  }
  for (const m of xml.matchAll(/<lastmod>([^<]*)<\/lastmod>/g)) {
    if (normalizeLastmod(m[1], todayIso) !== m[1]) throw new Error(`sitemap: lastmod invalide (${m[1]})`);
  }
  return locs;
}

/**
 * Lit SITE_URL et staticRoutes de siteRoutes.ts par l'arbre syntaxique
 * TypeScript (insensible à l'indentation et aux commentaires).
 */
export function readStaticRoutes(source) {
  const sf = ts.createSourceFile("siteRoutes.ts", source, ts.ScriptTarget.Latest, true);
  let siteUrl = null;
  let routes = null;
  const unwrap = (n) => {
    while (ts.isAsExpression(n) || ts.isParenthesizedExpression(n) || (ts.isSatisfiesExpression && ts.isSatisfiesExpression(n))) n = n.expression;
    return n;
  };
  for (const stmt of sf.statements) {
    if (!ts.isVariableStatement(stmt)) continue;
    for (const decl of stmt.declarationList.declarations) {
      if (!ts.isIdentifier(decl.name) || !decl.initializer) continue;
      const init = unwrap(decl.initializer);
      if (decl.name.text === "SITE_URL" && ts.isStringLiteralLike(init)) siteUrl = init.text;
      if (decl.name.text === "staticRoutes") {
        if (!ts.isArrayLiteralExpression(init)) throw new Error("staticRoutes doit être un tableau littéral");
        routes = init.elements.map((el) => {
          if (!ts.isObjectLiteralExpression(el)) throw new Error("staticRoutes : entrée non littérale");
          const o = {};
          for (const p of el.properties) {
            if (!ts.isPropertyAssignment(p) || !p.name) continue;
            const name = p.name.getText(sf).replace(/["']/g, "");
            const v = unwrap(p.initializer);
            if (ts.isStringLiteralLike(v)) o[name] = v.text;
            else if (v.kind === ts.SyntaxKind.TrueKeyword) o[name] = true;
            else if (v.kind === ts.SyntaxKind.FalseKeyword) o[name] = false;
          }
          return o;
        });
      }
    }
  }
  if (!siteUrl) throw new Error("SITE_URL introuvable dans siteRoutes.ts");
  if (!routes || routes.length === 0) throw new Error("Aucune route extraite de staticRoutes");
  return {
    siteUrl,
    routes: routes
      .filter((r) => r.path && r.sitemapPriority && r.changeFreq)
      .map((r) => ({ loc: r.path, priority: r.sitemapPriority, changefreq: r.changeFreq, indexable: r.index !== false })),
  };
}
