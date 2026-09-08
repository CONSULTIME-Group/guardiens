import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
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

/**
 * Empreinte GLOBALE : fichiers qui finissent dans le HTML servi a toutes les
 * pages SANS appartenir au graphe de modules d'aucune page. Quand cette
 * empreinte bouge, les quatre familles sont marquees, quelles que soient
 * leurs empreintes propres.
 *
 * Pourquoi : index.html n'est pas un module. Une reecriture de <title>, de la
 * meta description, du bloc <noscript> ou du Schema.org de bootstrap laissait
 * les quatre empreintes de famille strictement identiques, donc rien n'etait
 * marque. On prend la source (siteRoutes.ts, d'ou sync-index-html.mjs derive
 * index.html) ET le resultat (index.html), ainsi que le script de derivation
 * lui-meme : un changement de gabarit dans le script modifie le HTML servi
 * sans toucher ni la source ni, avant build, le fichier de sortie.
 *
 * CSS VOLONTAIREMENT EXCLU (decision du 08/09/2026, documentee, pas laissee
 * au hasard) : le HTML servi par Prerender contient le texte, les liens, les
 * meta et le JSON-LD, plus une balise <link> vers la feuille de style hachee.
 * Il ne contient aucune declaration de style. Un changement de src/index.css
 * ou de tailwind.config.ts modifie l'apparence, jamais le contenu indexe.
 * Marquer 436 pages pour un ajustement de couleur couterait des renders sans
 * rien changer a ce que lit un robot. La derive du nom de fichier CSS dans un
 * HTML en cache est identique a celle, deja acceptee, du bundle JS pour toute
 * famille non marquee, et le filet temporel de 5 jours la borne. Si un jour
 * une regle CSS masque du contenu (display:none sur un bloc indexe), il
 * faudra rouvrir cette decision et ajouter "src/index.css" ci-dessous.
 */
const GLOBAL_SOURCES = [
  "index.html",
  "src/data/siteRoutes.ts",
  "scripts/sync-index-html.mjs",
];

/**
 * Fichiers hors graphe a ajouter a l'empreinte globale UNIQUEMENT s'ils ne
 * sont pas deja couverts par la fermeture d'imports d'une famille. Le greffon
 * verifie au build : couvert -> ignore ici, non couvert -> integre. Aucun
 * risque de double comptage ni d'oubli silencieux.
 */
const GLOBAL_SOURCES_IF_OUT_OF_GRAPH = [
  "src/i18n/locales/fr/common.json",
];

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
        detail[family] = { module_count: parts.length };
      }


      // Empreinte globale : contenu brut des fichiers hors graphe.
      const covered = new Set();
      for (const family of Object.keys(FAMILY_ROOTS)) {
        for (const id of closure(abs(FAMILY_ROOTS[family]))) covered.add(id);
      }
      const globalFiles = [...GLOBAL_SOURCES];
      const globalSkipped = [];
      for (const rel of GLOBAL_SOURCES_IF_OUT_OF_GRAPH) {
        if (covered.has(abs(rel))) globalSkipped.push(rel);
        else globalFiles.push(rel);
      }
      const globalParts = [];
      for (const rel of globalFiles.sort()) {
        let content;
        try {
          content = readFileSync(abs(rel), "utf8");
        } catch {
          this.error(
            `[route-hashes] fichier hors graphe introuvable : ${rel}. ` +
              `Mettre a jour GLOBAL_SOURCES dans scripts/vite-plugin-route-hashes.mjs.`,
          );
        }
        globalParts.push(`${rel}:${createHash("sha1").update(content).digest("hex")}`);
      }
      const globalHash = createHash("sha256")
        .update(globalParts.join("\n"))
        .digest("hex")
        .slice(0, 16);

      this.emitFile({
        type: "asset",
        fileName: outFile,
        source: JSON.stringify(
          {
            generated_at: new Date().toISOString(),
            global: globalHash,
            global_files: globalFiles,
            global_skipped_in_graph: globalSkipped,
            families,
            ...(debug ? { detail } : {}),
          },
          null,
          2,
        ),
      });
      if (debug) console.log("[route-hashes]", JSON.stringify(detail, null, 2).slice(0, 4000));
    },
  };
}
