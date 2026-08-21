/**
 * Test de parité des ENTRÉES du moteur d'affinité (20/08/2026, étendu au
 * côté propriétaire le 21/08/2026).
 *
 * Pourquoi ce test existe : ApplicationsList.tsx sélectionnait bien les 16
 * colonnes en base, mais l'objet AffinitySitterInput construit pour le
 * moteur en jetait six (lifestyle, availability_during, has_vehicle,
 * has_license, special_animal_skills, farm_animals_ok). Le même couple
 * obtenait un score différent selon l'écran, et le test de parité historique
 * ne pouvait rien voir : il comparait le moteur à lui-même.
 *
 * La même classe de bug existait côté propriétaire : AffinityOwnerInput a
 * 10 champs et 11 surfaces sur 16 en perdaient au moins un (politiques
 * accompagnants accepts_sitter_pets / accepts_sitter_children absentes du
 * hook partagé, car_required absent de la modale de candidature et de la
 * page annonce).
 *
 * Ici on compare les ENTRÉES. Les listes de champs attendues ne sont PAS
 * recopiées à la main : elles sont dérivées des interfaces AffinitySitterInput
 * et AffinityOwnerInput définies dans le moteur unique. Le test casse donc
 * dans les deux sens : champ ajouté à l'interface sans être alimenté, ou
 * champ retiré d'une source.
 *
 * Verrous côté gardien (16 champs) :
 * 1. Chaque source par projection SQL couvre les 16 champs. select("*")
 *    n'est PAS une exemption : il prouve les colonnes de la table, pas que
 *    l'objet transmis au moteur les porte. Tout re-mapping partiel (entre
 *    1 et 15 clés gardien) en aval d'un star est interdit.
 * 2. Chaque source par littéral typé construit les 16 clés.
 *
 * Verrous côté propriétaire (10 champs) :
 * 3. Chaque littéral complet construit les 10 clés.
 * 4. Le hook partagé useViewerOwnerForAffinity injecte les 4 champs hors
 *    table (pets, accepts_sitter_pets, accepts_sitter_children,
 *    car_required) et chaque consommateur passe par lui.
 * 5. Les sources par spread (select("*") ou vue + enrichissement) injectent
 *    explicitement les champs hors table : un select("*") ne peut pas
 *    fournir accepts_sitter_* (colonnes de sits) ni car_required (colonne
 *    de properties).
 * 6. Les animaux du propriétaire sont projetés avec species, special_needs
 *    ET breed partout, y compris le repli anonyme public_pets de SitDetail
 *    (projection explicite exigée : un star sur une vue amputée ne prouve
 *    rien, special_needs y manquait avant le 20/08/2026).
 * 7. Toute surface disposant d'une annonce dans son périmètre lit
 *    accepts_sitter_pets / accepts_sitter_children depuis cette annonce,
 *    jamais null (règle produit du 21/08/2026). Un null n'est permis que
 *    hors contexte annonce et doit porter le commentaire qui le justifie.
 *
 * Verrous transverses :
 * 8. Les relais restent des relais (aucune requête sitter ou propriétaire
 *    propre).
 * 9. Tout appel DIRECT au moteur (computeAffinityResultFull ou son alias
 *    computeAffinityScore) doit être répertorié ici : un nouvel appelant
 *    non déclaré fait échouer la suite.
 */
import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { resolve, join } from "node:path";

const ROOT = process.cwd();
const read = (p: string) => readFileSync(resolve(ROOT, p), "utf8");

const ENGINE = "supabase/functions/_shared/affinity/score.ts";

/** Champs d'une interface du moteur unique, dérivés du source. */
function interfaceFields(name: string): string[] {
  const src = read(ENGINE);
  const m = src.match(new RegExp(`export interface ${name} \\{([\\s\\S]*?)\\n\\}`));
  if (!m) throw new Error(`interface ${name} introuvable dans le moteur`);
  const fields: string[] = [];
  for (const f of m[1].matchAll(/^\s*([a-z_]+)\??:/gm)) fields.push(f[1]);
  return fields.sort();
}

