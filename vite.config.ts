import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
// @ts-expect-error greffon JS sans types
import { routeHashesPlugin } from "./scripts/vite-plugin-route-hashes.mjs";
// @ts-expect-error greffon JS sans types
import { memberPreloadPlugin } from "./scripts/vite-plugin-member-preload.mjs";
// @ts-expect-error greffon JS sans types
import { entryBudgetPlugin } from "./scripts/vite-plugin-entry-budget.mjs";
// @ts-expect-error greffon JS sans types
import { routePreloadPlugin } from "./scripts/vite-plugin-route-preload.mjs";
// @ts-expect-error greffon JS sans types
import { listingsPrefetchPlugin } from "./scripts/vite-plugin-listings-prefetch.mjs";
// @ts-expect-error greffon JS sans types
import { i18nNamespacesPlugin } from "./scripts/vite-plugin-i18n-namespaces.mjs";

/**
 * Le build n'appelle plus aucune fonction serveur. Le rafraichissement
 * Prerender apres une mise en ligne (familles en base ET pages statiques,
 * liste unique dans supabase/functions/_shared/static-seo-refresh.ts) est
 * assure par la chaine des crons detect-deploy-and-mark-dirty puis
 * consume-seo-dirty, a budget plafonne.
 */


// Build-time metadata injected into the bundle so /admin/build-info can
// display the exact bundle currently served in production.
const BUILD_TIME = new Date().toISOString();
const BUILD_ID =
  process.env.LOVABLE_BUILD_ID ||
  process.env.VERCEL_GIT_COMMIT_SHA ||
  process.env.COMMIT_SHA ||
  process.env.GIT_COMMIT ||
  BUILD_TIME.replace(/[:.]/g, "-");

// https://vitejs.dev/config/
/**
 * Familles de dépendances regroupées hors de l'entrée (lot perf 6). Les
 * composants Radix restent suivis par leurs pages (accordéon, menus,
 * sélecteurs), seules leurs briques internes forment vendor-radix-core.
 */
function lazyVendorFamily(p: string, match: (name: string) => boolean): string | undefined {
  // Superpositions communes à /annonces, à la fiche et aux pages membre.
  if (
    ["dialog", "popover", "tooltip", "popper", "arrow", "portal", "dismissable-layer", "focus-scope", "focus-guards", "use-escape-keydown", "use-size", "visually-hidden"].some((n) => match("@radix-ui/react-" + n))
    || p.includes("@floating-ui/")
    || ["react-remove-scroll", "react-remove-scroll-bar", "react-style-singleton", "use-callback-ref", "use-sidecar", "aria-hidden", "get-nonce", "detect-node-es"].some(match)
  ) return "vendor-overlay";
  // Briques internes de Radix partagées par l'accordéon de l'accueil et par
  // les superpositions : sans groupe propre, Rollup les rangerait dans
  // vendor-overlay et l'accueil le chargerait en entier.
  if (
    match("@radix-ui/primitive") || match("@radix-ui/number")
    || ["primitive", "context", "compose-refs", "slot", "id", "presence", "collection", "direction", "use-controllable-state", "use-effect-event", "use-layout-effect", "use-callback-ref", "use-previous", "use-is-hydrated"].some((n) => match("@radix-ui/react-" + n))
  ) return "vendor-radix-core";
  return undefined;
}

