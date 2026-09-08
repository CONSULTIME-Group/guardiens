import { createHash } from "node:crypto";
import path from "node:path";

/**
 * Calcule une empreinte par famille de pages pre-rendues, a partir du graphe
 * de modules reel produit par Rollup. Aucune correspondance manuelle entre
 * chemins de fichiers et familles : seule la page racine de chaque route est
 * nommee, la fermeture transitive de ses imports est deduite du graphe, et
 * l'empreinte reprend les noms de fichiers haches emis par Vite, donc la
 * propagation de hash fait le travail.
 *
 * Si une racine nommee n'existe plus, le build echoue bruyamment : le
 * mecanisme ne peut pas cesser silencieusement de detecter les changements.
 */
const FAMILY_ROOTS = {
  cities: "src/pages/CityPage.tsx",
  departments: "src/pages/DepartmentPage.tsx",
  guides: "src/pages/CityGuidePage.tsx",
  articles: "src/pages/ArticleDetail.tsx",
};

export function routeHashesPlugin({ outFile = "route-hashes.json", debug = false } = {}) {
  return {
    name: "route-family-hashes",
    apply: "build",
    generateBundle(_options, bundle) {
      const root = process.cwd();
      const abs = (p) => path.resolve(root, p).replace(/\\/g, "/");

      // module id -> chunk fileName
      const moduleToChunk = new Map();
      for (const [fileName, out] of Object.entries(bundle)) {
        if (out.type !== "chunk") continue;
        for (const id of Object.keys(out.modules)) moduleToChunk.set(id, fileName);
      }

      const closure = (rootId) => {
        const seen = new Set();
        const stack = [rootId];
        while (stack.length) {
          const id = stack.pop();
          if (seen.has(id)) continue;
          seen.add(id);
          const info = this.getModuleInfo(id);
          if (!info) continue;
          for (const dep of [...info.importedIds, ...info.dynamicallyImportedIds]) {
            if (!seen.has(dep)) stack.push(dep);
          }
        }
        return seen;
      };

      const families = {};
      const detail = {};
      for (const [family, rel] of Object.entries(FAMILY_ROOTS)) {
        const rootId = abs(rel);
        if (!this.getModuleInfo(rootId)) {
          this.error(
            `[route-hashes] racine introuvable pour la famille "${family}" : ${rel}. ` +
              `Mettre a jour FAMILY_ROOTS dans scripts/vite-plugin-route-hashes.mjs.`,
          );
        }
        const chunks = new Set();
        for (const id of closure(rootId)) {
          const c = moduleToChunk.get(id);
          if (c) chunks.add(c);
        }
        const sorted = [...chunks].sort();
        families[family] = createHash("sha256").update(sorted.join("\n")).digest("hex").slice(0, 16);
        detail[family] = { chunk_count: sorted.length, chunks: sorted };
      }

      this.emitFile({
        type: "asset",
        fileName: outFile,
        source: JSON.stringify(
          { generated_at: new Date().toISOString(), families, ...(debug ? { detail } : {}) },
          null,
          2,
        ),
      });
      if (debug) console.log("[route-hashes]", JSON.stringify(detail, null, 2).slice(0, 4000));
    },
  };
}
