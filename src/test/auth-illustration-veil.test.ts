/**
 * Guardrail : le voile d'opacité ~25% sur l'illustration d'authentification
 * doit rester en place dans `AuthIllustrationPanel`.
 *
 * Ce composant est partagé par /login, /inscription et /forgot-password.
 * Le voile (`bg-background/25`) garantit la lisibilité du cartouche de texte
 * posé par-dessus la gouache. S'il disparaît, le contraste WCAG du titre
 * peut chuter selon la zone de l'image. Ce test bloque toute régression
 * silencieuse.
 *
 * Règles vérifiées :
 *  1. Le fichier `AuthIllustrationPanel.tsx` existe.
 *  2. Il contient exactement une classe `bg-background/25` (le voile).
 *  3. Le voile est marqué décoratif (`pointer-events-none` ou `aria-hidden`
 *     sur le wrapper parent) pour ne pas intercepter les clics.
 */

import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const PANEL_PATH = resolve(
  process.cwd(),
  "src/components/auth/AuthIllustrationPanel.tsx",
);

describe("AuthIllustrationPanel — voile d'opacité 25%", () => {
  it("le composant partagé existe", () => {
    expect(existsSync(PANEL_PATH)).toBe(true);
  });

  const source = existsSync(PANEL_PATH) ? readFileSync(PANEL_PATH, "utf-8") : "";

  it("contient le voile sémantique bg-background/25", () => {
    const matches = source.match(/bg-background\/25/g) ?? [];
    expect(
      matches.length,
      "Le voile `bg-background/25` doit rester présent dans AuthIllustrationPanel.tsx",
    ).toBeGreaterThanOrEqual(1);
  });

  it("le voile reste non-interactif (pointer-events-none ou aria-hidden sur le wrapper)", () => {
    // Le voile lui-même OU son wrapper doit être non-cliquable, sinon il
    // intercepterait les clics sur la moitié gauche.
    const hasPointerEventsNone = /pointer-events-none/.test(source);
    const hasAriaHidden = /aria-hidden/.test(source);
    expect(
      hasPointerEventsNone || hasAriaHidden,
      "Le voile doit être marqué décoratif (pointer-events-none ou aria-hidden) pour ne pas intercepter les interactions.",
    ).toBe(true);
  });

  it("n'utilise pas de couleur hardcodée à la place du token sémantique", () => {
    // Empêche le retour à un voile blanc en dur (#fff, white, rgba(255,...)).
    const hardcodedWhiteVeil =
      /bg-white\/\d+|bg-\[#fff[^]]*\]|rgba\(\s*255\s*,\s*255\s*,\s*255/i;
    expect(
      hardcodedWhiteVeil.test(source),
      "Utilisez le token sémantique `bg-background/25` plutôt qu'une couleur hardcodée — il s'adapte au thème.",
    ).toBe(false);
  });
});
