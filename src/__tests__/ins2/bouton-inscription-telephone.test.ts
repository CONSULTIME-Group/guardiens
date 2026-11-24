/** Lot INS2 (24/11/2026) : « Créer mon compte » au-dessus du bandeau cookies au téléphone (805 px avant, 658 px après à 390 × 844). */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";

const reg = readFileSync("src/pages/Register.tsx", "utf8");
const c2 = readFileSync("src/components/arrival/RegisterArrivalParts.tsx", "utf8");

describe("INS2, étape 2 de l'inscription au téléphone", () => {
  it("le surtitre se retire sous 768 px et le titre se resserre", () => {
    expect(c2).toContain('<div className="hidden md:block" data-testid="arrival-c2-eyebrow"><Eyebrow>{t("arrival.c2.eyebrow")}</Eyebrow></div>');
    expect(c2).toContain('<h2 className="text-2xl md:text-3xl font-semibold">{t("arrival.c2.title")}</h2>');
  });
  it("le compteur de membres passe sous le bouton au téléphone, sans disparaître", () => {
    expect(reg).toContain('data-testid="members-count-under-submit" className="md:hidden');
    expect(reg).toContain('className="hidden md:flex lg:hidden items-center justify-center gap-2 mb-6');
    expect(reg.indexOf('t("register_page.submit")')).toBeLessThan(reg.indexOf('members-count-under-submit'));
  });
  it("la phrase « 8 caractères au moins » reste au-delà de 768 px, le champ la dit déjà au téléphone", () => {
    expect(reg).toContain('className="hidden md:block text-xs text-muted-foreground" data-testid="password-hint"');
  });
  it("les espacements du formulaire se resserrent au téléphone seulement", () => {
    expect(reg).toContain('className="space-y-4 md:space-y-5 animate-in');
  });
});
