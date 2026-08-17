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
 * Bloc 3 : le nom de l'écusson « Identité vérifiée » ne doit pas figurer dans
 * une énumération de promesses produit (hero, bandeau de réassurance), où il
 * se lirait comme une garantie générale sur tous les profils.
 *
 * Aucune astuce d'écriture n'est utilisée ici : les littéraux interdits sont
 * écrits en clair, et les fichiers légitimes sont exclus nommément ci-dessous.
 */

// « src » couvre déjà src/data et src/i18n/locales (fichiers .json inclus,
// `rg --files` ne filtre pas par extension).
const SCAN_PATHS = ["src", "public/llms.txt", "index.html"];

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
 * - AdminUsers.tsx : écran d'administration interne. La « vérification manuelle »
 *   y désigne l'action réelle d'un admin qui valide un dossier à la main, et le
 *   texte n'est jamais montré à un membre.
 */
const EXCLUDE_CLAIM = new Set([
  "src/test/no-verified-sitter-claim.test.ts",
  "src/components/badges/badge-definitions.ts",
  "src/components/dashboard/sitter/VerifiedSitterRailCard.tsx",
  "src/lib/shouldShowVerifiedCard.ts",
  "src/lib/trustTier.ts",
  "src/pages/ProsListing.tsx",
  "src/components/dashboard/SitDraftFromPrompt.tsx",
  "src/pages/admin/AdminUsers.tsx",
]);

/**
 * Motifs de la revendication interdite.
 *
 * Règles techniques, apprises d'un faux vert :
 * - flag `u` obligatoire, le contenu est accentué ;
 * - `\p{L}` au lieu de `\w`, qui ne couvre que l'ASCII et laissait passer
 *   « contrôlées manuellement » (le `é` cassait `\w*\s+`) ;
 * - `(?!\p{L})` au lieu de `\b` en fin de motif accentué, sinon le singulier
 *   « vérifié » échappait faute de frontière ASCII ;
 * - tolérance d'un à deux mots intercalés (`(?:\S+\s+){0,2}`) pour attraper
 *   « gardiens rigoureusement vérifiés » ou « gardiens sont tous vérifiés ».
 */
export const FORBIDDEN_CLAIMS: RegExp[] = [
  /(?:vérifi|contrôl)\p{L}*\s+(?:\S+\s+){0,2}(?:manuelle?ment|à\s+la\s+main)/iu,
  /(?:vérification|contrôle)\s+(?:\S+\s+){0,2}manuel(?:le)?s?(?!\p{L})/iu,
  /gardiens?\s+(?:\S+\s+){0,2}vérifiés?(?!\p{L})/iu,
  /profils?\s+(?:\S+\s+){0,2}vérifiés?(?!\p{L})/iu,
  /vérification\s+obligatoire/iu,
  /jamais\s+par\s+un\s+algorithme/iu,
  /des\s+yeux\s+humains/iu,
  /chaque\s+(?:gardien|membre|profil)\s+[^.]{0,40}vérifi/iu,
];

/**
 * Exceptions lexicales exactes : ce sont les noms propres des écussons.
 * Seules les chaînes entre guillemets « Identité vérifiée » et « ID vérifiée »
 * sont retirées avant le scan. Les mêmes mots hors guillemets restent contrôlés.
 */
export function removeAllowedBadgeNames(source: string): string {
  return source
    .split("« Identité vérifiée »").join("")
    .split('"Identité vérifiée"').join("")
    .split("« ID vérifiée »").join("")
    .split('"ID vérifiée"').join("");
}

