// Anti-régression : vérifie que tout fichier .tsx du dossier templates
// est bien (a) importé et (b) référencé dans le map TEMPLATES de registry.ts
//
// Bug historique : un template pouvait être importé mais oublié dans TEMPLATES,
// provoquant un 404 silencieux à l'envoi (cf. audit email Sprint 1.3).

import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { dirname, fromFileUrl, join } from "https://deno.land/std@0.224.0/path/mod.ts";

const TEMPLATES_DIR = dirname(fromFileUrl(import.meta.url));
const REGISTRY_PATH = join(TEMPLATES_DIR, "registry.ts");

const listTemplateFiles = (): string[] => {
  const files: string[] = [];
  for (const entry of Deno.readDirSync(TEMPLATES_DIR)) {
    if (
      entry.isFile &&
      entry.name.endsWith(".tsx") &&
      entry.name !== "registry.ts"
    ) {
      files.push(entry.name.replace(/\.tsx$/, ""));
    }
  }
  return files.sort();
};

const parseRegistry = (): { imports: string[]; mapKeys: string[] } => {
  const src = Deno.readTextFileSync(REGISTRY_PATH);

  // Extraire les imports : import { template as foo } from './foo-bar.tsx'
  const importRegex = /from\s+['"]\.\/([a-z0-9-]+)\.tsx['"]/g;
  const imports = [...src.matchAll(importRegex)].map((m) => m[1]).sort();

  // Extraire les clés du map TEMPLATES
  const mapMatch = src.match(
    /TEMPLATES\s*:\s*Record<string,\s*TemplateEntry>\s*=\s*\{([\s\S]*?)\n\}/,
  );
  if (!mapMatch) throw new Error("TEMPLATES map introuvable dans registry.ts");
  const keyRegex = /['"]([a-z0-9-]+)['"]\s*:/g;
  const mapKeys = [...mapMatch[1].matchAll(keyRegex)].map((m) => m[1]).sort();

  return { imports, mapKeys };
};

Deno.test("registry: chaque .tsx du dossier est importé dans registry.ts", () => {
  const files = listTemplateFiles();
  const { imports } = parseRegistry();
  const missing = files.filter((f) => !imports.includes(f));
  assertEquals(
    missing,
    [],
    `Templates non importés dans registry.ts : ${missing.join(", ")}`,
  );
});

Deno.test("registry: chaque template importé a une entrée dans TEMPLATES", () => {
  const { imports, mapKeys } = parseRegistry();
  const missing = imports.filter((i) => !mapKeys.includes(i));
  assertEquals(
    missing,
    [],
    `Templates importés mais ABSENTS du map TEMPLATES (404 silencieux à l'envoi !) : ${missing.join(", ")}`,
  );
});

Deno.test("registry: aucune clé orpheline dans TEMPLATES (sans fichier)", () => {
  const files = listTemplateFiles();
  const { mapKeys } = parseRegistry();
  const orphans = mapKeys.filter((k) => !files.includes(k));
  assertEquals(
    orphans,
    [],
    `Clés du map TEMPLATES sans fichier .tsx correspondant : ${orphans.join(", ")}`,
  );
});

Deno.test("registry: parité imports ↔ map (même nombre)", () => {
  const { imports, mapKeys } = parseRegistry();
  assertEquals(
    imports.length,
    mapKeys.length,
    `Désynchronisation : ${imports.length} imports vs ${mapKeys.length} entrées dans TEMPLATES`,
  );
});
