import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const landingSource = fs.readFileSync(
  path.resolve(process.cwd(), "src/pages/Landing.tsx"),
  "utf8",
);

describe("voile du hero de la page d'accueil", () => {
  it("garde un voile sombre sous le texte, sur téléphone comme sur ordinateur (lot HOME1)", () => {
    // Téléphone : du haut vers le bas. Ordinateur : de gauche à droite.
    expect(landingSource).toContain("bg-gradient-to-b from-black/80 via-black/60 via-45% to-black/25");
    expect(landingSource).toContain("bg-gradient-to-r from-black/95 via-black/75 via-45% to-black/25");
    expect(landingSource).not.toContain("bg-hero-overlay");
  });
});