/**
 * Bloc 3 : énumérations de promesses.
 *
 * « Identité vérifiée » est le nom d'un écusson attribué à un profil qui l'a
 * réellement obtenu. Dans une énumération de promesses produit (hero, bandeau
 * de réassurance), ce nom se lit comme une garantie générale sur tous les
 * profils : c'est faux, la vérification est un choix du membre.
 *
 * Le motif est volontairement étroit, trois conditions cumulatives :
 * - casse exacte du nom propre « Identité vérifiée » : les formes descriptives
 *   en minuscules (« l'identité vérifiée » du Trust Score, listes de
 *   conditions d'éligibilité) ne sont pas visées ;
 * - virgule adjacente à l'intérieur de la chaîne : les libellés autonomes
 *   (`label: "Identité vérifiée"`) sont déjà retirés par
 *   removeAllowedBadgeNames, et une virgule JSON après le guillemet fermant ne
 *   crée pas l'adjacence ;
 * - la ligne ne mentionne ni « écusson » ni « badge » : une énumération de
 *   noms d'écussons en prose (Observatoire) reste légitime.
 *
 * Trous connus et assumés (tests ignorés en bas de fichier) :
 * - une pastille autonome `label: "Identité vérifiée"` dans un bandeau
 *   marketing est textuellement identique aux libellés légitimes (checklist
 *   d'éligibilité, statut de compte) : aucun motif fiable ne les distingue ;
 * - la forme minuscule nue (« par affinité, identité vérifiée, avis croisés »,
 *   corrigée dans HomeJsonLd le 17/08/2026) : un motif insensible à la casse
 *   frapperait aussi les listes de conditions (« 0 annulation, identité
 *   vérifiée. ») et les descriptions du Trust Score.
 */
const PROMISE_ENUM_PATTERNS: RegExp[] = [
  /Identité vérifiée\s*,/,
  /,\s*Identité vérifiée/,
];

const BADGE_CONTEXT_LINE = /écussons?|badges?/i;

export function isPromiseEnumeration(line: string): boolean {
  if (BADGE_CONTEXT_LINE.test(line)) return false;
  const stripped = removeAllowedBadgeNames(line);
  return PROMISE_ENUM_PATTERNS.some((pattern) => pattern.test(stripped));
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

/**
 * Inventaire (`rg --files`) et contenus lus UNE fois au chargement du
 * module, donc pendant la phase de collecte Vitest, hors testTimeout.
 * Avant ce cache, chaque `it` relançait l'inventaire + la lecture de
 * ~1500 fichiers ; sous la charge I/O du run complet, un scan dépassait
 * le délai de 5 s et mourrait sur « Test timed out in 5000ms » (constaté
 * le 17/08/2026, runs complets). Le verdict du scan n'a jamais varié,
 * seule sa durée : c'est la cause racine des timeouts, pas le pattern.
 */
const FILE_CONTENTS: { file: string; raw: string }[] = scannedFiles().map((file) => ({
  file,
  raw: readFileSync(file, "utf8"),
}));

function scan(patterns: RegExp[], excludes: Set<string>, allowBadgeNames = false): string[] {
  const hits: string[] = [];
  for (const { file, raw } of FILE_CONTENTS) {
    if (excludes.has(file)) continue;
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

/**
 * Tests du garde-fou lui-même. Sans eux, un motif qui ne matche rien reste vert.
 */
const MUST_DETECT: string[] = [
  "Les pièces d'identité soumises sont contrôlées manuellement par l'équipe Guardiens",
  "Un gardien vérifié vous attend.",
  "Un profil vérifié",
  "gardiens rigoureusement vérifiés",
  "Nos gardiens sont tous vérifiés",
  "Contrôle manuel par notre équipe",
  "profils vérifiés et notés",
  "Tous nos gardiens sont vérifiés.",
  "Vérification SIRET manuelle par notre équipe",
  "Chaque pièce d'identité est vérifiée à la main",
  "chaque gardien est vérifié avant publication",
];

const MUST_NOT_DETECT: string[] = [
  "Les profils validés affichent l'écusson « Identité vérifiée ».",
  "Vous envoyez une pièce d'identité, elle est analysée automatiquement.",
  "Comment fonctionne la vérification d'identité à Lyon ?",
  "Les justificatifs SIRET sont analysés automatiquement.",
];

function isDetected(text: string): boolean {
  const source = removeAllowedBadgeNames(text);
  return FORBIDDEN_CLAIMS.some((pattern) => pattern.test(source));
}

describe("Motifs du garde-fou", () => {
  it.each(MUST_DETECT)("détecte : %s", (text) => {
    expect(isDetected(text)).toBe(true);
  });

  it.each(MUST_NOT_DETECT)("laisse passer : %s", (text) => {
    expect(isDetected(text)).toBe(false);
  });

  it("protège le nom de l'écusson entre guillemets", () => {
    expect(isDetected("Gardien porteur de « Identité vérifiée »")).toBe(false);
  });

  it("ne neutralise pas une violation voisine du nom de l'écusson", () => {
    expect(
      isDetected("Tous nos gardiens sont vérifiés. Écusson « Identité vérifiée ».")
    ).toBe(true);
  });
});
