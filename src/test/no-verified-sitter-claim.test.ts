import { describe, it, expect } from "vitest";
import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";

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

const SCAN_PATHS = ["src", "src/data", "public/llms.txt", "index.html"];

/**
 * Exclusions nommées, bloc 1.
 * - ce fichier de test : il définit la liste d'interdits, il les contient donc.
 * - badge-definitions.ts : « Profil vérifié » est le libellé officiel d'un badge
 *   attribué à un profil qui l'a réellement obtenu, pas une promesse globale.
 * - VerifiedSitterRailCard.tsx / shouldShowVerifiedCard.ts / trustTier.ts :
 *   ces fichiers parlent d'un gardien individuel dont l'identité est réellement
 *   validée, la carte n'est montée que dans ce cas.
 * - ProsListing.tsx : le contrôle manuel concerne le SIRET des professionnels,
 *   pas la vérification d'identité des gardiens.
 * - SitDraftFromPrompt.tsx : « vérifier manuellement » décrit la relecture d'un
 *   brouillon, sans rapport avec l'identité ou le statut d'un membre.
 */
const EXCLUDE_CLAIM = new Set([
  "src/test/no-verified-sitter-claim.test.ts",
  "src/components/badges/badge-definitions.ts",
  "src/components/dashboard/sitter/VerifiedSitterRailCard.tsx",
  "src/lib/shouldShowVerifiedCard.ts",
  "src/lib/trustTier.ts",
  "src/pages/ProsListing.tsx",
  "src/components/dashboard/SitDraftFromPrompt.tsx",
]);

const FORBIDDEN_CLAIMS: RegExp[] = [
  /(vérifi|contrôl)\w*\s+(manuelle?ment|à la main)/i,
  /vérification\s+d'identité\s+manuelle/i,
  /gardiens?\s+(sont\s+|est\s+)?vérifiés?\b/i,
  /profils?\s+vérifiés?\b/i,
  /vérification\s+obligatoire/i,
  /jamais\s+par\s+un\s+algorithme/i,
  /des\s+yeux\s+humains/i,
  /chaque\s+(gardien|membre|profil)\s+(est|passe|doit)\b[^.]{0,40}vérifi/i,
];

/**
 * Exceptions lexicales exactes : ce sont les noms propres des écussons.
 * Seules les chaînes entre guillemets « Identité vérifiée » et « ID vérifiée »
 * sont retirées avant le scan. Les mêmes mots hors guillemets restent contrôlés.
 */
function removeAllowedBadgeNames(source: string): string {
  return source
    .split("« Identité vérifiée »").join("")
    .split('"Identité vérifiée"').join("")
    .split("« ID vérifiée »").join("")
    .split('"ID vérifiée"').join("");
}

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
const EXCLUDE_REGION = new Set([
  "src/test/no-verified-sitter-claim.test.ts",
  "src/lib/regions.ts",
  "src/pages/AdminArticles.tsx",
  "src/pages/EditSit.tsx",
  "src/lib/__tests__/normalize.test.ts",
  "src/__tests__/sync-index-html-guard.test.ts",
  "src/__tests__/jsonld-validation.test.ts",
]);

function scannedFiles(): string[] {
  const output = execSync(`rg --files ${SCAN_PATHS.join(" ")}`, { encoding: "utf8" });
  return [...new Set(output.split("\n").filter(Boolean))];
}

function scan(patterns: RegExp[], excludes: Set<string>, allowBadgeNames = false): string[] {
  const hits: string[] = [];
  for (const file of scannedFiles()) {
    if (excludes.has(file)) continue;
    const raw = readFileSync(file, "utf8");
    const source = allowBadgeNames ? removeAllowedBadgeNames(raw) : raw;
    source.split("\n").forEach((line, index) => {
      if (patterns.some((pattern) => pattern.test(line))) {
        hits.push(`${file}:${index + 1}:${line.trim()}`);
      }
    });
  }
  return hits;
}

describe("Revendication « gardiens vérifiés »", () => {
  it("n'apparaît nulle part dans src/, public/llms.txt et les locales", () => {
    const hits = scan(FORBIDDEN_CLAIMS, EXCLUDE_CLAIM, true);
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
      ...scan([/\bAURA\b/], EXCLUDE_REGION),
      ...scan([/Auvergne-Rhône-Alpes/i, /votre région/i], EXCLUDE_REGION),
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