const entryStaticCache = new WeakMap<object, Set<string>>();
/** Modules importés statiquement depuis l'entrée, calculés une fois par build. */
function entryStaticModules(meta: { getModuleInfo: (id: string) => any; getModuleIds: () => IterableIterator<string> }): Set<string> {
  const cached = entryStaticCache.get(meta.getModuleInfo);
  if (cached) return cached;
  const seen = new Set<string>();
  const stack = [...meta.getModuleIds()].filter((m) => meta.getModuleInfo(m)?.isEntry);
  while (stack.length) {
    const m = stack.pop()!;
    if (seen.has(m)) continue;
    seen.add(m);
    // Les index de paquets qui réexportent tout (icônes, dates) ne disent
    // pas ce que l'entrée utilise vraiment : on ne les suit pas.
    for (const i of meta.getModuleInfo(m)?.importedIds ?? []) if (!/node_modules\/(lucide-react|date-fns)\//.test(i)) stack.push(i);
  }
  entryStaticCache.set(meta.getModuleInfo, seen);
  return seen;
}

export default defineConfig(({ mode }) => ({
  define: {
    __BUILD_ID__: JSON.stringify(BUILD_ID),
    __BUILD_TIME__: JSON.stringify(BUILD_TIME),
    __BUILD_MODE__: JSON.stringify(mode),
  },
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [
    // Lot perf 8 : chaque fichier apporte les espaces du dictionnaire qu'il cite.
    i18nNamespacesPlugin(),
    react(),
    mode === "development" && componentTagger(),
    mode === "production" && routeHashesPlugin(),
    memberPreloadPlugin(),
    // Ordre voulu : chaque greffon s'insère juste avant le script d'entrée,
    // dans l'ordre de cette liste. Les lectures et le premier affichage de
    // /annonces partent avant les préchargements en priorité basse.
    listingsPrefetchPlugin(),
    routePreloadPlugin(),
    mode === "production" && entryBudgetPlugin(),
  ].filter(Boolean) as Plugin[],
  resolve: {
    // IMPORTANT : alias sous forme de TABLEAU. Vite évalue dans l'ordre et
    // le premier match gagne. Les mocks doivent donc précéder l'alias générique
    // `@/` qui les engloberait sinon.
    alias: [
      ...(mode === "visual-test"
        ? [
            {
              find: "@/integrations/supabase/client",
              replacement: path.resolve(
                __dirname,
                "./src/integrations/supabase/client.mock.ts",
              ),
            },
            {
              find: "@/contexts/AuthContext",
              replacement: path.resolve(
                __dirname,
                "./src/contexts/AuthContext.mock.tsx",
              ),
            },
          ]
        : []),
      { find: "@", replacement: path.resolve(__dirname, "./src") },
      // Lot perf 6 : version de production de React Router (le paquet ne
      // publie la sienne que sous dist/production, ses exports pointent sur
      // la version de développement, avertissements compris).
      ...(mode === "production"
        ? [
            { find: /^react-router$/, replacement: path.resolve(__dirname, "node_modules/react-router/dist/production/index.mjs") },
            { find: /^react-router\/dom$/, replacement: path.resolve(__dirname, "node_modules/react-router/dist/production/dom-export.mjs") },
          ]
        : []),
    ],
    dedupe: ["react", "react-dom", "react/jsx-runtime", "react/jsx-dev-runtime"],
  },
  build: {
    rollupOptions: {
      output: {
        // La table des dependances appartient a l'entree. Des noms courts
        // reduisent son poids sans modifier les groupes ni raccourcir les empreintes.
        chunkFileNames: (chunk) => `assets/${chunk.name.slice(0, 19)}-[hash].js`,
        // Découpage par module plutôt que par liste de paquets. Recharts n'a plus
        // de chunk dédié : la forme objet créait « vendor-charts », où Rollup
        // fusionnait des modules partagés, ce qui forçait l'entrée à charger
        // recharts sur toutes les pages, y compris les pages ville sans graphique.
        // Sans règle, recharts reste dans le graphe paresseux des pages admin.
        manualChunks(id: string, meta: { getModuleInfo: (id: string) => any; getModuleIds: () => IterableIterator<string> }) {
          // Aide d'interopérabilité CommonJS utilisée par React : elle reste
          // avec React, sinon vendor-react et vendor-base s'importent l'un
          // l'autre et React n'est pas encore défini à l'exécution (verrou
          // dans src/__tests__/p2/startup-build.test.ts).
          if (id.startsWith("\0commonjsHelpers")) return "vendor-react";
          if (!id.includes("node_modules")) {
            // Lot P1 : les petits composants d'interface partagés forment un
            // seul fichier au lieu d'une trentaine de fichiers de quelques Ko.
            // Lot perf 6 : seuls les petits composants sans dépendance lourde
            // restent groupés ; Select, menus, Popover, Dialog, Accordion,
            // Tooltip et Toast suivent leurs pages (ils emportaient Radix et
            // floating-ui dans l'entrée).
            if (/\/src\/components\/ui\/(alert|avatar|badge|button|card|input|label|progress|separator|skeleton|textarea)\.tsx?$/.test(id)) return "app-ui";
            return;
          }
          const p = id.split("node_modules/").pop() ?? "";
          const match = (name: string) => p.startsWith(name + "/") || p.startsWith(".pnpm/") && p.includes("/" + name + "/");
          if (match("use-sync-external-store") || match("react-is") || match("scheduler")) return "vendor-react";
          if (match("@tanstack/react-query")) return "vendor-query";
          if (match("@supabase/supabase-js")) return "vendor-supabase";
          if (match("react") || match("react-dom") || match("react-router-dom") || match("react-router")) return "vendor-react";
          // Lot perf 6 : l'ancien groupe vendor-ui (Radix, 47 Ko compressés)
          // partait avec l'entrée, accueil compris. Désormais :
          // 1. icônes : chacune suit ses pages (le fichier d'index de
          //    lucide-react importe toutes les icônes, un groupe les ferait
          //    toutes entrer dans l'entrée) ;
          // 2. date-fns : un fichier chargé par les pages qui datent ;
          // 3. dépendances importées par l'entrée : vendor-base. Sans ce nom,
          //    Rollup range une dépendance non assignée dans le groupe qui
          //    l'importe aussi, et l'entrée chargerait ce groupe en entier ;
          // 4. superpositions et briques Radix : groupes chargés par les pages
          //    seulement (sans cela /annonces chargeait 120 fichiers).
          if (match("lucide-react")) return;
          if (match("date-fns")) return "vendor-date";
          if (entryStaticModules(meta).has(id)) return "vendor-base";
          const family = lazyVendorFamily(p, match);
          if (family) return family;
        },
      },
    },
    target: "es2020",
    cssCodeSplit: true,
  },
}));
