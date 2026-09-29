import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
// @ts-expect-error greffon JS sans types
import { routeHashesPlugin } from "./scripts/vite-plugin-route-hashes.mjs";

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
    react(),
    mode === "development" && componentTagger(),
    mode === "production" && routeHashesPlugin(),
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
    ],
    dedupe: ["react", "react-dom", "react/jsx-runtime", "react/jsx-dev-runtime"],
  },
  build: {
    rollupOptions: {
      output: {
        // Découpage par module plutôt que par liste de paquets. Recharts n'a plus
        // de chunk dédié : la forme objet créait « vendor-charts », où Rollup
        // fusionnait des modules partagés, ce qui forçait l'entrée à charger
        // recharts sur toutes les pages, y compris les pages ville sans graphique.
        // Sans règle, recharts reste dans le graphe paresseux des pages admin.
        manualChunks(id: string) {
          // Lot P1 : les petits composants d'interface partagés forment un seul
          // fichier au lieu d'une trentaine de fichiers de quelques Ko.
          if (!id.includes("node_modules")) {
            if (/\/src\/components\/ui\/(accordion|alert|alert-dialog|avatar|badge|button|card|checkbox|collapsible|dialog|dropdown-menu|input|label|popover|progress|radio-group|select|separator|sheet|skeleton|switch|tabs|textarea|tooltip|toast|toaster|use-toast)\.tsx?$/.test(id)) return "app-ui";
            return;
          }
          const p = id.split("node_modules/").pop() ?? "";
          const match = (name: string) => p.startsWith(name + "/") || p.startsWith(".pnpm/") && p.includes("/" + name + "/");
          if (match("use-sync-external-store") || match("react-is") || match("scheduler")) return "vendor-react";
          if (match("@tanstack/react-query")) return "vendor-query";
          if (match("@supabase/supabase-js")) return "vendor-supabase";
          if (p.startsWith("@radix-ui/")) return "vendor-ui";
          if (match("lucide-react")) return "vendor-icons";
          if (match("date-fns")) return "vendor-date";
          if (match("react") || match("react-dom") || match("react-router-dom") || match("react-router")) return "vendor-react";
        },
      },
    },
    target: "es2020",
    cssCodeSplit: true,
  },
}));
