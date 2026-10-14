/**
 * Lot perf 2 (14/10/2026) : préchargement des fichiers de la page d'arrivée
 * publique dès la lecture du HTML.
 *
 * Mesure du 14/10/2026 sur mobile ralenti : sur /annonces, le fichier de la
 * page (PublicListings) n'était demandé qu'après l'exécution de l'entrée
 * (5,3 s), puis la recherche (SearchSitter et ses 35 fichiers) après celle de
 * la page (6,5 s) : deux attentes en série avant la moindre lecture.
 *
 * Un petit script en ligne, placé avant le script d'entrée, ajoute en
 * <link rel="modulepreload"> les fichiers de la page quand l'adresse lui
 * correspond : le navigateur les télécharge en même temps que l'entrée, sans
 * les exécuter (l'exécution reste au rendu de la route). Priorité basse :
 * sur un réseau lent, l'entrée passe d'abord, les fichiers de la page
 * occupent le réseau pendant son exécution. Rien n'est ajouté
 * sur les autres adresses (verrou src/__tests__/p2/ : au plus 14
 * préchargements sur /).
 */
// Dictionnaire complet : toute route chargée à la demande l'attend avant son
// rendu (dictionaryGate, lot P2), il partait seulement après l'entrée.
const DICTIONARY = "src/i18n/locales/fr/common.json?raw";
export const ROUTE_PRELOADS = [
  {
    // /annonces seulement (pas une fiche, pas /annonces/international).
    pattern: "^/annonces/?$",
    roots: [DICTIONARY, "src/pages/PublicListings.tsx", "src/components/search/SearchSitter.tsx"],
  },
  {
    // Fiche publique d'une annonce (lien partagé, résultat de recherche).
    pattern: "^/annonces/(?!international/?$|demo/)[^/]+/?$",
    roots: [DICTIONARY, "src/pages/PublicSitDetail.tsx"],
  },
];

export const ROUTE_PRELOAD_MARKER = "data-route-preload";

export function collectRouteFiles(chunks, roots) {
  const entry = chunks.find((c) => c.isEntry);
  if (!entry) return [];
  const byFile = new Map(chunks.map((c) => [c.fileName, c]));
  const entryFiles = new Set([entry.fileName, ...entry.imports]);
  const seen = new Set();
  const walk = (f) => {
    if (seen.has(f) || entryFiles.has(f)) return;
    seen.add(f);
    for (const i of byFile.get(f)?.imports ?? []) walk(i);
  };
  for (const root of roots) {
    const start = chunks.find((c) => c.facadeModuleId && c.facadeModuleId.endsWith(root));
    if (!start) throw new Error(`[perf2-route-preload] racine introuvable : ${root}`);
    walk(start.fileName);
  }
  return [...seen];
}

export function routePreloadScript(routes) {
  // Guillemets simples : le verrou P2 compte les rel="modulepreload" écrits dans le HTML.
  return `<script ${ROUTE_PRELOAD_MARKER}>(function(){try{var p=location.pathname,r=${JSON.stringify(routes)};for(var i=0;i<r.length;i++){if(!new RegExp(r[i][0]).test(p))continue;for(var j=0;j<r[i][1].length;j++){var l=document.createElement('link');l.rel='modulepreload';l.crossOrigin='';l.fetchPriority='low';l.href='/'+r[i][1][j];document.head.appendChild(l);}}}catch(e){}})();</script>`;
}

export function routePreloadPlugin() {
  return {
    name: "perf2-route-preload",
    apply: "build",
    transformIndexHtml: {
      order: "post",
      handler(html, ctx) {
        if (!ctx.bundle) return html;
        const chunks = Object.values(ctx.bundle).filter((c) => c.type === "chunk");
        const routes = ROUTE_PRELOADS.map((r) => [r.pattern, collectRouteFiles(chunks, r.roots)]);
        const script = routePreloadScript(routes);
        const at = html.indexOf('<script type="module"');
        if (at === -1) throw new Error("[perf2-route-preload] script d'entrée introuvable");
        return html.slice(0, at) + script + "\n    " + html.slice(at);
      },
    },
  };
}
