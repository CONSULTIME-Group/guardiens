/**
 * Lot META4 (08/11/2026) : un profil sans ville mais avec un code postal
 * reçoit le nom de la commune où le lot G1 le situe déjà. Constat : l'annonce
 * de la membre au code postal 69380 sortait dans Google en « … à 69380, Rhône ».
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { pickOfficialCommune } from "../../../supabase/functions/_shared/geocode-official-fr";

const fn = readFileSync("supabase/functions/geocode-profile/index.ts", "utf8");
const migration = readFileSync("drizzle/migrations/0118_meta4_ville_depuis_code_postal.sql", "utf8");

describe("geocode-profile écrit la ville d'un profil situé par son code postal", () => {
  it("la commune officielle retenue devient la ville", () => {
    expect(fn).toMatch(/cityFromPostal = official\?\.nom\?\.trim\(\) \|\| null/);
    expect(fn).toMatch(/writePlace\(supabase, user_id, coords, null, cityFromPostal\)/);
  });
  it("une ville saisie n'est jamais remplacée", () => {
    expect(fn).toMatch(/\.or\("city\.is\.null,city\.eq\."\)/);
  });
  it("la commune officielle porte un nom", () => {
    const row = pickOfficialCommune(
      [
        { nom: "Lozanne", centre: { type: "Point", coordinates: [4.68, 45.85] }, population: 2600 },
        { nom: "Chazay-d'Azergues", centre: { type: "Point", coordinates: [4.71, 45.874] }, population: 4100 },
      ] as never,
      "69380",
      true,
    );
    expect(row?.nom).toBe("Chazay-d'Azergues");
  });
});

describe("reprise unique 0118", () => {
  it("ne remplace jamais une ville saisie et vérifie le code postal", () => {
    expect(migration).toMatch(/AND \(p\.city IS NULL OR trim\(p\.city\) = ''\)/);
    expect(migration).toMatch(/AND trim\(p\.postal_code\) = v\.postal_code/);
  });
  it("reprend la membre du 69380 avec Chazay-d'Azergues", () => {
    expect(migration).toContain("('9a405163-afe3-4767-b40c-5c0a18c75d07'::uuid, '69380', 'Chazay-d''Azergues')");
  });
  it("aucun tiret long dans les commentaires", () => {
    expect(migration).not.toMatch(/[–—]/);
  });
});
