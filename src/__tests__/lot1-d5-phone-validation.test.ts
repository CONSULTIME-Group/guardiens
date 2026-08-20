import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { isPlausiblePhone } from "@/lib/phone";

/**
 * D5 : les cinq téléphones du guide maison (vet, personne de confiance,
 * urgence, plombier, électricien) ont type tel et une validation plausible.
 * Un emergency_contact_phone invalide bloque l'enregistrement du guide.
 */
describe("D5 : validation des téléphones du guide maison", () => {
  it("isPlausiblePhone accepte les formats courants et refuse l'évident", () => {
    expect(isPlausiblePhone("")).toBe(true);
    expect(isPlausiblePhone(null)).toBe(true);
    expect(isPlausiblePhone("06 12 34 56 78")).toBe(true);
    expect(isPlausiblePhone("+33 6 12 34 56 78")).toBe(true);
    expect(isPlausiblePhone("06.12.34.56.78")).toBe(true);
    expect(isPlausiblePhone("+41 79 123 45 67")).toBe(true);
    expect(isPlausiblePhone("01 23 45 67 89")).toBe(true);

    expect(isPlausiblePhone("123")).toBe(false);
    expect(isPlausiblePhone("abcdef")).toBe(false);
    expect(isPlausiblePhone("06 12 34")).toBe(false);
    expect(isPlausiblePhone("1234567890123456")).toBe(false);
    expect(isPlausiblePhone("appeler le 06")).toBe(false);
  });

  it("le formulaire guide maison branche tel + validation sur les cinq champs", () => {
    const form = readFileSync("src/components/owner-profile/OwnerHouseGuideForm.tsx", "utf8");
    const telCount = (form.match(/inputType="tel"/g) || []).length;
    expect(telCount).toBe(5);
    // La publication exige un contact d'urgence plausible.
    expect(form).toMatch(/isPublishable[^]*isPlausiblePhone\(emergencyPhone\)/);
    // Garde défensive dans handleFinalize.
    expect(form).toContain("if (!isPublishable) return;");
  });
});
