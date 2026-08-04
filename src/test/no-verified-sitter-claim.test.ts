import { describe, it, expect } from "vitest";
import { execSync } from "node:child_process";

/**
 * Garde-fou éditorial, deux blocs.
 *
 * Bloc 1 : la plateforme ne doit jamais affirmer que les gardiens sont vérifiés,
 * que la vérification est obligatoire, qu'elle conditionne quelque chose, ni
 * qu'elle est réalisée à la main. La réalité produit : la vérification est
 * ouverte à tous les membres, la pièce envoyée est analysée automatiquement,
 * les dossiers qui ne passent pas ce premier contrôle sont revus par l'équipe,
 * et les profils validés affichent l'écusson « Identité vérifiée ».
 *
 * Bloc 2 : positionnement national. « AURA », « Auvergne-Rhône-Alpes » et
 * « votre région » sont proscrits du contenu visible.
 *
 * Aucune astuce d'écriture n'est utilisée ici : les littéraux interdits sont
 * écrits en clair, et les fichiers légitimes sont exclus nommément ci-dessous.
 */

const SCAN_PATHS = "src public/llms.txt";

/**
 * Exclusions nommées, bloc 1.
 * - ce fichier de test : il définit la liste d'interdits, il les contient donc.
 * - badge-definitions.ts : « Profil vérifié » est le libellé officiel d'un badge
 *   attribué à un profil qui l'a réellement obtenu, pas une promesse globale.
 * - VerifiedSitterRailCard.tsx / shouldShowVerifiedCard.ts / trustTier.ts :
 *   ces fichiers parlent d'un gardien individuel dont l'identité est réellement
 *   validée, la carte n'est montée que dans ce cas.
 */
const EXCLUDE_CLAIM = [
  "--glob=!src/test/no-verified-sitter-claim.test.ts",
  "--glob=!src/components/badges/badge-definitions.ts",
  "--glob=!src/components/dashboard/sitter/VerifiedSitterRailCard.tsx",
  "--glob=!src/lib/shouldShowVerifiedCard.ts",
  "--glob=!src/lib/trustTier.ts",
];

const FORBIDDEN_CLAIMS = [
  "gardien vérifié",
  "gardiens vérifiés",
  "profils vérifiés",
  "profil vérifié",
  "vérification obligatoire",
  "chaque gardien est vérifié",
  "vérifié avant",
  "jamais par un algorithme",
  "des yeux humains",
  "vérifié manuellement",
  "vérifiés manuellement",
];

/**
 * Exclusions nommées, bloc 2.
 * - ce fichier de test, pour la même raison que ci-dessus.
 * - src/lib/regions.ts : référentiel technique des régions françaises (libellés
 *   officiels utilisés pour normaliser des adresses), jamais du copy marketing.
 * - src/pages/AdminArticles.tsx et src/pages/EditSit.tsx : ces fichiers portent
 *   la regex de vocabulaire proscrit, leur rôle est de définir la liste.
 * - src/lib/__tests__/normalize.test.ts : jeu de test de normalisation
 *   d'adresses, la chaîne y est une donnée d'entrée, pas du contenu affiché.
 * - src/__tests__/sync-index-html-guard.test.ts et jsonld-validation.test.ts :
 *   garde-fous existants qui définissent eux aussi la liste d'interdits.
 */
const EXCLUDE_REGION = [
  "--glob=!src/test/no-verified-sitter-claim.test.ts",
  "--glob=!src/lib/regions.ts",
  "--glob=!src/pages/AdminArticles.tsx",
  "--glob=!src/pages/EditSit.tsx",
  "--glob=!src/lib/__tests__/normalize.test.ts",
  "--glob=!src/__tests__/sync-index-html-guard.test.ts",
  "--glob=!src/__tests__/jsonld-validation.test.ts",
];

function scan(patterns: string[], excludes: string[], caseSensitive = false): string[] {
  const flags = caseSensitive ? "-n -F" : "-n -i -F";
  const args = patterns.map((p) => `-e ${JSON.stringify(p)}`).join(" ");
  try {
    const out = execSync(`rg ${flags} ${args} ${SCAN_PATHS} ${excludes.join(" ")}`, {
      encoding: "utf8",
    });
    return out.split("\n").filter(Boolean);
  } catch (e: unknown) {
    const err = e as { status?: number };
    if (err.status === 1) return []; // aucun match
    throw e;
  }
}

describe("Revendication « gardiens vérifiés »", () => {
  it("n'apparaît nulle part dans src/, public/llms.txt et les locales", () => {
    const hits = scan(FORBIDDEN_CLAIMS, EXCLUDE_CLAIM);
    if (hits.length > 0) {
      throw new Error(
        `${hits.length} revendication(s) de vérification interdite(s).\n` +
          "La vérification d'identité est ouverte à tous les membres, la pièce envoyée est " +
          "analysée automatiquement, les dossiers qui ne passent pas sont revus par l'équipe, " +
          "et les profils validés affichent l'écusson « Identité vérifiée ».\n\n" +
          hits.slice(0, 20).join("\n")
      );
    }
    expect(hits.length).toBe(0);
  });
});

describe("Positionnement national", () => {
  it("ne mentionne ni AURA, ni Auvergne-Rhône-Alpes, ni « votre région »", () => {
    const hits = [
      ...scan(["AURA"], EXCLUDE_REGION, true),
      ...scan(["Auvergne-Rhône-Alpes", "votre région"], EXCLUDE_REGION),
    ];
    if (hits.length > 0) {
      throw new Error(
        `${hits.length} mention(s) régionale(s) proscrite(s). La couverture est nationale, ` +
          "utiliser « près de chez vous » ou « France entière ».\n\n" +
          hits.slice(0, 20).join("\n")
      );
    }
    expect(hits.length).toBe(0);
  });
});
