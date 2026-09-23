import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

describe("lien de création du profil gardien dans le hero", () => {
  it("est réservé aux visiteurs", () => {
    const source = readFileSync("src/pages/Landing.tsx", "utf8");
    expect(source).toContain('{!isAuthenticated && <Link to="/inscription?role=sitter"');
    expect(source).toContain("Vous voulez garder ? Créez votre profil.");
  });
});