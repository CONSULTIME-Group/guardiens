/**
 * Lot PROX1 (29/10/2026) : « Des annonces à proximité » ne montre que des
 * annonces proches, et le titre dit le palier réellement utilisé.
 * Retour de Laurence : « dans le coin c'est le département à côté, à 700 kms ».
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { pickNearby, NEARBY_TITLES } from "@/components/sits/NearbySitsModule";

const s = (id: string) => ({ id });

describe("paliers", () => {
  it("la ville d'abord, complétée par le département", () => {
    const r = pickNearby({ city: [s("a")], dept: [s("a"), s("b"), s("c"), s("d")] });
    expect(r.sits.map((x) => x.id)).toEqual(["a", "b", "c"]);
    expect(r.tier).toBe("dept");
  });

  it("trois annonces dans la ville : le titre reste local", () => {
    const r = pickNearby({ city: [s("a"), s("b"), s("c")], france: [s("z")] });
    expect(r.tier).toBe("city");
    expect(NEARBY_TITLES[r.tier!]).toBe("Des annonces à proximité");
  });

  it("rien de proche : le titre dit la France, jamais la proximité", () => {
    const r = pickNearby({ city: [], dept: [], region: [], france: [s("x"), s("y")] });
    expect(r.tier).toBe("france");
    expect(NEARBY_TITLES.france).toBe("D'autres annonces ouvertes en France");
  });

  it("une annonce de la région suffit à passer le titre en région", () => {
    const r = pickNearby({ dept: [s("a"), s("b")], region: [s("c")] });
    expect(r.tier).toBe("region");
    expect(NEARBY_TITLES.region).toBe("Des annonces dans la région");
  });

  it("l'annonce consultée n'apparaît jamais", () => {
    const r = pickNearby({ city: [s("courante"), s("a")] }, "courante");
    expect(r.sits.map((x) => x.id)).toEqual(["a"]);
  });

  it("aucune annonce : aucun palier, le module se masque", () => {
    expect(pickNearby({}).tier).toBeNull();
  });
});

describe("lectures", () => {
  const src = readFileSync(resolve(process.cwd(), "src/components/sits/NearbySitsModule.tsx"), "utf8");
  const page = readFileSync(resolve(process.cwd(), "src/pages/PublicSitDetail.tsx"), "utf8");

  it("règle unique des annonces ouvertes", () => {
    expect(src).toMatch(/applyOpenSitFilter\(/);
  });
  it("département et région filtrés côté serveur", () => {
    expect(src).toMatch(/\.eq\("departement_code", dept\)/);
    expect(src).toMatch(/\.in\("departement_code", getDeptsInRegion\(regionCode\)\)/);
  });
  it("le dernier palier ne garde que la France", () => {
    expect(src).toMatch(/isFranceSit\(s\)/);
  });
  it("plus aucun titre « près de chez vous » codé en dur", () => {
    expect(src).not.toMatch(/>Des annonces près de chez vous</);
  });
  it("la fiche passe le département du propriétaire, France seulement", () => {
    expect(page).toMatch(/departementCode=\{ownerCountry === "FR" \? deptCodeFromPostal\(/);
  });
});
