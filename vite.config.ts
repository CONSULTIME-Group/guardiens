import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      // En mode "visual-test" on remplace le client Supabase et le contexte
      // d'auth par leurs versions mockées (voir tests/visual/).
      ...(mode === "visual-test"
        ? {
            "@/integrations/supabase/client": path.resolve(
              __dirname,
              "./src/integrations/supabase/client.mock.ts"
            ),
            "@/contexts/AuthContext": path.resolve(
              __dirname,
              "./src/contexts/AuthContext.mock.tsx"
            ),
          }
        : {}),
    },
    dedupe: ["react", "react-dom", "react/jsx-runtime", "react/jsx-dev-runtime"],
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          "vendor-react": ["react", "react-dom", "react-router-dom"],
          "vendor-ui": [
            "@radix-ui/react-dialog", "@radix-ui/react-popover", "@radix-ui/react-tooltip",
            "@radix-ui/react-tabs", "@radix-ui/react-select", "@radix-ui/react-dropdown-menu",
            "@radix-ui/react-accordion", "@radix-ui/react-checkbox", "@radix-ui/react-switch",
            "@radix-ui/react-toast", "@radix-ui/react-scroll-area", "@radix-ui/react-avatar",
            "@radix-ui/react-label", "@radix-ui/react-separator", "@radix-ui/react-slider",
            "@radix-ui/react-toggle", "@radix-ui/react-toggle-group", "@radix-ui/react-progress",
            "@radix-ui/react-radio-group", "@radix-ui/react-alert-dialog", "@radix-ui/react-collapsible",
            "@radix-ui/react-hover-card", "@radix-ui/react-menubar", "@radix-ui/react-navigation-menu",
            "@radix-ui/react-aspect-ratio", "@radix-ui/react-context-menu",
          ],
          "vendor-query": ["@tanstack/react-query"],
          "vendor-supabase": ["@supabase/supabase-js"],
          "vendor-map": ["leaflet", "react-leaflet"],
          "vendor-charts": ["recharts"],
          "vendor-date": ["date-fns"],
          "vendor-forms": ["react-hook-form", "@hookform/resolvers", "zod"],
          "vendor-markdown": ["marked", "react-markdown"],
        },
      },
    },
    target: "es2020",
    cssCodeSplit: true,
  },
}));
