/**
 * Logique pure du générateur de sitemap (SEO-3, 03/10/2026).
 * Aucune écriture disque ici : lue par scripts/generate-sitemap.mjs et par
 * les tests.
 *
 * Lecture paginée : chaque source est lue par tranches `range()` triées sur
 * une clé unique, avec contrôle d'erreur par page, du nombre total annoncé,
 * des répétitions et d'un plafond de pages. Ce n'est PAS une photographie
 * cohérente : une écriture concurrente qui change le total ou fait réapparaître
 * une clé est détectée, mais une insertion et une suppression entre deux pages
 * à total constant, sans doublon, peuvent passer inaperçues.
 */

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
  if (!Number.isInteger(pageSize) || pageSize <= 0) throw new Error(`${source}: taille de page invalide`);
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
      if (!Number.isSafeInteger(res.count) || res.count < 0) throw new Error(`${source}: total non fourni ou invalide`);
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

const DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})$/;
const TIMESTAMP = /^(\d{4}-\d{2}-\d{2})[T ](\d{2}):(\d{2})(?::(\d{2})(\.\d{1,6})?)?(Z|[+-]\d{2}(?::?\d{2})?)?$/;

function nowMs(now) {
  if (now instanceof Date) return now.getTime();
  if (typeof now === "string" && DATE_ONLY.test(now)) return Date.parse(`${now}T23:59:59.999Z`);
  return Date.now();
}

function validDay(day) {
  const d = new Date(`${day}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === day;
}

/**
 * Date de contenu normalisée en AAAA-MM-JJ (UTC), ou null (balise omise).
 * La valeur source ENTIÈRE doit être une date AAAA-MM-JJ ou un horodatage
 * ISO 8601 / PostgreSQL valable ; tout suffixe parasite est refusé. Une date
 * postérieure à `now` (instant de début du build) est refusée, à la
 * milliseconde près pour un horodatage.
 */
export function normalizeLastmod(value, now) {
  if (value == null) return null;
  const s = String(value).trim();
  const limit = nowMs(now);
  if (DATE_ONLY.test(s)) {
    if (!validDay(s)) return null;
    return Date.parse(`${s}T00:00:00Z`) > limit ? null : s;
  }
  const m = TIMESTAMP.exec(s);
  if (!m) return null;
  const [, day, hh, mi, ss = "00", frac = "", tzRaw] = m;
  if (!validDay(day) || +hh > 23 || +mi > 59 || +ss > 59) return null;
  let tz = tzRaw ?? "Z";
  if (tz !== "Z") {
    const t = tz.replace(":", "");
    tz = `${t.slice(0, 3)}:${t.length > 3 ? t.slice(3, 5) : "00"}`;
  }
  const ms = Date.parse(`${day}T${hh}:${mi}:${ss}${frac.slice(0, 4)}${tz}`);
  if (Number.isNaN(ms) || ms > limit) return null;
  return new Date(ms).toISOString().slice(0, 10);
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
 * Clé d'invalidation composite `date|nombre`. Si l'une des deux sondes échoue,
 * la clé est null (relecture complète) : une clé partielle ne prouve pas la
 * stabilité. Une source réellement vide donne `no-date|0`.
 */
export async function probeCompositeKey(client, table, column, filter = null) {
  const withFilter = (q) => (filter ? filter(q) : q);
  try {
    const [d, c] = await Promise.all([
      withFilter(client.from(table).select(column)).order(column, { ascending: false }).limit(1),
      withFilter(client.from(table).select("id", { count: "exact" })).limit(1),
    ]);
    if (!d || d.error || !Array.isArray(d.data)) return null;
    if (!c || c.error || !Number.isSafeInteger(c.count) || c.count < 0) return null;
    const date = d.data[0]?.[column] ?? null;
    return `${date ?? "no-date"}|${c.count}`;
  } catch {
    return null;
  }
}