/** Constantes locales `const NAME = "..."` ou `` `...` ``, interpolations résolues. */
function collectConstStrings(src: string): Map<string, string> {
  const consts = new Map<string, string>();
  const re = /const\s+([A-Z][A-Z0-9_]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|`([^`]*)`)/g;
  // Plusieurs passes : une constante peut en interpoler une autre.
  for (let pass = 0; pass < 4; pass++) {
    let changed = false;
    for (const m of src.matchAll(re)) {
      const raw = m[2] ?? m[3] ?? m[4] ?? "";
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
 * Colonnes projetées par les requêtes d'un fichier vers les tables données.
 * `select("*")` est complet par construction. Toute projection non lisible
 * statiquement fait échouer le test : c'est voulu, la lisibilité statique
 * est la condition du verrou.
 */
function projectedColumns(path: string, tables: string[]): { cols: Set<string>; star: boolean } {
  const src = read(path);
  const consts = collectConstStrings(src);
  const cols = new Set<string>();
  let star = false;
  const re = new RegExp(
    `\\.from\\(\\s*["'\`](?:${tables.join("|")})["'\`](?:\\s+as\\s+\\w+)?\\s*\\)[\\s\\S]{0,1500}?\\.select\\(\\s*("[^"]*"|'[^']*'|\`[^\`]*\`|[A-Z][A-Z0-9_]+)`,
    "g",
  );
  for (const m of src.matchAll(re)) {
    const expr = m[1];
    let value: string;
    if (/^[A-Z][A-Z0-9_]+$/.test(expr)) {
      const v = consts.get(expr);
      if (v == null) throw new Error(`${path} : projection ${expr} non résoluble statiquement`);
      value = v;
    } else {
      value = expr.slice(1, -1).replace(/\$\{([A-Z][A-Z0-9_]+)\}/g, (_, name) => {
        if (!consts.has(name)) throw new Error(`${path} : interpolation ${name} non résoluble`);
        return consts.get(name)!;
      });
    }
    for (const c of value.split(",")) {
      const name = c.trim().split(/[\s(:]/)[0];
      if (name === "*") star = true;
      else if (name) cols.add(name);
    }
  }
  return { cols, star };
}

/** Colonnes gardien projetées (tables privées sitter). */
function projectedSitterColumns(path: string): { cols: Set<string>; star: boolean } {
  return projectedColumns(path, ["sitter_profiles", "sitter_profiles_affinity"]);
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

/** Bloc littéral d'objet suivant un marqueur, par appariement d'accolades. */
function objectBlockAfter(src: string, marker: string): string {
  const i = src.indexOf(marker);
  if (i < 0) throw new Error(`marqueur introuvable : ${marker}`);
  const start = src.indexOf("{", i);
  if (start < 0) throw new Error(`pas d'accolade ouvrante après : ${marker}`);
  let depth = 0;
  for (let j = start; j < src.length; j++) {
    if (src[j] === "{") depth++;
    else if (src[j] === "}") {
      depth--;
      if (depth === 0) return src.slice(start, j + 1);
    }
  }
  throw new Error(`accolade fermante introuvable après : ${marker}`);
}

/** Clés en début de ligne d'un bloc, formes `cle:` et raccourcie `cle,`. */
function blockKeys(block: string): Set<string> {
  const keys = new Set<string>();
  for (const k of block.matchAll(/^\s*([a-z_]+)\s*[,:]/gm)) keys.add(k[1]);
  return keys;
}

/** Projection animaux complète, forme embarquée PostgREST : pets(species, special_needs, breed). */
const PETS_FULL_EMBED = /pets(?:\s*:\s*pets)?\(\s*species\s*,\s*special_needs\s*,\s*breed\s*\)/;
/** Triplet attendu pour toute projection de la table pets. */
const PETS_TRIPLE = ["species", "special_needs", "breed"];

/* ------------------------------------------------------------------ */
/*  Registre des surfaces                                             */
/* ------------------------------------------------------------------ */

/**
 * Sources gardien par projection SQL. Chaque requête vers sitter_profiles
 * ou sitter_profiles_affinity dans ces fichiers alimente le moteur,
 * directement ou via un relais, et doit projeter les 16 champs.
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

/** Sources gardien par littéral typé : les clés de l'objet sont contrôlées. */
const SOURCES_LITERAL = ["src/components/sits/ApplicationsList.tsx"];

/**
 * Sources propriétaire par littéral complet : le bloc qui suit le marqueur
 * doit construire les 10 clés d'AffinityOwnerInput. "table" / "embed"
 * indique comment les animaux sont projetés (contrôlé en plus).
 */
const OWNER_LITERAL_SOURCES: Array<[string, string, "table" | "embed"]> = [
  ["src/hooks/useOwnerTopAffinitySitters.ts", "const ownerInput = {", "table"],
  ["src/hooks/useSitterTopAffinitySits.ts", "computeAffinityResultFull(", "table"],
  ["supabase/functions/send-onboarding-j1/index.ts", "const ownerInput = {", "embed"],
  ["supabase/functions/send-sitter-daily-digest/index.ts", "const loadOwnerInput =", "embed"],
];

/**
 * Hook partagé du propriétaire visiteur : source unique pour toutes les
 * surfaces où un propriétaire consulte un gardien hors contexte annonce.
 */
const VIEWER_OWNER_HOOK = "src/hooks/useViewerOwnerForAffinity.ts";

/**
 * Consommateurs du hook : ils ne doivent JAMAIS reconstruire une entrée
 * propriétaire par leurs propres requêtes (sinon double source de vérité).
 */
const VIEWER_OWNER_CONSUMERS = [
  "src/components/search/SearchOwner.tsx",
  "src/components/matching/OwnerToSitterAffinity.tsx",
  "src/components/matching/OwnerAffinityBanner.tsx",
  "src/components/ai/alma/AlmaFitGardien.tsx",
  "src/components/dashboard/owner/OwnerStarSection.tsx",
  "src/components/sits/ApplicationsList.tsx",
];

/** Sources propriétaire par spread : ligne base élargie de champs hors table. */
const OWNER_SPREAD_SOURCES = [
  "src/components/sits/ApplicationModal.tsx",
  "src/pages/SitDetail.tsx",
  "src/pages/PublicSitterProfile.tsx",
];

/**
 * Colonnes d'AffinityOwnerInput portées par owner_profiles (ou sa vue
 * publique). Les 5 autres champs sont hors table : pets (jointure),
 * accepts_sitter_pets / accepts_sitter_children (colonnes de sits),
 * car_required (colonne de properties), distance_km (calculée par couple,
 * jamais stockée). Un select("*") sur owner_profiles ne les fournit donc
 * PAS : ils doivent être injectés explicitement. Une surface qui connaît
 * la distance du couple DOIT la passer ; une surface sans coordonnées
 * écrit null explicitement avec un commentaire.
 */
const OWNER_TABLE_COLUMNS = [
  "preferred_sitter_types",
  "home_ambiance",
  "languages",
  "interests",
  "life_pace",
  "presence_expected",
];
const OWNER_OFF_TABLE_FIELDS = [
  "pets",
  "accepts_sitter_pets",
  "accepts_sitter_children",
  "car_required",
  "distance_km",
];

/**
 * Relais : appellent le moteur (ou le hook de calcul) mais reçoivent des
 * entrées déjà construites par une source contrôlée. On vérifie seulement
 * qu'ils restent des relais : aucune requête sitter ou propriétaire propre.
 */
const RELAYS = [
  "src/hooks/useAffinityWithShadow.ts",
  "src/components/matching/AffinitySection.tsx",
  "src/components/matching/OwnerToSitterAffinity.tsx",
  "src/components/sits/views/SitterAffinitySection.tsx",
  "src/components/ai/alma/AlmaFitGardien.tsx",
  "src/components/ai/alma/wiring/AlmaPopularSitWhisper.tsx",
  "src/components/dashboard/owner/OwnerStarSection.tsx",
];

const REGISTRY = new Set([
  ...SOURCES_PROJECTION,
  ...SOURCES_LITERAL,
  ...OWNER_LITERAL_SOURCES.map(([p]) => p),
  VIEWER_OWNER_HOOK,
  ...VIEWER_OWNER_CONSUMERS,
  ...OWNER_SPREAD_SOURCES,
  ...RELAYS,
]);

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
  const sitterFields = interfaceFields("AffinitySitterInput");
  const ownerFields = interfaceFields("AffinityOwnerInput");

  it("l'interface AffinitySitterInput porte les 16 champs attendus", () => {
    expect(sitterFields.length).toBe(16);
  });

  it("l'interface AffinityOwnerInput porte les 11 champs attendus", () => {
    expect(ownerFields.length).toBe(11);
  });

  it("le découpage table / hors table couvre exactement AffinityOwnerInput", () => {
    const declared = [...OWNER_TABLE_COLUMNS, ...OWNER_OFF_TABLE_FIELDS].sort();
    expect(declared).toEqual(ownerFields);
  });

  /* ------------------------- côté gardien ------------------------- */

  describe("sources gardien par projection SQL", () => {
    for (const path of SOURCES_PROJECTION) {
      it(`${path} projette les 16 champs`, () => {
        const { cols, star } = projectedSitterColumns(path);
        if (star) {
          // select("*") prouve les colonnes de la TABLE, pas que l'objet
          // transmis au moteur les porte (le bug ApplicationsList du
          // 20/08/2026 sous une autre forme). Exigence assortie : la ligne
          // doit arriver au moteur sans re-plucking. Tout littéral qui
          // remappe une partie seulement des champs gardien est interdit.
          const src = read(path);
          const remapped = sitterFields.filter((f) =>
            new RegExp(`^\\s*${f}\\s*:`, "m").test(src),
          );
          expect(
            remapped.length === 0 || remapped.length === sitterFields.length,
            `${path} : select("*") suivi d'un re-mapping partiel (${remapped.length}/${sitterFields.length} clés : ${remapped.join(", ")}). Transmettre la ligne brute ou construire les ${sitterFields.length} clés.`,
          ).toBe(true);
          return;
        }
        const missing = sitterFields.filter((f) => !cols.has(f));
        expect(
          missing,
          `colonnes absentes de la projection ${path} : ${missing.join(", ")}`,
        ).toEqual([]);
      });
    }
  });

  describe("sources gardien par littéral typé", () => {
    for (const path of SOURCES_LITERAL) {
      it(`${path} construit les 16 clés`, () => {
        const keys = literalKeys(path);
        const missing = sitterFields.filter((f) => !keys.includes(f));
        expect(
          missing,
          `clés absentes du littéral AffinitySitterInput dans ${path} : ${missing.join(", ")}`,
        ).toEqual([]);
      });
    }
  });

  /* ----------------------- côté propriétaire ----------------------- */

  describe("sources propriétaire par littéral complet", () => {
    for (const [path, marker, petsMode] of OWNER_LITERAL_SOURCES) {
      it(`${path} construit les 11 champs, animaux complets`, () => {
        const src = read(path);
        const keys = blockKeys(objectBlockAfter(src, marker));
        const missing = ownerFields.filter((f) => !keys.has(f));
        expect(
          missing,
          `champs absents du littéral AffinityOwnerInput dans ${path} : ${missing.join(", ")}`,
        ).toEqual([]);
        if (petsMode === "embed") {
          expect(src, `${path} : embed pets incomplet (species, special_needs, breed)`).toMatch(PETS_FULL_EMBED);
        } else {
          const { cols } = projectedColumns(path, ["pets"]);
          const missingPetCols = PETS_TRIPLE.filter((c) => !cols.has(c));
          expect(
            missingPetCols,
            `${path} : projection pets incomplète, manque ${missingPetCols.join(", ")}`,
          ).toEqual([]);
        }
      });
    }
  });

  describe("hook partagé du propriétaire visiteur", () => {
    it(`${VIEWER_OWNER_HOOK} injecte les 5 champs hors table`, () => {
      const src = read(VIEWER_OWNER_HOOK);
      const keys = blockKeys(objectBlockAfter(src, "return {"));
      const missing = OWNER_OFF_TABLE_FIELDS.filter((f) => !keys.has(f));
      expect(
        missing,
        `champs hors table absents du retour de ${VIEWER_OWNER_HOOK} : ${missing.join(", ")}`,
      ).toEqual([]);
    });

    it(`${VIEWER_OWNER_HOOK} projette owner_profiles en entier, properties.car_required et l'embed animaux complet`, () => {
      const src = read(VIEWER_OWNER_HOOK);
      const ownerProj = projectedColumns(VIEWER_OWNER_HOOK, ["owner_profiles"]);
      expect(ownerProj.star, "owner_profiles doit être sélectionné avec select(\"*\")").toBe(true);
      const propProj = projectedColumns(VIEWER_OWNER_HOOK, ["properties"]);
      expect(propProj.cols.has("car_required"), "properties.car_required non projeté").toBe(true);
      expect(src, "embed pets incomplet (species, special_needs, breed)").toMatch(PETS_FULL_EMBED);
    });
  });

  describe("consommateurs du hook propriétaire", () => {
    for (const path of VIEWER_OWNER_CONSUMERS) {
      it(`${path} passe par useViewerOwnerForAffinity, sans requête propriétaire propre`, () => {
        const src = read(path);
        expect(src).toContain("useViewerOwnerForAffinity");
        expect(src).not.toMatch(/\.from\(\s*["'`](?:owner_profiles|public_owner_profiles)["'`]/);
      });
    }

    it("ApplicationsList surcharge le contexte annonce (politiques accompagnants)", () => {
      const src = read("src/components/sits/ApplicationsList.tsx");
      expect(src).toContain("accepts_sitter_pets");
      expect(src).toContain("accepts_sitter_children");
    });
  });

  /* ------ politiques accompagnants : lues depuis l'annonce, jamais null ------ */

  /**
   * Règle produit du 21/08/2026. Toute surface qui dispose d'une annonce
   * dans son périmètre DOIT lire accepts_sitter_pets et
   * accepts_sitter_children depuis cette annonce : ce sont les surfaces où
   * un humain choisit quelqu'un, et le seul motif d'exclusion légitime
   * (incompatibilité déclarée) doit y être visible. Le troisième élément de
   * chaque entrée est la preuve statique de lecture depuis l'annonce.
   */
  const SIT_CONTEXT_SURFACES: Array<[string, RegExp, string]> = [
    ["src/components/sits/ApplicationsList.tsx", /from\("sits"\)\s*\.select\(\s*"accepts_sitter_pets, accepts_sitter_children/, "requête sits dédiée"],
    ["src/components/sits/ApplicationModal.tsx", /from\("sits"\)\s*\.select\(\s*"accepts_sitter_pets, accepts_sitter_children/, "requête sits dédiée"],
    ["src/hooks/useOwnerDashboardData.ts", /sit:sits\([^)]*accepts_sitter_pets[^)]*accepts_sitter_children/, "embed sit des candidatures"],
    ["src/components/dashboard/owner/OwnerStarSection.tsx", /accepts_sitter_pets:\s*app\.sit\?\./, "embed sit de chaque candidature"],
    ["src/components/ai/alma/AlmaFitGardien.tsx", /accepts_sitter_pets:\s*targetSit\.accepts_sitter_pets/, "annonce cible chargée par le composant"],
    ["src/pages/SitDetail.tsx", /accepts_sitter_pets:\s*\(sitData as any\)\?\./, "RPC get_public_sit"],
    ["src/components/sits/PublicSitView.tsx", /accepts_sitter_pets:\s*\(sit as any\)\./, "annonce affichée"],
    ["src/pages/Sits.tsx", /accepts_sitter_pets:\s*sit\.accepts_sitter_pets/, "annonce de la liste"],
    ["src/components/favorites/SitCard.tsx", /accepts_sitter_pets:\s*sit\.accepts_sitter_pets/, "annonce favorite"],
    ["src/hooks/useSitterTopAffinitySits.ts", /accepts_sitter_pets:\s*sit\.accepts_sitter_pets/, "annonce du classement gardien"],
    ["supabase/functions/send-sitter-daily-digest/index.ts", /accepts_sitter_pets:\s*sit\.accepts_sitter_pets/, "annonce du digest"],
  ];

  describe("politiques accompagnants et contexte annonce", () => {
    for (const [path, evidence, label] of SIT_CONTEXT_SURFACES) {
      it(`${path} lit accepts_sitter_* depuis l'annonce (${label})`, () => {
        const src = read(path);
        expect(
          src,
          `${path} : annonce en contexte mais politiques accompagnants non lues depuis celle-ci`,
        ).toMatch(evidence);
        expect(
          /accepts_sitter_(pets|children)\s*:\s*null\b/.test(src),
          `${path} dispose d'une annonce : accepts_sitter_* ne doit jamais être mis à null ici`,
        ).toBe(false);
      });
    }

    it("tout null sur accepts_sitter_* porte un commentaire qui le justifie (surface sans annonce)", () => {
      const offenders: string[] = [];
      for (const base of ["src", "supabase/functions"]) {
        for (const full of walk(resolve(ROOT, base))) {
          const rel = full.slice(ROOT.length + 1).replace(/\\/g, "/");
          const lines = readFileSync(full, "utf8").split("\n");
          lines.forEach((line, i) => {
            if (!/accepts_sitter_(pets|children)\s*:\s*null\b/.test(line)) return;
            const context = lines.slice(Math.max(0, i - 3), i + 1).join("\n");
            if (!context.includes("//") && !context.includes("/*")) {
              offenders.push(`${rel}:${i + 1}`);
            }
          });
        }
      }
      expect(
        offenders,
        `accepts_sitter_* mis à null sans commentaire justificatif :\n${offenders.join("\n")}`,
      ).toEqual([]);
    });
  });

  describe("sources propriétaire par spread (enrichissement hors table)", () => {
    it("ApplicationModal injecte les 5 champs hors table et projette les 6 colonnes + animaux complets", () => {
      const path = "src/components/sits/ApplicationModal.tsx";
      const src = read(path);
      const keys = blockKeys(objectBlockAfter(src, "const ownerInput: AffinityOwnerInput = {"));
      const missing = OWNER_OFF_TABLE_FIELDS.filter((f) => !keys.has(f));
      expect(
        missing,
        `champs hors table absents du ownerInput d'ApplicationModal : ${missing.join(", ")}`,
      ).toEqual([]);
      const proj = projectedColumns(path, ["owner_profiles"]);
      const missingCols = OWNER_TABLE_COLUMNS.filter((c) => !proj.cols.has(c));
      expect(missingCols, `colonnes owner_profiles absentes : ${missingCols.join(", ")}`).toEqual([]);
      const petsProj = projectedColumns(path, ["pets"]);
      const missingPetCols = PETS_TRIPLE.filter((c) => !petsProj.cols.has(c));
      expect(missingPetCols, `projection pets incomplète : ${missingPetCols.join(", ")}`).toEqual([]);
    });

    it("SitDetail enrichit ownerProfile des politiques annonce et de car_required", () => {
      const path = "src/pages/SitDetail.tsx";
      const src = read(path);
      expect(src).toMatch(/setOwnerProfile\(\s*ownerProfileData\s*\?\s*\{/);
      for (const f of ["accepts_sitter_pets", "accepts_sitter_children", "car_required"]) {
        expect(src, `${f} non injecté dans ownerProfile`).toMatch(new RegExp(`${f}:`));
      }
      const ownerProj = projectedColumns(path, ["owner_profiles"]);
      expect(ownerProj.star, "owner_profiles doit être sélectionné avec select(\"*\")").toBe(true);
      // Animaux : la table pets reste en select("*") (toutes colonnes), mais
      // le repli anonyme public_pets doit PROUVER ses colonnes. Un star sur
      // une vue amputée ne prouve rien : special_needs y manquait avant le
      // 20/08/2026, evalSpecialNeeds était muet pour tout visiteur anonyme.
      const petsProj = projectedColumns(path, ["pets"]);
      expect(petsProj.star, "pets doit être sélectionné avec select(\"*\")").toBe(true);
      const publicPetsProj = projectedColumns(path, ["public_pets"]);
      expect(
        publicPetsProj.star,
        "public_pets ne doit pas être sélectionné en select(\"*\") : projection explicite exigée",
      ).toBe(false);
      const missingPublicPetCols = PETS_TRIPLE.filter((c) => !publicPetsProj.cols.has(c));
      expect(
        missingPublicPetCols,
        `projection public_pets incomplète (repli anonyme), manque ${missingPublicPetCols.join(", ")}`,
      ).toEqual([]);
    });

    it("PublicSitterProfile couvre les 10 champs pour AffinitySection", () => {
      const path = "src/pages/PublicSitterProfile.tsx";
      const src = read(path);
      const proj = projectedColumns(path, ["public_owner_profiles"]);
      const missingCols = OWNER_TABLE_COLUMNS.filter((c) => !proj.cols.has(c));
      expect(missingCols, `colonnes public_owner_profiles absentes : ${missingCols.join(", ")}`).toEqual([]);
      expect(src, "accepts_sitter_pets: null explicite attendu (pas de contexte annonce)").toMatch(
        /accepts_sitter_pets:\s*null/,
      );
      expect(src, "accepts_sitter_children: null explicite attendu (pas de contexte annonce)").toMatch(
        /accepts_sitter_children:\s*null/,
      );
      expect(src, "car_required doit être injecté dans targetOwnerAffinity").toMatch(
        /setTargetOwnerAffinity\([\s\S]{0,400}?car_required/,
      );
      expect(src, "embed pets incomplet (species, special_needs, breed)").toMatch(PETS_FULL_EMBED);
    });
  });

  /* --------------------------- transverse --------------------------- */

  describe("relais", () => {
    for (const path of RELAYS) {
      it(`${path} reste un relais, sans requête sitter ni propriétaire propre`, () => {
        const src = read(path);
        expect(
          src.includes("AffinitySitterInput") || src.includes("useAffinityWithShadow"),
          `${path} ne ressemble plus à un relais du moteur`,
        ).toBe(true);
        expect(src).not.toMatch(
          /\.from\(\s*["'`](?:sitter_profiles|sitter_profiles_affinity|owner_profiles|public_owner_profiles)["'`]/,
        );
      });
    }
  });

  it("tout appel direct au moteur (computeAffinityResultFull ou son alias computeAffinityScore) est répertorié", () => {
    const callers: string[] = [];
    for (const base of ["src", "supabase/functions"]) {
      for (const full of walk(resolve(ROOT, base))) {
        const rel = full.slice(ROOT.length + 1).replace(/\\/g, "/");
        if (rel === ENGINE) continue;
        const src = readFileSync(full, "utf8");
        if (/computeAffinityResultFull\s*\(/.test(src) || /computeAffinityScore\s*\(/.test(src)) {
          callers.push(rel);
        }
      }
    }
    const unknown = callers.filter((c) => !REGISTRY.has(c));
    expect(
      unknown,
      `nouveaux appelants du moteur à déclarer dans affinity-input-parity.test.ts : ${unknown.join(", ")}`,
    ).toEqual([]);
  });
});
