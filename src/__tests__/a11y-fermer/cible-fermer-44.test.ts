/**
 * Réaudit du 08/11/2026 (captures 360 px du lot PHOTO1) : le bouton « Fermer »
 * des fenêtres et des feuilles du bas mesurait 16 × 16 px, sous la cible
 * tactile de 44 px. Il passe à 44 × 44, icône inchangée.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";

describe("bouton Fermer à 44 px", () => {
  for (const f of ["src/components/ui/dialog.tsx", "src/components/ui/sheet.tsx"]) {
    it(f, () => {
      const s = readFileSync(f, "utf8");
      expect(s).toContain("absolute right-1.5 top-1.5 flex h-11 w-11 items-center justify-center rounded-full");
      expect(s).not.toContain("absolute right-4 top-4 rounded-sm");
    });
  }
});
