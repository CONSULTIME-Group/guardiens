import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  BULK_DECLINE_MESSAGE,
  OPEN_APPLICATION_STATUSES,
  formatOpenApplicationLabel,
} from "@/lib/declineOpenApplications";

const OWNER_VIEW = readFileSync(
  resolve(process.cwd(), "src/components/sits/views/OwnerSitView.tsx"),
  "utf8",
);

describe("filet de sécurité à la dépublication", () => {
  it("ne considère comme ouvertes que les candidatures pending et viewed", () => {
    expect([...OPEN_APPLICATION_STATUSES]).toEqual(["pending", "viewed"]);
  });

  it("nomme le candidat et la date de candidature", () => {
    expect(
      formatOpenApplicationLabel({
        first_name: "Camille",
        created_at: "2026-08-03T10:00:00.000Z",
      }),
    ).toBe("Camille, candidature du 3 août");
  });

  it("retombe sur un libellé neutre si le prénom manque", () => {
    expect(
      formatOpenApplicationLabel({ first_name: "", created_at: "invalide" }),
    ).toBe("Candidat");
  });

  it("propose les deux issues explicites dans la boîte de dialogue", () => {
    expect(OWNER_VIEW).toContain("Décliner ces candidatures et dépublier");
    expect(OWNER_VIEW).toContain("Dépublier sans les traiter");
  });

  it("n'affiche la liste que si des candidatures sont ouvertes", () => {
    expect(OWNER_VIEW).toContain("openApps.length > 0");
    expect(OWNER_VIEW).toContain("void handleUnpublish(true)");
    expect(OWNER_VIEW).toContain("void handleUnpublish(false)");
  });

  it("respecte les contraintes de ton, pas de tiret cadratin ni d'emoji", () => {
    const texts = [
      BULK_DECLINE_MESSAGE,
      "Décliner ces candidatures et dépublier",
      "Dépublier sans les traiter",
      "Tu peux les décliner maintenant, ou dépublier sans les traiter.",
    ];
    for (const t of texts) {
      expect(t).not.toMatch(/[—–]/);
      expect(t).not.toMatch(/\p{Extended_Pictographic}/u);
    }
  });
});
