/**
 * Test de parité des ENTRÉES du moteur d'affinité (20/08/2026).
 *
 * Pourquoi ce test existe : ApplicationsList.tsx sélectionnait bien les 16
 * colonnes en base, mais l'objet AffinitySitterInput construit pour le
 * moteur en jetait six (lifestyle, availability_during, has_vehicle,
 * has_license, special_animal_skills, farm_animals_ok). Le même couple
 * obtenait un score différent selon l'écran, et le test de parité historique
 * ne pouvait rien voir : il comparait le moteur à lui-même.
 *
 * Ici on compare les ENTRÉES. La liste des champs attendus n'est PAS
 * recopiée à la main : elle est dérivée de l'interface AffinitySitterInput
 * définie dans le moteur unique. Le test casse donc dans les deux sens :
 * champ ajouté à l'interface sans être alimenté, ou champ retiré d'une
 * source.
 *
 * Trois verrous :
 * 1. Chaque source par projection SQL (select sur sitter_profiles ou
 *    sitter_profiles_affinity) couvre les 16 champs.
 * 2. Chaque source par littéral typé construit les 16 clés.
 * 3. Tout appel DIRECT à computeAffinityResultFull doit être répertorié
 *    ici : un nouvel appelant non déclaré fait échouer la suite.
 */
import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { resolve, join } from "node:path";

const ROOT = process.cwd();
const read = (p: string) => readFileSync(resolve(ROOT, p), "utf8");

const ENGINE = "supabase/functions/_shared/affinity/score.ts";

/** Champs de l'interface AffinitySitterInput, dérivés du moteur unique. */
function interfaceFields(): string[] {
  const src = read(ENGINE);
  const m = src.match(/export interface AffinitySitterInput \{([\s\S]*?)\n\}/);
  if (!m) throw new Error("interface AffinitySitterInput introuvable dans le moteur");
  const fields: string[] = [];
  for (const f of m[1].matchAll(/^\s*([a-z_]+)\??:/gm)) fields.push(f[1]);
  return fields.sort();
}

/** Constantes locales `const NAME = "..."` ou `` `...` ``, interpolations résolues. */
function collectConstStrings(src: string): Map<string, string> {
  const consts = new Map<string, string>();
  const re = /const\s+([A-Z][A-Z0-9_]+)\s*=\s*(?:"([^"]*)"|`([^`]*)`)/g;
  // Plusieurs passes : une constante peut en interpoler une autre.
  for (let pass = 0; pass < 4; pass++) {
    let changed = false;
    for (const m of src.matchAll(re)) {
      const raw = m[2] ?? m[3] ?? "";
      const resolved = raw.replace(/\$\{([A-Z][A-Z0-9_]+)\}/g, (_, name) => {
        if (!consts.has(name)) throw new Error(`interpolation non résoluble : ${name}`);
        return consts.get(name)!;
      });
      if (!consts.has(m[1])) {
        consts.set(m[1], resolved);
        changed = true;
      }
    }
    if (!changed) break;
  }
  return consts;
}

/**
 * Colonnes projetées par les requêtes d'un fichier vers les tables sitter
 * privées. `select("*")` est complet par construction. Toute projection non
 * lisible statiquement fait échouer le test : c'est voulu, la lisibilité
 * statique est la condition du verrou.
 */
