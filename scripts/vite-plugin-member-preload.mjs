/**
 * Lot P2b : préchargement sans exécution des fichiers membres.
 *
 * Remplace, dans le fichier d'entrée, les repères "__P2B_PRELOAD_APPLAYOUT__"
 * et "__P2B_PRELOAD_DASHBOARD__" par la liste des fichiers (fichier de la
 * page et ses imports statiques, transitivement). src/lib/bootSchedule.ts
 * les ajoute en <link rel="modulepreload"> quand un jeton de session existe :
 * le navigateur télécharge et compile en parallèle de la vérification de
 * session, sans évaluer le module (l'évaluation reste au rendu de la route,
 * aucune tâche longue ajoutée au démarrage).
 */
const ROOTS = {
  __P2B_PRELOAD_APPLAYOUT__: ["src/components/layout/AppLayout.tsx"],
  __P2B_PRELOAD_DASHBOARD__: ["src/pages/Dashboard.tsx"],
  // Lot perf 10 : la recherche d'un membre (page, puis vue gardien ou
  // propriétaire, importées dynamiquement par la page).
  __P2B_PRELOAD_SEARCH_SITTER__: ["src/pages/SearchPage.tsx", "src/components/search/SearchSitter.tsx"],
  __P2B_PRELOAD_SEARCH_OWNER__: ["src/pages/SearchPage.tsx", "src/components/search/SearchOwner.tsx"],
};

export function memberPreloadPlugin() {
  return {
    name: "p2b-member-preload",
    apply: "build",
    generateBundle(_opts, bundle) {
      const chunks = Object.values(bundle).filter((c) => c.type === "chunk");
      const entry = chunks.find((c) => c.isEntry);
      if (!entry) return;
      const byFile = new Map(chunks.map((c) => [c.fileName, c]));
      const entryFiles = new Set([entry.fileName, ...entry.imports]);
      for (const [marker, roots] of Object.entries(ROOTS)) {
        const seen = new Set();
        const walk = (f) => {
          if (seen.has(f) || entryFiles.has(f)) return;
          seen.add(f);
          for (const i of byFile.get(f)?.imports ?? []) walk(i);
        };
        for (const root of roots) {
          const start = chunks.find((c) => c.facadeModuleId && c.facadeModuleId.endsWith(root));
          if (!start) throw new Error(`[p2b-member-preload] racine introuvable : ${root}`);
          walk(start.fileName);
        }
        const list = JSON.stringify([...seen]);
        const needle = `"${marker}"`;
        if (!entry.code.includes(needle)) throw new Error(`[p2b-member-preload] repère absent : ${marker}`);
        entry.code = entry.code.split(needle).join(JSON.stringify(list));
      }
    },
  };
}
