/**
 * SYMÉTRIE FICHES PUBLIQUES / MOTEUR (décision de Jérémie, 23/08/2026).
 *
 * Le constat fondateur : le propriétaire exposait six de ses entrées scorées
 * sur sa fiche publique, le gardien aucun de ses champs les plus lourds
 * (`work_during_sit`, poids 2). Un propriétaire lisait un score de 78 % et
 * une chip « Télétravaille, donc présent en journée » sans pouvoir vérifier
 * ni l'un ni l'autre. Sur une plateforme où c'est le propriétaire qui décide
 * qui entre chez lui, la transparence ne peut pas être à sens unique.
 *
 * Ce test verrouille la règle DANS LES DEUX SENS, pour les deux rôles :
 *
 * 1. Sens moteur -> fiche : tout champ de `AffinitySitterInput` /
 *    `AffinityOwnerInput` lu par le moteur est présent dans la vue publique
 *    correspondante, SAUF s'il figure dans `ENGINE_NOT_PUBLIC_FIELDS` avec
 *    une justification (aujourd'hui : `sensitivities`, donnée de santé,
 *    signalée au propriétaire par le frein du moteur à la candidature).
 *
 * 2. Sens fiche -> moteur : toute colonne de la vue publique est soit un
 *    champ scoré, soit une colonne déclarée descriptive dans
 *    `SITTER_PUBLIC_DESCRIPTIVE_COLUMNS` / `OWNER_PUBLIC_DESCRIPTIVE_COLUMNS`
 *    (ex : `accompanied_by` détaille le booléen scoré
 *    `travels_with_children`). Une colonne ni scorée ni déclarée = oubli.
 *
 * 3. `vehicle_type` (champ mort, 3/1037, jamais scoré) ne revient pas.
 *
 * La source de vérité des colonnes est `src/integrations/supabase/types.ts`
 * (régénéré à chaque migration) : ajouter demain un critère au moteur sans
 * l'exposer, ou retirer un champ de la vue, casse le build au lieu de
 * recréer silencieusement l'asymétrie.
 */
import { describe, it, expect } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import {
  ENGINE_NOT_PUBLIC_FIELDS,
  SITTER_PUBLIC_DESCRIPTIVE_COLUMNS,
  OWNER_PUBLIC_DESCRIPTIVE_COLUMNS,
} from "@/lib/affinityVocab";

const ROOT = path.resolve(__dirname, "../../..");
const scoreTs = fs.readFileSync(
  path.join(ROOT, "supabase/functions/_shared/affinity/score.ts"),
  "utf8",
);
const typesTs = fs.readFileSync(
  path.join(ROOT, "src/integrations/supabase/types.ts"),
  "utf8",
);

/** Champs d'une interface du moteur, parsés depuis score.ts. */
function interfaceFields(name: string): string[] {
  const re = new RegExp(`export interface ${name} \\{([\\s\\S]*?)\\n\\}`);
  const m = scoreTs.match(re);
  if (!m) throw new Error(`Interface ${name} introuvable dans score.ts`);
  return [...m[1].matchAll(/^\s*(\w+)\??:/gm)].map((x) => x[1]);
}

/** Colonnes du Row d'une vue, parsées depuis les types régénérés. */
function viewColumns(view: string): string[] {
  const i = typesTs.indexOf(`${view}: {`);
  if (i < 0) throw new Error(`Vue ${view} introuvable dans types.ts`);
  const r = typesTs.indexOf("Row: {", i);
  const end = typesTs.indexOf("Relationships:", r);
  if (r < 0 || end < 0) throw new Error(`Row de ${view} introuvable`);
  const body = typesTs.slice(r + "Row: {".length, end);
  return [...body.matchAll(/^\s*(\w+):/gm)].map((x) => x[1]);
}

const SITTER_FIELDS = interfaceFields("AffinitySitterInput");
const OWNER_FIELDS = interfaceFields("AffinityOwnerInput");
const SITTER_VIEW = viewColumns("public_sitter_profiles");
const OWNER_VIEW = viewColumns("public_owner_profiles");

/**
 * Entrées propriétaire du moteur qui ne vivent PAS dans la table
 * owner_profiles : elles ne peuvent donc pas être attendues dans la vue.
 * Chacune est justifiée, la liste est verrouillée par le test de complétude
 * ci-dessous (OFF_TABLE + côté table = interface entière).
 */