function projectedSitterColumns(path: string): { cols: Set<string>; star: boolean } {
  const src = read(path);
  const consts = collectConstStrings(src);
  const cols = new Set<string>();
  let star = false;
  const re =
    /\.from\(\s*["'`](?:sitter_profiles|sitter_profiles_affinity)["'`]\s*\)[\s\S]{0,1500}?\.select\(\s*([\s\S]{0,800}?)\)/g;
  for (const m of src.matchAll(re)) {
    const expr = m[1].trim();
    let value: string;
    if (/^[A-Z][A-Z0-9_]+$/.test(expr)) {
      const v = consts.get(expr);
      if (v == null) throw new Error(`${path} : projection ${expr} non résoluble statiquement`);
      value = v;
    } else if (expr.startsWith('"') || expr.startsWith("`")) {
      const raw = expr.replace(/^"|"$/g, "").replace(/^`|`$/g, "");
      value = raw.replace(/\$\{([A-Z][A-Z0-9_]+)\}/g, (_, name) => {
        if (!consts.has(name)) throw new Error(`${path} : interpolation ${name} non résoluble`);
        return consts.get(name)!;
      });
    } else {
      throw new Error(`${path} : expression de select non lisible statiquement : ${expr.slice(0, 80)}`);
    }
    for (const c of value.split(",")) {
      const name = c.trim().split(/[\s(:]/)[0];
      if (name === "*") star = true;
      else if (name) cols.add(name);
    }
  }
  return { cols, star };
}

/** Clés des littéraux typés `AffinitySitterInput` construits dans un fichier. */
function literalKeys(path: string): string[] {
  const src = read(path);
  const keys = new Set<string>();
  const re = /:\s*AffinitySitterInput(?:\s*\|\s*null)?\s*=\s*\w+\s*\?\s*\{([\s\S]*?)\n\s*\}\s*:\s*null/g;
  for (const m of src.matchAll(re)) {
    for (const k of m[1].matchAll(/^\s*([a-z_]+):/gm)) keys.add(k[1]);
  }
  return [...keys];
}

/**
 * Sources par projection SQL. Chaque requête vers sitter_profiles ou
 * sitter_profiles_affinity dans ces fichiers alimente le moteur, directement
 * ou via un relais, et doit projeter les 16 champs.
 */
const SOURCES_PROJECTION = [
  "src/hooks/useViewerSitterForAffinity.ts",
  "src/hooks/useSitterTopAffinitySits.ts",
  "src/hooks/useOwnerTopAffinitySitters.ts",
  "src/hooks/useOwnerDashboardData.ts",
  "src/components/sits/ApplicationModal.tsx",
  "src/components/search/SearchOwner.tsx",
  "src/pages/PublicSitterProfile.tsx",
  "src/pages/SitDetail.tsx",
  "supabase/functions/send-sitter-daily-digest/index.ts",
  "supabase/functions/send-onboarding-j1/index.ts",
];

/** Sources par littéral typé : les clés de l'objet sont contrôlées. */
const SOURCES_LITERAL = ["src/components/sits/ApplicationsList.tsx"];

/**
 * Relais : appellent le moteur mais reçoivent un AffinitySitterInput déjà
 * construit par une source contrôlée. On vérifie seulement qu'ils restent
 * des relais (annotation de type présente, pas de requête sitter propre).
 */
const RELAYS = [
  "src/hooks/useAffinityWithShadow.ts",
  "src/components/ai/alma/AlmaFitGardien.tsx",
  "src/components/dashboard/owner/OwnerStarSection.tsx",
];

const REGISTRY = new Set([...SOURCES_PROJECTION, ...SOURCES_LITERAL, ...RELAYS]);

/** Tous les fichiers source, hors tests et définition du moteur. */
function* walk(dir: string): Generator<string> {
  for (const entry of readdirSync(dir)) {
    if (entry === "node_modules" || entry.startsWith(".")) continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      if (entry === "__tests__") continue;
      yield* walk(full);
    } else if (/\.(ts|tsx)$/.test(entry) && !/\.(test|spec)\.(ts|tsx)$/.test(entry)) {
      yield full;
    }
  }
}

describe("parité des entrées du moteur d'affinité", () => {
  const fields = interfaceFields();

  it("l'interface AffinitySitterInput porte les 16 champs attendus", () => {
    expect(fields.length).toBe(16);
  });

  describe("sources par projection SQL", () => {
    for (const path of SOURCES_PROJECTION) {
      it(`${path} projette les 16 champs`, () => {
        const { cols, star } = projectedSitterColumns(path);
        if (star) return; // select("*") : complet par construction
        const missing = fields.filter((f) => !cols.has(f));
        expect(
          missing,
          `colonnes absentes de la projection ${path} : ${missing.join(", ")}`,
        ).toEqual([]);
      });
    }
  });

  describe("sources par littéral typé", () => {
    for (const path of SOURCES_LITERAL) {
      it(`${path} construit les 16 clés`, () => {
        const keys = literalKeys(path);
        const missing = fields.filter((f) => !keys.includes(f));
        expect(
          missing,
          `clés absentes du littéral AffinitySitterInput dans ${path} : ${missing.join(", ")}`,
        ).toEqual([]);
      });
    }
  });

  describe("relais", () => {
    for (const path of RELAYS) {
      it(`${path} reste un relais typé, sans requête sitter propre`, () => {
        const src = read(path);
        expect(src).toContain("AffinitySitterInput");
        expect(src).not.toMatch(/\.from\(\s*["'`](?:sitter_profiles|sitter_profiles_affinity)["'`]/);
      });
    }
  });

  it("tout appel direct à computeAffinityResultFull est répertorié", () => {
    const callers: string[] = [];
    for (const base of ["src", "supabase/functions"]) {
      for (const full of walk(resolve(ROOT, base))) {
        const rel = full.slice(ROOT.length + 1).replace(/\\/g, "/");
        if (rel === ENGINE) continue;
        const src = readFileSync(full, "utf8");
        if (/computeAffinityResultFull\s*\(/.test(src)) callers.push(rel);
      }
    }
    const unknown = callers.filter((c) => !REGISTRY.has(c));
    expect(
      unknown,
      `nouveaux appelants du moteur à déclarer dans affinity-input-parity.test.ts : ${unknown.join(", ")}`,
    ).toEqual([]);
  });
});
