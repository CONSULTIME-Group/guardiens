import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";

/**
 * D3 : la bascule « Je vis à l'étranger » ne doit jamais écrire country = "".
 * NULL ou code pays réel uniquement, sinon le score client (chaîne vide ≠ FR)
 * diverge du score serveur (COALESCE(NULL,'FR')).
 */
describe("D3 : country jamais chaîne vide", () => {
  const fields = readFileSync("src/components/profile/PostalCodeCityFields.tsx", "utf8");
  const sitterHook = readFileSync("src/hooks/useSitterProfile.ts", "utf8");
  const ownerHook = readFileSync("src/hooks/useOwnerProfile.ts", "utf8");

  it("le composant n'écrit jamais country = \"\"", () => {
    expect(fields).not.toMatch(/country:\s*""/);
    expect(fields).toMatch(/country:\s*country\s*&&\s*country\s*!==\s*"FR"\s*\?\s*country\s*:\s*null/);
  });

  it("la chaîne vide héritée est traitée comme France (même règle que le serveur)", () => {
    expect(fields).toContain('country || "FR"');
  });

  it("les deux hooks acceptent null et assainissent à l'enregistrement", () => {
    for (const hook of [sitterHook, ownerHook]) {
      expect(hook).toContain("country: string | null;");
      expect(hook).toMatch(/trim\(\)\s*\|\|\s*null/);
    }
  });
});
