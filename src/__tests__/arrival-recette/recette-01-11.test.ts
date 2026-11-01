import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const src = (p: string) => readFileSync(resolve(__dirname, "../../..", p), "utf8");

describe("Recette du parcours d'arrivée v2, 01/11/2026", () => {
  it("l'inscription passe des clés arrival.*, traduites par l'en-tête C2 une fois les textes chargés", () => {
    const register = src("src/pages/Register.tsx");
    expect(register).toMatch(/"arrival\.c1\.owner_title"/);
    expect(register).not.toMatch(/t\("arrival\.c1\.owner_title"\)/);
    const parts = src("src/components/arrival/RegisterArrivalParts.tsx");
    expect(parts).toMatch(/recap\.startsWith\("arrival\."\) \? t\(recap\) : recap/);
  });

  it("P2 relit le profil à jour : l'encart de proximité voit la commune écrite en P1", () => {
    expect(src("src/pages/arrival/ArriveeDepart.tsx")).toMatch(/fetchMyProfile\(user\.id, \{ fresh: true \}\)/);
  });
});
