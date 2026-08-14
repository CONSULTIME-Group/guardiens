import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

/**
 * Garde-fou performance : un avatar ne doit JAMAIS être servi via l'endpoint
 * objet brut (/storage/v1/object/public/avatars/) sans transformation.
 * Cas mesuré en production (14/08/2026) : 8,8 Mo pour un rendu de 34 px.
 *
 * Deux mécanismes couvrent les rendus :
 *  - AvatarImage (composant partagé, ui/avatar.tsx) transforme via
 *    storageImageUrl avec un displaySize par défaut de 96 px ;
 *  - les <img> directs passent par avatarImageUrl / storageImageUrl avec la
 *    taille réelle du cadre.
 *
 * Règle transverse (passe corrective du 14/08/2026) : tout appel
 * storageImageUrl doit fournir width ET height. L'endpoint conserve la
 * hauteur d'origine quand seule la largeur est demandée, l'image servie
 * est alors déformée. Aucune exception.
 */

const SRC = "src";
const TRANSFORM_CALL = /\b(avatarImageUrl|storageImageUrl)\s*\(/;

function collect(dir: string, out: string[] = []): string[] {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "__tests__") continue;
      collect(p, out);
    } else if (/\.tsx?$/.test(p) && !/\.test\.tsx?$/.test(p)) {
      out.push(p);
    }
  }
  return out;
}

/**
 * Extrait le contenu entre parenthèses d'un appel, en comptant la
 * profondeur pour traverser les parenthèses imbriquées (Math.round, etc.).
 * `openIndex` pointe sur la parenthèse ouvrante.
 */
function extractCallArgs(source: string, openIndex: number): string {
  let depth = 0;
  for (let i = openIndex; i < source.length; i++) {
    const ch = source[i];
    if (ch === "(") depth++;
    else if (ch === ")") {
      depth--;
      if (depth === 0) return source.slice(openIndex, i);
    }
  }
  return source.slice(openIndex, openIndex + 400);
}

describe("avatar image optimization", () => {
  it("le composant partagé AvatarImage transforme via storageImageUrl", () => {
    const source = fs.readFileSync("src/components/ui/avatar.tsx", "utf8");
    expect(source).toMatch(
      /import \{[^}]*storageImageUrl[^}]*\} from "@\/lib\/storageImage"/,
    );
    expect(source).toMatch(/storageImageUrl\(/);
  });

  it("aucun <img> d'avatar ne sert d'URL brute sans transformation", () => {
    const offenders: string[] = [];
    for (const file of collect(SRC)) {
      const source = fs.readFileSync(file, "utf8");
      const tags = source.match(/<img\b[\s\S]*?\/>/g) || [];
      tags.forEach((tag, idx) => {
        if (!/avatar/i.test(tag)) return;
        if (TRANSFORM_CALL.test(tag)) return;
        offenders.push(`${file} (balise img n°${idx + 1})`);
      });
    }
    expect(offenders).toEqual([]);
  });

  it("aucune URL /object/public/avatars/ en dur dans le code de rendu", () => {
    const offenders: string[] = [];
    for (const file of collect(SRC)) {
      const source = fs.readFileSync(file, "utf8");
      if (source.includes("/object/public/avatars/")) offenders.push(file);
    }
    expect(offenders).toEqual([]);
  });

  it("les trois chemins d'upload d'avatar plafonnent via compressAvatarFile", () => {
    const compress = fs.readFileSync("src/lib/compressImage.ts", "utf8");
    expect(compress).toMatch(/export async function compressAvatarFile/);
    expect(compress).toMatch(/AVATAR_MAX_DIMENSION = 1024/);
    for (const file of [
      "src/hooks/useSitterProfile.ts",
      "src/hooks/useOwnerProfile.ts",
      "src/components/onboarding/OnboardingModal.tsx",
    ]) {
      const source = fs.readFileSync(file, "utf8");
      expect(source, file).toMatch(/compressAvatarFile\(/);
    }
  });

  it("aucun appel storageImageUrl avec width sans height, quel que soit le sujet", () => {
    // Exceptions explicites, une entrée par rendu justifié. Vide à ce jour :
    // width sans height déforme l'image servie, aucun cas n'est acceptable.
    const WIDTH_ONLY_EXCEPTIONS: string[] = [];
    const offenders: string[] = [];
    for (const file of collect(SRC)) {
      const source = fs.readFileSync(file, "utf8");
      let idx = source.indexOf("storageImageUrl(");
      while (idx !== -1) {
        const args = extractCallArgs(source, idx + "storageImageUrl".length);
        if (/\bwidth\s*:/.test(args) && !/\bheight\s*:/.test(args)) {
          const id = `${file} (caractère ${idx})`;
          if (!WIDTH_ONLY_EXCEPTIONS.some((e) => id.startsWith(e))) {
            offenders.push(id);
          }
        }
        idx = source.indexOf("storageImageUrl(", idx + 1);
      }
    }
    expect(offenders).toEqual([]);
  });
});
