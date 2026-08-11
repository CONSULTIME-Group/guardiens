import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

/**
 * Post-build hook: after a successful production build, ping the
 * `prerender-recache-pending` edge function so Prerender re-snapshots
 * every page whose canonical_url / noindex / meta_* changed since the
 * last publish. Non-blocking and best-effort — never fails the build.
 */
/**
 * Liste blanche d'URLs SEO STATIQUES (issues de pages .tsx, pas de la DB)
 * à purger systématiquement à chaque build prod. Toute modification de
 * JSON-LD / meta sur ces pages doit être ajoutée ici, sinon Prerender
 * continue de servir l'ancien HTML jusqu'à expiration TTL (~24h).
 *
 * Règle : une URL n'entre dans cette liste que si elle répond 200 en production.
 * Une route inexistante ou un article non publié consomme un render Prerender
 * facturé à chaque build sans rien mettre en cache, puisque Prerender ne met
 * en cache que les réponses 200.
 */
const STATIC_SEO_URLS = [
  "https://guardiens.fr/",
  "https://guardiens.fr/tarifs",
  "https://guardiens.fr/actualites",
  "https://guardiens.fr/faq",
  "https://guardiens.fr/a-propos",
  "https://guardiens.fr/contact",
];

const prerenderFlushPlugin = (): Plugin => ({
  name: "prerender-flush-after-publish",
  apply: "build",
  async closeBundle() {
    const projectId = process.env.VITE_SUPABASE_PROJECT_ID;
    const anon = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
    if (!projectId || !anon) {
      console.log("[prerender-flush] skipped (missing VITE_SUPABASE_* env)");
      return;
    }
    const base = `https://${projectId}.supabase.co/functions/v1/prerender-recache-pending`;
    const headers = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${anon}`,
      apikey: anon,
    };

    // 1. Flush DB-dirty rows (articles/seo_city_pages/city_guides).
    try {
      const r = await fetch(base, { method: "POST", headers, body: "{}" });
      const txt = await r.text();
      console.log(`[prerender-flush] dirty ${r.status} ${txt.slice(0, 160)}`);
    } catch (e) {
      console.warn(`[prerender-flush] dirty failure: ${e instanceof Error ? e.message : String(e)}`);
    }

    // 2. Flush whitelist d'URLs SEO statiques (Pricing, Article fixe, FAQ…).
    try {
      const r = await fetch(base, {
        method: "POST",
        headers,
        body: JSON.stringify({ urls: STATIC_SEO_URLS }),
      });
      const txt = await r.text();
      console.log(`[prerender-flush] static ${r.status} ${txt.slice(0, 160)}`);
    } catch (e) {
      console.warn(`[prerender-flush] static failure: ${e instanceof Error ? e.message : String(e)}`);
    }
  },
});

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
    mode === "production" && prerenderFlushPlugin(),
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
          if (!id.includes("node_modules")) return;
          const p = id.split("node_modules/").pop() ?? "";
          const match = (name: string) => p.startsWith(name + "/") || p.startsWith(".pnpm/") && p.includes("/" + name + "/");
          if (match("use-sync-external-store") || match("react-is") || match("scheduler")) return "vendor-react";
          if (match("@tanstack/react-query")) return "vendor-query";
          if (match("@supabase/supabase-js")) return "vendor-supabase";
          if (p.startsWith("@radix-ui/")) return "vendor-ui";
          if (match("react") || match("react-dom") || match("react-router-dom") || match("react-router")) return "vendor-react";
        },
      },
    },
    target: "es2020",
    cssCodeSplit: true,
  },
}));
