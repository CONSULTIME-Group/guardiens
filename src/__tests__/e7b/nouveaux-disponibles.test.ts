/**
 * Lot E7b (11/10/2026) : préréglage pour les personnes devenues disponibles
 * sans avoir reçu la relance. Aucun envoi automatique.
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("E7b préréglage A ter", () => {
  const src = readFileSync("src/pages/admin/AdminMassEmails.tsx", "utf8");
  const p = src.slice(src.indexOf('key: "entraide_ligne_nouveaux"'), src.indexOf('key: "owner_noel_2026"'));
  it("même gabarit que la relance, l'anti-doublon écarte ceux qui l'ont reçue", () => {
    expect(p).toContain('template_name: "entraide-ligne-relance"');
    expect(p).toContain("helps_with_empty: true");
    expect(p).toContain("respect_product_optout: true");
    expect(p).not.toContain("received_mass_email_id");
    expect(p).toContain('utmCampaign: "entraide_ligne_nouveaux"');
  });
  it("libellé admin", () => {
    expect(readFileSync("src/lib/admin/labels.ts", "utf8")).toContain('entraide_ligne_nouveaux: "Phrase d\'entraide, nouveaux disponibles"');
  });
});
