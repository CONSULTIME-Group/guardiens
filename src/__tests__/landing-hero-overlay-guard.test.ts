import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const landingSource = fs.readFileSync(
  path.resolve(process.cwd(), "src/pages/Landing.tsx"),
  "utf8",
);

describe("voile du hero de la page d'accueil", () => {
  it("utilise un dégradé Tailwind valide et interdit l'ancienne classe couleur", () => {
    expect(landingSource).toContain("bg-gradient-to-r from-black/95");
    expect(landingSource).not.toContain("bg-hero-overlay");
  });
});