const OWNER_OFF_TABLE_FIELDS = [
  "pets", // construit depuis la table pets (vue public_pets)
  "accepts_sitter_pets", // lu depuis l'annonce (sits)
  "accepts_sitter_children", // lu depuis l'annonce (sits)
  "car_required", // lu depuis properties
  "distance_km", // injecté par chaque surface appelante (règle 14)
] as const;

const SITTER_NOT_PUBLIC = Object.keys(ENGINE_NOT_PUBLIC_FIELDS.sitter);
const OWNER_TABLE_FIELDS = OWNER_FIELDS.filter(
  (f) => !(OWNER_OFF_TABLE_FIELDS as readonly string[]).includes(f),
);

describe("Symétrie fiches publiques / moteur d'affinité", () => {
  it("sitter : tout champ scoré est exposé, sauf exclusion justifiée", () => {
    for (const f of SITTER_FIELDS) {
      if (SITTER_NOT_PUBLIC.includes(f)) continue;
      expect(
        SITTER_VIEW,
        `Champ scoré absent de public_sitter_profiles : ${f}. ` +
          `Ajoutez-le à la vue ou justifiez l'exclusion dans ENGINE_NOT_PUBLIC_FIELDS.`,
      ).toContain(f);
    }
  });

  it("sitter : toute colonne exposée est scorée ou déclarée descriptive", () => {
    const allowed = new Set([
      ...SITTER_FIELDS,
      ...SITTER_PUBLIC_DESCRIPTIVE_COLUMNS,
      "user_id",
    ]);
    for (const c of SITTER_VIEW) {
      expect(
        allowed.has(c),
        `Colonne ni scorée ni déclarée descriptive dans public_sitter_profiles : ${c}. ` +
          `Si c'est un choix, déclarez-la dans SITTER_PUBLIC_DESCRIPTIVE_COLUMNS.`,
      ).toBe(true);
    }
  });

  it("sitter : sensitivities (donnée de santé) n'est JAMAIS exposé", () => {
    expect(SITTER_VIEW).not.toContain("sensitivities");
    expect(SITTER_NOT_PUBLIC).toContain("sensitivities");
    // L'exclusion reste justifiée : une justification vide casse le build.
    for (const justification of Object.values(ENGINE_NOT_PUBLIC_FIELDS.sitter)) {
      expect(justification.length).toBeGreaterThan(20);
    }
  });

  it("owner : la répartition table / hors-table couvre toute l'interface", () => {
    expect(
      [...OWNER_TABLE_FIELDS, ...OWNER_OFF_TABLE_FIELDS].sort(),
    ).toEqual([...OWNER_FIELDS].sort());
  });

  it("owner : tout champ scoré côté table est exposé", () => {
    for (const f of OWNER_TABLE_FIELDS) {
      expect(
        OWNER_VIEW,
        `Champ scoré absent de public_owner_profiles : ${f}`,
      ).toContain(f);
    }
  });

  it("owner : toute colonne exposée est scorée ou déclarée descriptive", () => {
    const allowed = new Set([
      ...OWNER_TABLE_FIELDS,
      ...OWNER_PUBLIC_DESCRIPTIVE_COLUMNS,
      "user_id",
    ]);
    for (const c of OWNER_VIEW) {
      expect(
        allowed.has(c),
        `Colonne ni scorée ni déclarée descriptive dans public_owner_profiles : ${c}. ` +
          `Si c'est un choix, déclarez-la dans OWNER_PUBLIC_DESCRIPTIVE_COLUMNS.`,
      ).toBe(true);
    }
  });

  it("vehicle_type (champ mort) n'est exposé dans aucune des deux vues", () => {
    expect(SITTER_VIEW).not.toContain("vehicle_type");
    expect(OWNER_VIEW).not.toContain("vehicle_type");
  });

  it("la fiche publique gardien ne sélectionne que des colonnes de la vue", () => {
    const page = fs.readFileSync(
      path.join(ROOT, "src/pages/PublicSitterProfile.tsx"),
      "utf8",
    );
    // Toutes les occurrences : la page déclare la liste des colonnes à
    // plusieurs endroits (fetch principal, rafraîchissements).
    const matches = [
      ...page.matchAll(/PUBLIC_SITTER_COLS\s*=\s*\n?\s*"([^"]+)"/g),
    ];
    expect(matches.length, "PUBLIC_SITTER_COLS introuvable").toBeGreaterThan(0);
    for (const m of matches) {
      const cols = m[1].split(",").map((s) => s.trim());
      for (const c of cols) {
        expect(
          SITTER_VIEW,
          `PUBLIC_SITTER_COLS demande ${c}, absent de la vue : 400 assuré.`,
        ).toContain(c);
      }
    }
  });
});
