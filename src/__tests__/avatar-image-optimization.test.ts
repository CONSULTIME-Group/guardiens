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
    } else if (/\.tsx$/.test(p) && !/\.test\.tsx$/.test(p)) {
      out.push(p);
    }
  }
  return out;
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
});
