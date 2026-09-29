import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { campaignCounts, clickRate, countsByCampaign } from "@/lib/admin/massEmailCounts";
import { exclusionRecap, internalTextBlocking, ARCHIVED_PRESET_KEYS } from "@/lib/admin/massEmailSafety";

const read = (p: string) => readFileSync(p, "utf8");

describe("Lot A8, compteurs depuis mass_email_sends", () => {
  it("compte destinataires hors ignorés et envoyés tous statuts webhook", () => {
    const rows = [
      ...Array.from({ length: 408 }, (_, i) => ({ mass_email_id: "c", recipient_email: `d${i}@x.fr`, status: "delivered" })),
      ...Array.from({ length: 183 }, (_, i) => ({ mass_email_id: "c", recipient_email: `o${i}@x.fr`, status: "opened" })),
      { mass_email_id: "c", recipient_email: "s@x.fr", status: "sent" },
      { mass_email_id: "c", recipient_email: "b1@x.fr", status: "bounced" },
      { mass_email_id: "c", recipient_email: "b2@x.fr", status: "bounced" },
      { mass_email_id: "c", recipient_email: "p@x.fr", status: "complained" },
      ...Array.from({ length: 33 }, (_, i) => ({ mass_email_id: "c", recipient_email: `k${i}@x.fr`, status: "skipped" })),
    ];
    const c = campaignCounts(rows);
    expect(c.recipients).toBe(595);
    expect(c.sent).toBe(595);
  });
  it("clic unique par destinataire, taux plafonné à 100 %", () => {
    const c = countsByCampaign([
      { mass_email_id: "a", recipient_email: "X@x.fr", status: "clicked", first_clicked_at: "t" },
      { mass_email_id: "a", recipient_email: "x@x.fr", status: "clicked", first_clicked_at: "t" },
    ]).get("a")!;
    expect(c.clickers).toBe(1);
    expect(clickRate(5, 2)).toBe(100);
  });
});

describe("Lot A8, sécurité du formulaire", () => {
  it("bloque un corps libre contenant du texte interne, pas un gabarit", () => {
    expect(internalTextBlocking("Gabarit dédié owner-noel-2026", undefined).length).toBeGreaterThan(0);
    expect(internalTextBlocking("Gabarit dédié owner-noel-2026", "owner-noel-2026")).toEqual([]);
    expect(internalTextBlocking("Bonjour, voici notre nouvelle.", undefined)).toEqual([]);
  });
  it("récapitule les exclusions, admins toujours", () => {
    const r = exclusionRecap({ received: 4, holdout: 2, pressure: 1, admins: 3 });
    expect(r).toContain("4 déjà reçu, exclus");
    expect(r).toContain("3 admins, toujours exclus");
  });
  it("Oser demander est archivé", () => expect(ARCHIVED_PRESET_KEYS.has("oser")).toBe(true));
  it("page vide au chargement, preset ciblage remet à zéro, aucun lien cassé", () => {
    const s = read("src/pages/admin/AdminMassEmails.tsx");
    expect(s).toContain('useState<string>("")');
    expect(s).not.toContain("useState(OSER_BODY)");
    expect(s).toContain("onTargetingPreset={resetCampaign}");
    expect(s).not.toContain("/entraide/nouvelle");
    expect(s).toContain("expected_count: Number(confirmInput)");
    expect(read("src/components/admin/mass-email/MassEmailFilters.tsx")).toContain("onTargetingPreset?.()");
  });
  it("carte activation retirée du tableau de bord", () => {
    const s = read("src/pages/admin/_components/dashboard/SignalsSection.tsx");
    expect(s).not.toContain("<OwnerActivationCampaignCard");
    expect(s).toContain("/admin/envois-groupes");
  });
  it("digests : confirmation avant envoi, 8 h", () => {
    expect(read("src/pages/admin/_components/SitterDigestTab.tsx")).toContain("DigestSendConfirm");
    expect(read("src/pages/admin/_components/MissionDigestTab.tsx")).toContain("DigestSendConfirm");
    expect(read("src/pages/admin/_components/SitterDigestTab.tsx")).toMatch(/8\s?h/);
  });
});
