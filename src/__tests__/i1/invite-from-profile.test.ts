import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";

/**
 * Lots I1 puis I2 : un propriétaire qui consulte la fiche d'un gardien peut
 * lui proposer une garde, publiée (invitation) ou brouillon (proposition
 * privée), sans passer par la recherche.
 */
const read = (p: string) => readFileSync(p, "utf8");

describe("Proposer une garde depuis la fiche gardien", () => {
  const page = read("src/pages/PublicSitterProfile.tsx");
  const card = read("src/components/profile/sitter/SitterF1Sections.tsx");
  const button = read("src/components/sits/owner/InviteToMySitButton.tsx");

  it("la carte contact porte l'action secondaire, réservée au propriétaire qui regarde un autre membre", () => {
    expect(card).toContain("secondary?: ReactNode");
    expect(card).toContain("data-contact-secondary");
    expect(page).toMatch(/secondary=\{\s*isOwner && !isOwn && auth\?\.user\?\.id/);
    expect(page).toContain("data-propose-sit-trigger");
    expect(page).toContain("Lui proposer ma garde");
  });

  it("lot I2 : le bouton est visible même sans garde publiée et rouvre le choix au retour d'édition", () => {
    expect(page).toContain("<ProposeSitDialog");
    expect(page).not.toContain("hideIfNoSits");
    expect(page).toContain('searchParams.get("proposer")');
    expect(page).toContain("initialSitId={proposerParam}");
  });

  it("l'invitation publique reprend la commune de l'annonce, à défaut celle du profil", () => {
    expect(button).toContain('.select("id, title, start_date, end_date, city")');
    expect(button).toContain("city: s.city ?? (prof as any)?.city ?? null");
  });
});
