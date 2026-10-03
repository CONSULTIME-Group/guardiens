/**
 * Logique pure du generateur robots.txt (lue par scripts/generate-robots.mjs
 * et par les tests). Aucune ecriture disque ici.
 *
 * robots.txt controle seulement l'exploration. Il n'empeche pas l'indexation
 * d'une URL connue par ailleurs et ne protege aucune page : l'acces aux espaces
 * prives reste garanti par l'authentification.
 */
import ts from "typescript";

/**
 * Lit SITE_URL et privateDisallowPaths dans le source de siteRoutes.ts par
 * l'arbre syntaxique TypeScript (insensible a l'indentation, aux commentaires
 * et aux retours a la ligne). staticRoutes n'est volontairement pas lu : une
 * route `index: false` doit rester explorable pour que son noindex soit lu.
 */
export function readRobotsConfig(source) {
  const sf = ts.createSourceFile("siteRoutes.ts", source, ts.ScriptTarget.Latest, true);
  let siteUrl = null;
  let privatePaths = null;
  let sitemapUrl = null;
  for (const stmt of sf.statements) {
    if (!ts.isVariableStatement(stmt)) continue;
    for (const decl of stmt.declarationList.declarations) {
      if (!ts.isIdentifier(decl.name) || !decl.initializer) continue;
      const name = decl.name.text;
      let init = decl.initializer;
      while (ts.isAsExpression(init) || ts.isSatisfiesExpression?.(init) || ts.isParenthesizedExpression(init)) {
        init = init.expression;
      }
      if (name === "SITE_URL") {
        if (!ts.isStringLiteralLike(init)) throw new Error("SITE_URL doit etre une chaine litterale");
        siteUrl = init.text;
      }
      if (name === "SITEMAP_URL") {
        if (!ts.isStringLiteralLike(init)) throw new Error("SITEMAP_URL doit etre une chaine litterale");
        sitemapUrl = init.text;
        if (!sitemapUrl.startsWith("https://")) throw new Error("SITEMAP_URL doit utiliser HTTPS");
      }
      if (name === "privateDisallowPaths") {
        if (!ts.isArrayLiteralExpression(init)) throw new Error("privateDisallowPaths doit etre un tableau litteral");
        privatePaths = init.elements.map((el) => {
          if (!ts.isStringLiteralLike(el)) throw new Error("privateDisallowPaths ne doit contenir que des chaines litterales");
          return el.text;
        });
      }
    }
  }
  if (!siteUrl) throw new Error("SITE_URL introuvable dans siteRoutes.ts");
  if (!privatePaths) throw new Error("privateDisallowPaths introuvable dans siteRoutes.ts");
  if (privatePaths.length === 0) throw new Error("privateDisallowPaths est vide");
  for (const p of privatePaths) {
    if (!p.startsWith("/")) throw new Error(`Chemin prive invalide : ${p}`);
  }
  return { siteUrl, privatePaths, ...(sitemapUrl ? { sitemapUrl } : {}) };
}

// Surfaces publiques non indexables : jamais en Disallow, sinon leur noindex
// ne serait plus lu. Garde-fou si quelqu'un les ajoutait aux chemins prives.
export const CRAWLABLE_NOINDEX = ["/search", "/recherche", "/recherche-gardiens", "/login", "/inscription", "/gardiens"];

// Politique AI/GEO juillet 2026, inchangee : moteurs, IA et outils SEO
// autorises, deux scrapers bloques.
export const SEARCH_BOTS = ["Googlebot", "Googlebot-Image", "Googlebot-Video", "Bingbot", "DuckDuckBot", "Yandex"];
export const AI_BOTS_ALLOWED = [
  "GPTBot", "OAI-SearchBot", "ChatGPT-User", "ClaudeBot", "Claude-User", "Claude-SearchBot",
  "PerplexityBot", "Perplexity-User", "MistralAI-User", "Google-Extended", "Applebot",
  "Applebot-Extended", "Amazonbot", "CCBot", "Meta-ExternalAgent", "FacebookBot",
];
export const SEO_TOOLS = ["DataForSeoBot", "AhrefsBot", "SemrushBot"];
export const SCRAPERS_BLOCKED = ["ByteSpider", "cohere-ai"];
export const TRACKING_DISALLOW = ["/*?*utm_", "/*?*sessionid="];

