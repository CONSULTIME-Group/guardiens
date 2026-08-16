import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  BULK_DECLINE_MESSAGE,
  BULK_DECLINE_MESSAGE_DISCUSSING,
  OPEN_APPLICATION_STATUSES,
  formatOpenApplicationLabel,
  pickBulkDeclineMessage,
} from "@/lib/declineOpenApplications";

const OWNER_VIEW = readFileSync(
  resolve(process.cwd(), "src/components/sits/views/OwnerSitView.tsx"),
  "utf8",
);

describe("filet de sécurité à la dépublication", () => {
  it("considère comme ouvertes pending, viewed et discussing, comme le RPC", () => {
    expect([...OPEN_APPLICATION_STATUSES]).toEqual([
      "pending",
      "viewed",
      "discussing",
    ]);
  });

  it("aligne les deux requêtes de requestUnpublish sur la même définition", () => {
    expect(OWNER_VIEW).not.toContain('.in("status", ["pending", "viewed", "discussing"])');
    const occurrences = OWNER_VIEW.split('.in("status", [...OPEN_APPLICATION_STATUSES])').length - 1;
    expect(occurrences).toBe(2);
  });

  it("choisit le message type selon le statut de départ", () => {
    expect(pickBulkDeclineMessage("discussing")).toBe(
      BULK_DECLINE_MESSAGE_DISCUSSING,
    );
    expect(pickBulkDeclineMessage("pending")).toBe(BULK_DECLINE_MESSAGE);
    expect(pickBulkDeclineMessage(undefined)).toBe(BULK_DECLINE_MESSAGE);
  });

  it("ne notifie pas si l'update n'a modifié aucune ligne", () => {
    const LIB = readFileSync(
      resolve(process.cwd(), "src/lib/declineOpenApplications.ts"),
      "utf8",
    );
    expect(LIB).toContain('.select("id")');
    expect(LIB).toContain("if (!updated || updated.length === 0)");
    expect(LIB).toContain("skipped += 1");
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

  it("ne promet jamais un archivage lors de la dépublication", () => {
    // L'onglet réel des brouillons est « Brouillons » (src/pages/Sits.tsx).
    // « Archivées » désigne un autre statut du produit (onglet « Passées »).
    expect(OWNER_VIEW).not.toContain("« Archivées »");
    expect(OWNER_VIEW).not.toContain("dépubliée et archivée");
    expect(OWNER_VIEW).toContain("l'onglet « Brouillons »");
  });

  it("respecte les contraintes de ton, pas de tiret cadratin ni d'emoji", () => {
    const texts = [
      BULK_DECLINE_MESSAGE,
      BULK_DECLINE_MESSAGE_DISCUSSING,
      "Décliner ces candidatures et dépublier",
      "Dépublier sans les traiter",
      "Vous pouvez les décliner maintenant, ou dépublier sans les traiter.",
    ];
    for (const t of texts) {
      expect(t).not.toMatch(/[—–]/);
      expect(t).not.toMatch(/\p{Extended_Pictographic}/u);
    }
  });
});
