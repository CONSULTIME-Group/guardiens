import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";

const owner = readFileSync("src/components/search/SearchOwner.tsx", "utf8");

describe("RCH8 · /recherche-gardiens dit ce qui arrive vraiment", () => {
  it("aucune alerte « nouveau gardien » : elle créait une alerte de nouvelles annonces", () => {
    expect(owner).not.toContain("handleCreateAlert");
    expect(owner).not.toContain("dès qu'un gardien s'inscrit");
    expect(owner).not.toContain("nouveau gardien rejoint la zone");
    expect(owner).not.toContain('supabase.rpc("create_alert_from_search"');
  });

  it("état vide et bas de liste : publier, ou élargir au palier suivant", () => {
    expect(owner).toContain('data-testid="owner-empty-publish"');
    expect(owner).toContain("Votre annonce part par email aux gardiens proches de chez vous, dès sa publication.");
    expect(owner).toContain('data-testid="owner-widen-radius"');
  });

  it("30 km par défaut", () => {
    expect(owner).toContain("const [radius, setRadius] = useState([30]);");
  });

  it("fiche d'une garde : région et pays réels dans les données structurées", () => {
    const sit = readFileSync("src/pages/PublicSitDetail.tsx", "utf8");
    expect(sit).toContain("...(sitRegion && { addressRegion: sitRegion }),");
    expect(sit).toContain('addressCountry: ownerCountry || "FR",');
  });
});
