/** Lot CAND1 : le candidat lit que sa candidature est arrivée, et si elle a été ouverte. */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { applicationReceiptLine } from "@/lib/applicationReceipt";

const now = new Date("2026-11-16T14:00:00+01:00");

describe("CAND1, accusé de réception", () => {
  it("juste envoyée", () => {
    expect(applicationReceiptLine({ ownerFirstName: "Anne", status: "pending" }, now)).toBe(
      "Votre candidature est arrivée chez Anne à l'instant, pas encore ouverte.",
    );
  });
  it("arrivée un autre jour, pas ouverte", () => {
    expect(applicationReceiptLine({ ownerFirstName: "Anne", createdAt: "2026-11-12T09:00:00Z", status: "pending" }, now)).toBe(
      "Votre candidature est arrivée chez Anne le 12 novembre, pas encore ouverte.",
    );
  });
  it("ouverte hier", () => {
    expect(
      applicationReceiptLine(
        { ownerFirstName: "Anne", createdAt: "2026-11-10T09:00:00Z", viewedAt: "2026-11-15T18:00:00Z", status: "viewed" },
        now,
      ),
    ).toBe("Votre candidature est arrivée chez Anne le 10 novembre, ouverte hier.");
  });
  it("sans prénom, et rien pour une candidature close", () => {
    expect(applicationReceiptLine({ createdAt: "2026-11-16T08:00:00Z", status: "pending" }, now)).toBe(
      "Votre candidature est arrivée chez le propriétaire aujourd'hui, pas encore ouverte.",
    );
    for (const status of ["accepted", "rejected", "cancelled"]) {
      expect(applicationReceiptLine({ ownerFirstName: "Anne", status }, now)).toBeNull();
    }
  });
  it("affichée sous « Candidature envoyée », dates lues avec la candidature", () => {
    expect(readFileSync("src/components/sits/views/SitterSitView.tsx", "utf8")).toContain('data-testid="application-receipt-line"');
    expect(readFileSync("src/pages/SitDetail.tsx", "utf8")).toContain('.select("id, status, created_at, viewed_at")');
    expect(readFileSync("src/lib/applicationReceipt.ts", "utf8")).not.toMatch(/[—–]/);
  });
});
