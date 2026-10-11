import { describe, it, expect, vi } from "vitest";
import { readFileSync } from "node:fs";

vi.mock("@/integrations/supabase/client", () => ({ supabase: {} }));

import {
  SIT_PROPOSAL_LIMITS,
  petsLabel,
  propertyLabel,
  proposalBlockedTitle,
  proposalChecklist,
  proposalErrorMessage,
  proposalPeriod,
  proposalTimeLeft,
} from "@/lib/sitProposal";

/**
 * Lot I2 : proposer une garde sans la publier. Logique pure des textes et
 * garde de structure des écrans (maquettes Claude Design « Proposer une garde »).
 */
describe("Lot I2, textes et règles d'affichage", () => {
  it("les limites affichées sont le miroir de sit_proposal_limits()", () => {
    const sql = readFileSync("supabase/prepared-migrations/20261011150000_sit_private_proposals.sql", "utf8");
    expect(sql).toContain(`'expiry_days', ${SIT_PROPOSAL_LIMITS.expiryDays}`);
    expect(sql).toContain(`'max_open_per_sit', ${SIT_PROPOSAL_LIMITS.maxOpenPerSit}`);
    expect(sql).toContain(`'max_per_day', ${SIT_PROPOSAL_LIMITS.maxPerDay}`);
  });

  it("la liste pédagogique garde les quatre informations dans l'ordre, avec leur état", () => {
    const items = proposalChecklist(["dates", "photo"], "Hélène");
    expect(items.map((i) => [i.id, i.done])).toEqual([
      ["city", true],
      ["dates", false],
      ["photo", false],
      ["description", true],
    ]);
    expect(items[2].detail).toContain("Hélène");
  });

  it("titre de l'écran selon ce qui manque", () => {
    expect(proposalBlockedTitle(4)).toBe("Présentez d'abord votre maison");
    expect(proposalBlockedTitle(2)).toBe("Encore deux informations avant de proposer votre garde");
    expect(proposalBlockedTitle(1)).toBe("Encore une information avant de proposer votre garde");
  });

  it("chaque refus de la base devient une phrase lisible", () => {
    expect(proposalErrorMessage({ message: "proposal_open_limit" })).toContain("3 gardiens");
    expect(proposalErrorMessage({ message: "proposal_daily_limit" })).toContain("10 propositions");
    expect(proposalErrorMessage({ message: "already_proposed" }, "Hélène")).toContain("Hélène");
    expect(proposalErrorMessage({ message: "PROFILE_INCOMPLETE: x" })).toContain("40 %");
    expect(proposalErrorMessage(new Error("inattendu"))).toBe("L'envoi n'a pas abouti. Réessayez dans un instant.");
  });

  it("période, délai, animaux et logement", () => {
    expect(proposalPeriod("2026-12-20", "2026-12-27")).toBe("Du 20 au 27 décembre, 7 nuits");
    expect(proposalPeriod("2026-11-28", "2026-12-02")).toBe("Du 28 novembre au 2 décembre, 4 nuits");
    expect(proposalPeriod(null, "2026-12-02")).toBe("");
    const now = new Date("2026-10-11T10:00:00Z");
    expect(proposalTimeLeft("2026-10-16T10:00:00Z", now)).toBe("5 jours pour répondre");
    expect(proposalTimeLeft("2026-10-11T20:00:00Z", now)).toBe("Dernier jour pour répondre");
    expect(proposalTimeLeft("2026-10-10T10:00:00Z", now)).toBe(null);
    expect(petsLabel([{ name: "Pépin", species: "cat" }, { name: "Olive", species: "cat" }])).toBe("Pépin et Olive");
    expect(propertyLabel({ type: "house", environment: "countryside", bedrooms_count: 3, description: null })).toBe(
      "Maison à la campagne, 3 chambres",
    );
  });

  it("aucun tiret de ponctuation ni mot interdit dans les textes du lot", () => {
    for (const file of [
      "src/lib/sitProposal.ts",
      "src/components/sits/owner/ProposeSitDialog.tsx",
      "src/pages/SitProposal.tsx",
      "supabase/prepared-migrations/20261011150000_sit_private_proposals.sql",
    ]) {
      const text = readFileSync(file, "utf8");
      expect(text, file).not.toMatch(/[—–]/);
      expect(text, file).not.toMatch(/voisin|Auvergne|AURA/);
    }
  });
});

describe("Lot I2, structure des écrans", () => {
  const dialog = readFileSync("src/components/sits/owner/ProposeSitDialog.tsx", "utf8");
  const page = readFileSync("src/pages/SitProposal.tsx", "utf8");
  const app = readFileSync("src/App.tsx", "utf8");
  const edit = readFileSync("src/pages/EditSit.tsx", "utf8");

  it("le propriétaire est guidé quand le brouillon est incomplet, et la garde reste privée", () => {
    expect(dialog).toContain("Ce qu'il faut pour proposer votre garde");
    expect(dialog).toContain("Votre garde reste privée.");
    expect(dialog).toContain("Compléter ma garde");
    expect(dialog).toContain("?proposer=");
    expect(dialog).not.toMatch(/lucide-react|<svg/);
  });

  it("le retour d'édition n'accepte qu'une fiche gardien", () => {
    expect(edit).toContain("navigate(proposalReturn ?? `/sits/${id}`)");
    expect(edit).toMatch(/\/\^\\\/gardiens\\\//);
  });

  it("le gardien répond depuis une page dédiée, protégée, sans second repère main", () => {
    expect(app).toContain('<Route path="/propositions/:id" element={<SitProposal />} />');
    expect(page).not.toContain("<main");
    expect(page).toContain("Dire oui à {owner}");
    expect(page).toContain("Poser une question à {owner}");
    expect(page).toContain("Décliner avec un mot");
    expect(page).not.toMatch(/lucide-react|<svg/);
  });
});
