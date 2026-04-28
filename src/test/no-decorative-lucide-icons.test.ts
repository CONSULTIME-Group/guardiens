/**
 * Garde-fou : interdit l'import des icônes Lucide décoratives dans tout `src/`.
 *
 * Règle source : mem://constraints/no-icons-in-content
 * Pas d'icônes Lucide décoratives ni d'emojis dans le contenu (cartes, listes, copy).
 * Seules les icônes UI fonctionnelles, de statut ou de navigation sont autorisées.
 *
 * Ce test parse statiquement chaque fichier .ts/.tsx et fait échouer la compilation
 * de la suite si l'une des icônes interdites est ré-importée depuis "lucide-react".
 *
 * Pour ajouter une icône à la liste : éditer DENYLIST ci-dessous.
 * Pour exempter un fichier (cas vraiment justifié) : ajouter son chemin à ALLOWED_FILES.
 */
import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";

const SRC_DIR = join(process.cwd(), "src");

/** Icônes Lucide décoratives strictement interdites. */
const DENYLIST = [
  // Catégoriels / illustratifs — toujours décoratifs dans nos cartes
  "Heart",
  "PawPrint",
  "Home",
  "MapPin",
  "ShieldCheck",
  "Star",
  "BookOpen",
  "Building2",
  "Trees",
  "Mountain",
  "Waves",
  "Calendar",
  "Utensils",
  "Activity",
  "Footprints",
  "Clock",
  "Sun",
  "Sunset",
  "Moon",
  "Coffee",
  "Bike",
  "Wifi",
  "WashingMachine",
  "Flame",
] as const;

/**
 * Fichiers exemptés (chemins relatifs depuis la racine projet, normalisés POSIX).
 * Garder cette liste minimale et documenter chaque exception.
 */
const ALLOWED_FILES = new Set<string>([
  // Le présent test (déclare la denylist en chaîne, pas en import)
  "src/test/no-decorative-lucide-icons.test.ts",

  // --- UI fonctionnelle exemptée ---
  // Star = primitive de notation (rating), pas décoratif
  "src/components/reviews/StarRating.tsx",
  "src/components/reviews/ReviewsDisplay.tsx",
  // ShieldCheck = badge de statut "vérifié" (signal fonctionnel)
  "src/components/profile/VerifiedBadge.tsx",
  "src/components/profile/TrustProfile.tsx",
  "src/components/profile/TrustScore.tsx",
  // Home = icône de navigation (breadcrumb racine, nav primaire)
  "src/components/layout/Breadcrumbs.tsx",
  "src/components/layout/Navigation.tsx",
]);

/** Dossiers ignorés (vendor / générés). */
const IGNORED_DIRS = new Set(["node_modules", "dist", ".next", "build", "coverage"]);

function walk(dir: string, acc: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const abs = join(dir, entry);
    const st = statSync(abs);
    if (st.isDirectory()) {
      if (IGNORED_DIRS.has(entry)) continue;
      walk(abs, acc);
    } else if (/\.(ts|tsx)$/.test(entry)) {
      acc.push(abs);
    }
  }
  return acc;
}

/**
 * Extrait la liste des identifiants importés depuis "lucide-react" dans un fichier.
 * Couvre :
 *   - import { A, B as C } from "lucide-react"
 *   - import { A } from 'lucide-react'
 *   - import lucide from "lucide-react"; (skip — pas de specifier nommé)
 * Ignore les imports dynamiques (rares ici) et les commentaires de ligne.
 */
function extractLucideNamedImports(source: string): string[] {
  // Strip line + block comments pour limiter les faux positifs
  const stripped = source
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:])\/\/.*$/gm, "$1");

  const found: string[] = [];
  const regex =
    /import\s*(?:type\s*)?\{\s*([^}]+?)\s*\}\s*from\s*['"]lucide-react['"]/g;
  let m: RegExpExecArray | null;
  while ((m = regex.exec(stripped)) !== null) {
    const specifiers = m[1].split(",");
    for (const raw of specifiers) {
      const name = raw.trim().split(/\s+as\s+/i)[0].trim();
      if (name) found.push(name);
    }
  }
  return found;
}

describe("Garde-fou : icônes Lucide décoratives interdites", () => {
  const files = walk(SRC_DIR);

  it("scanne au moins quelques fichiers source", () => {
    expect(files.length).toBeGreaterThan(10);
  });

  it("aucun fichier de src/ n'importe une icône Lucide décorative interdite", () => {
    const denySet = new Set<string>(DENYLIST);
    const offenders: { file: string; icons: string[] }[] = [];

    for (const abs of files) {
      const rel = relative(process.cwd(), abs).split(sep).join("/");
      if (ALLOWED_FILES.has(rel)) continue;

      const src = readFileSync(abs, "utf8");
      if (!src.includes("lucide-react")) continue;

      const imports = extractLucideNamedImports(src);
      const banned = imports.filter((n) => denySet.has(n));
      if (banned.length > 0) {
        offenders.push({ file: rel, icons: Array.from(new Set(banned)) });
      }
    }

    if (offenders.length > 0) {
      const report = offenders
        .map((o) => `  - ${o.file} → ${o.icons.join(", ")}`)
        .join("\n");
      throw new Error(
        `Icônes Lucide décoratives interdites détectées (mem://constraints/no-icons-in-content) :\n${report}\n\n` +
          `Action attendue : retirer ces imports et passer en texte pur (eyebrow + label) ` +
          `ou utiliser une illustration sur-mesure. Si un cas est vraiment justifié, ` +
          `ajouter le chemin à ALLOWED_FILES dans src/test/no-decorative-lucide-icons.test.ts ` +
          `et documenter l'exception.`,
      );
    }

    expect(offenders).toEqual([]);
  });
});
