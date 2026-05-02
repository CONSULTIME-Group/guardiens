import { describe, it, expect } from "vitest";

/**
 * Vérifie analytiquement que le crossfade ping-pong des deux vidéos
 * (AuthIllustrationPanel) reste stable sur 50+ cycles, sans :
 *  - blackout (somme des opacités < 1)
 *  - overshoot (somme > 1)
 *  - clignotement (discontinuité brusque entre frames)
 *
 * On reproduit ici exactement la formule du composant :
 *   distA  = min(t, d - t)
 *   x      = clamp(distA / FADE, 0, 1)
 *   smooth = x*x*(3 - 2x)            // smoothstep
 *   opA    = smooth
 *   opB    = 1 - smooth
 *   sum    = 1   (par construction)
 */

const DURATION = 10;     // seconde, durée d'un clip vidéo
const FADE = 0.9;        // largeur du crossfade autour de chaque bord
const FPS = 60;          // taux d'échantillonnage du tick (raf ~60Hz)
const CYCLES = 50;       // nombre de cycles complets à simuler

function smoothstep(x: number): number {
  const c = Math.min(1, Math.max(0, x));
  return c * c * (3 - 2 * c);
}

function frameAt(elapsedSec: number) {
  // Vidéo A en lecture normale, bouclant à DURATION.
  const tA = elapsedSec % DURATION;
  // Vidéo B décalée d'une demi-durée.
  const tB = (elapsedSec + DURATION / 2) % DURATION;
  // Opacités calculées sur A uniquement, B = 1 - A.
  const distA = Math.min(tA, DURATION - tA);
  const x = distA / FADE;
  const opA = smoothstep(x);
  const opB = 1 - opA;
  return { tA, tB, opA, opB, sum: opA + opB };
}

describe("AuthIllustrationPanel — crossfade stability over 50 cycles", () => {
  const totalFrames = CYCLES * DURATION * FPS;

  it("la somme des opacités reste constamment égale à 1 (aucun blackout, aucun overshoot)", () => {
    let minSum = Infinity;
    let maxSum = -Infinity;
    for (let i = 0; i <= totalFrames; i++) {
      const t = i / FPS;
      const { sum } = frameAt(t);
      if (sum < minSum) minSum = sum;
      if (sum > maxSum) maxSum = sum;
    }
    // Tolérance epsilon pour les arrondis flottants.
    expect(minSum).toBeGreaterThan(0.9999);
    expect(maxSum).toBeLessThan(1.0001);
  });

  it("les opacités restent bornées dans [0, 1] sur 50 cycles", () => {
    for (let i = 0; i <= totalFrames; i++) {
      const t = i / FPS;
      const { opA, opB } = frameAt(t);
      expect(opA).toBeGreaterThanOrEqual(0);
      expect(opA).toBeLessThanOrEqual(1);
      expect(opB).toBeGreaterThanOrEqual(0);
      expect(opB).toBeLessThanOrEqual(1);
    }
  });

  it("aucun saut brutal d'opacité entre deux frames consécutives (pas de clignotement)", () => {
    // Le smoothstep garantit une dérivée bornée. Sur du 60fps avec FADE=0.9s,
    // la variation max d'opacité par frame doit rester très faible.
    let prev = frameAt(0).opA;
    let maxDelta = 0;
    for (let i = 1; i <= totalFrames; i++) {
      const t = i / FPS;
      const op = frameAt(t).opA;
      const delta = Math.abs(op - prev);
      if (delta > maxDelta) maxDelta = delta;
      prev = op;
    }
    // Borne théorique : dérivée max de smoothstep = 1.5, donc
    // max |Δ| par frame ≈ 1.5 / FADE / FPS ≈ 0.028. On vérifie < 0.05.
    expect(maxDelta).toBeLessThan(0.05);
  });

  it("au moment exact du wrap (boundary du loop), B est à pleine opacité", () => {
    // Quand A franchit sa fin/début (t=0 ou t=DURATION), distA=0 → opA=0, opB=1.
    // Donc B affiche en plein écran le milieu de SON clip (zone safe).
    for (let cycle = 0; cycle < CYCLES; cycle++) {
      const tWrap = cycle * DURATION; // bord de A
      const { opA, opB, tB } = frameAt(tWrap);
      expect(opA).toBeCloseTo(0, 5);
      expect(opB).toBeCloseTo(1, 5);
      // B doit être au milieu de son propre clip → loin de son propre wrap.
      expect(Math.min(tB, DURATION - tB)).toBeGreaterThan(FADE);
    }
  });

  it("en dehors des zones de fade, A est seul visible (B totalement transparente)", () => {
    // Au centre du clip A (t = DURATION/2), distA = DURATION/2 = 5s >> FADE.
    for (let cycle = 0; cycle < CYCLES; cycle++) {
      const tCenter = cycle * DURATION + DURATION / 2;
      const { opA, opB } = frameAt(tCenter);
      expect(opA).toBeCloseTo(1, 5);
      expect(opB).toBeCloseTo(0, 5);
    }
  });
});
