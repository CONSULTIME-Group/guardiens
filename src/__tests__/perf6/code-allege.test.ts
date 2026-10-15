/**
 * Lot perf 6 : code allégé. L'entrée du site ne charge plus Radix (menus,
 * fenêtres, infobulles, messages), sonner ni Leaflet ; ces morceaux suivent
 * les écrans qui s'en servent. Verrou par lecture des imports statiques.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const read = (p: string) => readFileSync(p, "utf8");
// Imports de valeur seulement (un « import type » disparaît à la compilation).
const staticImports = (src: string) => [...src.matchAll(/^import\s(?!type\s)[^;]*?from\s+"([^"]+)";?$/gms)].map((m) => m[1]);

describe("entrée du site allégée (lot perf 6)", () => {
  it("App.tsx : ni fournisseur d'infobulles, ni zones de messages, ni sonner en import statique", () => {
    const imports = staticImports(read("src/App.tsx"));
    for (const banned of ["@/components/ui/tooltip", "@/components/ui/toaster", "@/components/ui/sonner", "sonner"]) {
      expect(imports, banned).not.toContain(banned);
    }
    expect(read("src/App.tsx")).toMatch(/optionalLazy\(\(\) => import\("@\/components\/ui\/toaster"\)/);
    expect(read("src/App.tsx")).toMatch(/optionalLazy\(\(\) => import\("@\/components\/ui\/sonner"\)/);
  });

  it("en-tête public : menu du compte et menu mobile chargés à la demande", () => {
    const header = staticImports(read("src/components/layout/PublicHeader.tsx"));
    expect(header).not.toContain("@/components/ui/sheet");
    expect(header).not.toContain("./UserMenu");
    expect(header).toContain("./LazyUserMenu");
    expect(staticImports(read("src/components/layout/AppTopBar.tsx"))).not.toContain("./UserMenu");
    expect(read("src/components/layout/PublicHeader.tsx")).toMatch(/import\("\.\/PublicMobileMenu"\)/);
  });

  it("infobulle autonome : chaque Tooltip porte son fournisseur", () => {
    expect(read("src/components/ui/tooltip.tsx")).toMatch(/<TooltipPrimitive\.Provider>\s*<TooltipPrimitive\.Root \{\.\.\.props\} \/>/);
  });

  it("carte de localisation, candidature, formulaire d'animal, accord et vues de fiche à la demande", () => {
    for (const f of ["src/components/sits/PublicSitView.tsx", "src/components/missions/PublicMissionView.tsx", "src/pages/SmallMissionDetail.tsx"]) {
      expect(staticImports(read(f)), f).not.toContain("@/components/shared/ApproximateLocationMap");
    }
    expect(staticImports(read("src/pages/PublicSitDetail.tsx"))).not.toContain("@/components/sits/ApplicationModal");
    expect(staticImports(read("src/components/pets/PetsEditor.tsx"))).not.toContain("./PetForm");
    for (const f of ["src/hooks/useAcceptApplication.tsx", "src/components/sits/views/SitterSitView.tsx", "src/components/sits/views/OwnerSitView.tsx"]) {
      expect(staticImports(read(f)), f).not.toContain("@/components/gardes/AccordDeGarde");
    }
    const sitDetail = staticImports(read("src/pages/SitDetail.tsx"));
    expect(sitDetail).not.toContain("@/components/sits/views/OwnerSitView");
    expect(sitDetail).not.toContain("@/components/sits/views/SitterSitView");
  });

  it("build : groupes hors de l'entrée, icônes avec leurs pages, React Router en version de production", () => {
    const cfg = read("vite.config.ts");
    expect(cfg).not.toMatch(/return "vendor-ui"/);
    expect(cfg).not.toMatch(/return "vendor-icons"/);
    // Dépendances de l'entrée nommées avant tout groupe de pages.
    expect(cfg.indexOf('return "vendor-base"')).toBeGreaterThan(0);
    expect(cfg.indexOf('return "vendor-base"')).toBeLessThan(cfg.indexOf("lazyVendorFamily(p, match)"));
    expect(cfg).toMatch(/if \(match\("lucide-react"\)\) return;/);
    expect(cfg).toMatch(/\\0commonjsHelpers"\)\) return "vendor-react"/);
    expect(cfg).not.toMatch(/\(accordion\|alert\|alert-dialog/);
    expect(cfg).toMatch(/react-router\/dist\/production\/index\.mjs/);
  });
});
