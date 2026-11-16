import { describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { render, screen } from "@testing-library/react";

/**
 * Lot PRO1 (16/11/2026, relevé d'Hélène, « applique les recommandations, je
 * valide tout » de Jérémie) : Paramètres > Sécurité et identité > Statut
 * professionnel disait que « les échanges où vous évoquez vos tarifs restent
 * lisibles par l'équipe comme une activité professionnelle assumée », ce qui
 * laissait entendre qu'un tarif était admis. Les CGU v10 (article 6.3, dont
 * 6.3 e) posent chaque garde comme un échange gratuit entre particuliers.
 */

vi.mock("@/lib/myProfile", () => ({
  fetchMyProfile: async () => ({ data: { pro_status: "none", pro_specialty: null } }),
}));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { from: () => ({}) } }));

import ProVerificationSection from "@/components/settings/ProVerificationSection";

const SRC = "src/components/settings/ProVerificationSection.tsx";

describe("PRO1, statut professionnel conforme aux CGU", () => {
  it("la section dit le cadre gratuit de la garde et renvoie à l'article 6.3", async () => {
    render(<ProVerificationSection user={{ id: "u1" }} />);
    const intro = await screen.findByTestId("pro-status-intro");
    const text = intro.textContent?.replace(/\s+/g, " ").trim();
    expect(text).toBe(
      "Vous exercez une activité animalière déclarée (éducateur, vétérinaire, toiletteur, comportementaliste, pension agréée) ? Indiquez votre spécialité : elle informe les propriétaires de votre expérience. Sur Guardiens, chaque garde est un échange bénévole et gratuit entre particuliers (CGU, article 6.3). Votre activité professionnelle se mène hors de Guardiens."
    );
    // Aucune tournure négative ni tiret long (mots entiers, lettres accentuées comprises).
    expect(text).not.toMatch(/(?<!\p{L})(ne|n'|pas|jamais|aucun|aucune)(?!\p{L})|[\u2013\u2014]/u);
    const link = screen.getByRole("link", { name: "CGU, article 6.3" });
    expect(link.getAttribute("href")).toBe("/cgu");
  });

  it("l'ancienne phrase a disparu et aucun tarif n'est présenté comme admis", () => {
    const src = readFileSync(SRC, "utf8");
    expect(src).not.toContain("évoquez vos tarifs");
    expect(src).not.toContain("activité professionnelle assumée");
    expect(src).not.toMatch(/tarif/i);
  });
});
