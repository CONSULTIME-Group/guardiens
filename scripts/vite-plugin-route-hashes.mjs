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
  guides: "src/pages/GuideDetail.tsx",
  articles: "src/pages/ArticleDetail.tsx",
};

export function routeHashesPlugin({ outFile = "route-hashes.json", debug = false } = {}) {
  return {
    name: "route-family-hashes",
    apply: "build",
    generateBundle(_options, bundle) {
      const root = process.cwd();
      const abs = (p) => path.resolve(root, p).replace(/\\/g, "/");

      // module id -> code reellement emis pour ce module
      const moduleCode = new Map();
      for (const out of Object.values(bundle)) {
        if (out.type !== "chunk") continue;
        for (const [id, mod] of Object.entries(out.modules)) {
          moduleCode.set(id, mod.code ?? "");
        }
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
        const parts = [];
        for (const id of [...closure(rootId)].sort()) {
          const code = moduleCode.get(id);
          if (code === undefined) continue; // module elimine par tree-shaking
          const rel2 = id.startsWith(root) ? id.slice(root.length + 1) : id;
          parts.push(`${rel2}:${createHash("sha1").update(code).digest("hex")}`);
        }
        families[family] = createHash("sha256").update(parts.join("\n")).digest("hex").slice(0, 16);
        detail[family] = { module_count: parts.length, modules: parts.map((x) => x.split(":")[0]) };
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