export function buildRobotsTxt({ siteUrl, privatePaths, sitemapUrl }) {
  const blocked = privatePaths.filter((p) =>
    CRAWLABLE_NOINDEX.some((c) => p === c || p === `${c}/`),
  );
  if (blocked.length > 0) {
    throw new Error(`Chemins publics noindex interdits en Disallow : ${blocked.join(", ")}`);
  }
  const allowed = [...SEARCH_BOTS, ...AI_BOTS_ALLOWED, ...SEO_TOOLS];
  return [
    "# AUTO-GENERE par scripts/generate-robots.mjs, NE PAS EDITER A LA MAIN.",
    "# Source : src/data/siteRoutes.ts (privateDisallowPaths).",
    "# robots.txt regle l'exploration seulement : il n'empeche pas l'indexation",
    "# et ne protege aucune page (l'authentification s'en charge).",
    "#",
    "# Un robot applique le seul groupe le plus specifique qui le nomme, les",
    "# groupes ne fusionnent pas. Tous les robots autorises partagent donc un",
    "# groupe unique avec * : memes regles pour tous.",
    "",
    "# Scrapers sans valeur SEO/GEO",
    ...SCRAPERS_BLOCKED.map((ua) => `User-agent: ${ua}`),
    "Disallow: /",
    "",
    "# Moteurs, IA (politique AI/GEO juillet 2026) et outils SEO, plus tous les autres",
    ...allowed.map((ua) => `User-agent: ${ua}`),
    "User-agent: *",
    "Allow: /",
    ...TRACKING_DISALLOW.map((p) => `Disallow: ${p}`),
    "# Espace authentifie et endpoints systeme",
    ...privatePaths.map((p) => `Disallow: ${p}`),
    "",
    "# Pages publiques noindex (/login, /inscription, /search, /recherche,",
    "# /recherche-gardiens, fiches /gardiens/:id non eligibles) : volontairement",
    "# explorables, sinon leur balise noindex ne serait jamais lue.",
    "",
    `Sitemap: ${sitemapUrl || `${siteUrl}/sitemap.xml`}`,
    "",
  ].join("\n");
}

/**
 * Interpretation de reference (RFC 9309 et doc Google) : groupe dont la ligne
 * User-agent est la plus specifique pour le produit, sinon *, regle la plus
 * longue gagnante, Allow l'emporte a egalite. Sert uniquement aux tests.
 */
export function parseRobots(txt) {
  const groups = [];
  let cur = null;
  let lastWasUa = false;
  for (const raw of txt.split("\n")) {
    const line = raw.replace(/#.*$/, "").trim();
    if (!line) continue;
    const i = line.indexOf(":");
    if (i < 0) continue;
    const key = line.slice(0, i).trim().toLowerCase();
    const val = line.slice(i + 1).trim();
    if (key === "user-agent") {
      if (!lastWasUa) { cur = { agents: [], rules: [] }; groups.push(cur); }
      cur.agents.push(val.toLowerCase());
      lastWasUa = true;
    } else if (key === "allow" || key === "disallow") {
      lastWasUa = false;
      if (cur && val) cur.rules.push({ allow: key === "allow", path: val });
    } else {
      lastWasUa = false;
    }
  }
  return groups;
}

export function selectGroupRules(groups, userAgentToken) {
  const ua = userAgentToken.toLowerCase();
  let best = null;
  for (const g of groups) {
    for (const a of g.agents) {
      if (a !== "*" && ua.startsWith(a) && (!best || a.length > best.len)) best = { len: a.length, a };
    }
  }
  const target = best ? best.a : "*";
  return groups.filter((g) => g.agents.includes(target)).flatMap((g) => g.rules);
}

function ruleMatches(pattern, path) {
  const anchored = pattern.endsWith("$");
  const body = anchored ? pattern.slice(0, -1) : pattern;
  const re = new RegExp("^" + body.split("*").map((s) => s.replace(/[.+?^${}()|[\]\\]/g, "\\$&")).join(".*") + (anchored ? "$" : ""));
  return re.test(path);
}

export function isAllowed(txt, userAgentToken, pathWithQuery) {
  const rules = selectGroupRules(parseRobots(txt), userAgentToken);
  let best = null;
  for (const r of rules) {
    if (!ruleMatches(r.path, pathWithQuery)) continue;
    if (!best || r.path.length > best.path.length || (r.path.length === best.path.length && r.allow)) best = r;
  }
  return best ? best.allow : true;
}
