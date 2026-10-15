/**
 * Lot perf 8 (15/10/2026) : le dictionnaire voyage avec le code qui s'en sert.
 *
 * Avant : chaque page chargée à la demande attendait le dictionnaire complet
 * (common.json, 30 Ko compressés) avant son premier rendu, quelle que soit la
 * page (lot P5, dictionaryGate).
 *
 * Désormais, chaque fichier de src/ qui cite une clé « espace.clé » (dans un
 * texte entre guillemets, apostrophes ou accents graves, préfixe d'une clé
 * construite compris : `landing.faq.q${n}`) reçoit en tête un import de
 * l'espace correspondant, `virtual:i18n-ns/<espace>`, qui l'enregistre dans
 * le moteur avant l'exécution du fichier. Rollup range ces textes avec les
 * pages qui les citent : la page d'accueil porte ses textes, /annonces les
 * siens, et aucune page n'attend plus un fichier commun.
 *
 * Les espaces a11y, article, footer et nav restent dans l'entrée
 * (src/i18n/index.ts). Une clé lue sans que son espace soit chargé (clé
 * venue du serveur, construite sans préfixe écrit) déclenche le chargement du
 * dictionnaire complet puis un nouveau rendu, et laisse une trace dans le
 * journal d'erreurs (i18n_namespace_fallback) : ce filet ne doit jamais servir.
 */
import { readFileSync } from "node:fs";
import path from "node:path";

export const BASE_NAMESPACES = ["a11y", "article", "footer", "nav"];
const VIRTUAL_PREFIX = "virtual:i18n-ns/";
const RESOLVED_PREFIX = "\0i18n-ns:";

export function readDictionary(root = process.cwd()) {
  return JSON.parse(readFileSync(path.join(root, "src/i18n/locales/fr/common.json"), "utf8"));
}

/** Espaces cités par un fichier source (hors espaces de l'entrée). */
export function namespacesIn(code, namespaces) {
  const lazy = namespaces.filter((n) => !BASE_NAMESPACES.includes(n));
  if (!lazy.length) return [];
  const re = new RegExp(`["'\`](${lazy.join("|")})\\.[A-Za-z0-9_$]`, "g");
  const found = new Set();
  for (const m of code.matchAll(re)) found.add(m[1]);
  return [...found].sort();
}

/** Fichiers à analyser : sources de l'application, hors moteur de traduction et tests. */
export function isScannedModule(id, root = process.cwd()) {
  if (id.startsWith("\0") || id.includes("/node_modules/")) return false;
  const file = id.split("?")[0];
  if (!/\.(t|j)sx?$/.test(file)) return false;
  const rel = path.relative(root, file).split(path.sep).join("/");
  if (!rel.startsWith("src/")) return false;
  if (rel.startsWith("src/i18n/") || rel.startsWith("src/__tests__/") || rel.startsWith("src/test/")) return false;
  if (/\.(test|spec)\.(t|j)sx?$/.test(rel)) return false;
  return true;
}

export function i18nNamespacesPlugin() {
  let dict = null;
  let root = process.cwd();
  return {
    name: "perf8-i18n-namespaces",
    enforce: "pre",
    config() {
      const d = readDictionary();
      return {
        define: {
          __I18N_LAZY_NAMESPACES__: JSON.stringify(Object.keys(d).filter((n) => !BASE_NAMESPACES.includes(n))),
        },
      };
    },
    configResolved(c) {
      root = c.root;
    },
    buildStart() {
      dict = readDictionary(root);
      this.addWatchFile(path.join(root, "src/i18n/locales/fr/common.json"));
    },
    resolveId(id) {
      if (id.startsWith(VIRTUAL_PREFIX)) return RESOLVED_PREFIX + id.slice(VIRTUAL_PREFIX.length);
      return null;
    },
    load(id) {
      if (!id.startsWith(RESOLVED_PREFIX)) return null;
      const ns = id.slice(RESOLVED_PREFIX.length);
      dict ??= readDictionary(root);
      if (!(ns in dict)) this.error(`[perf8-i18n] espace inconnu : ${ns}`);
      const engine = path.join(root, "src/i18n/index.ts").split(path.sep).join("/");
      // JSON.parse d'une chaîne : plus rapide à analyser qu'un objet littéral.
      const payload = JSON.stringify(JSON.stringify({ [ns]: dict[ns] }));
      return `import i18n from ${JSON.stringify(engine)};\ni18n.addResourceBundle("fr", "common", JSON.parse(${payload}), true, true);\n`;
    },
    transform(code, id) {
      if (!isScannedModule(id, root)) return null;
      dict ??= readDictionary(root);
      const used = namespacesIn(code, Object.keys(dict));
      if (!used.length) return null;
      // Imports placés sur la première ligne, sans saut de ligne : les numéros
      // de ligne du fichier restent justes (seules les colonnes de la ligne 1
      // se décalent), d'où map: null comme le permet Rollup.
      const header = used.map((n) => `import "${VIRTUAL_PREFIX}${n}";`).join("");
      return { code: header + code, map: null };
    },
  };
}
