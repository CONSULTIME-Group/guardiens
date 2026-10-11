import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";

/**
 * Lot I1 : un propriétaire qui consulte la fiche d'un gardien peut lui
 * proposer une garde déjà publiée, sans passer par la recherche.
 */
const read = (p: string) => readFileSync(p, "utf8");

describe("Lot I1, proposer une garde publiée depuis la fiche gardien", () => {
  const page = read("src/pages/PublicSitterProfile.tsx");
  const card = read("src/components/profile/sitter/SitterF1Sections.tsx");
  const button = read("src/components/sits/owner/InviteToMySitButton.tsx");

  it("la carte contact porte l'action secondaire, réservée au propriétaire qui regarde un autre membre", () => {
    expect(card).toContain("secondary?: ReactNode");
    expect(card).toContain("data-contact-secondary");
    expect(page).toMatch(/secondary=\{\s*isOwner && !isOwn && id \?/);
    expect(page).toContain("<InviteToMySitButton");
    expect(page).toContain('label="Lui proposer ma garde"');
  });

  it("le bouton n'apparaît qu'avec au moins une garde publiée, sans icône, et il est suivi", () => {
    const block = page.slice(page.indexOf("<InviteToMySitButton"), page.indexOf("/>", page.indexOf("<InviteToMySitButton")));
    expect(block).toContain("hideIfNoSits");
    expect(block).toContain("hideIcon");
    expect(block).toContain('source="public_profile"');
    expect(button).toContain('trackEvent("sit_invite_opened"');
  });

  it("la commune proposée est celle de l'annonce, à défaut celle du profil", () => {
    expect(button).toContain('.select("id, title, start_date, end_date, city")');
    expect(button).toContain("city: s.city ?? (prof as any)?.city ?? null");
  });
});
