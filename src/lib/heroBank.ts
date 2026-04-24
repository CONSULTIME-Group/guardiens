/**
 * Banque de 50 illustrations "carnet de voyage" pour les hero des profils gardiens.
 * Assignation déterministe : un même sitter.id voit toujours la même image.
 *
 * 3 palettes mixées (terre automnal, vert/crème, or/sépia) — style sketchbook.
 */

import hero01 from "@/assets/hero-bank/hero-01.jpg";
import hero02 from "@/assets/hero-bank/hero-02.jpg";
import hero03 from "@/assets/hero-bank/hero-03.jpg";
import hero04 from "@/assets/hero-bank/hero-04.jpg";
import hero05 from "@/assets/hero-bank/hero-05.jpg";
import hero06 from "@/assets/hero-bank/hero-06.jpg";
import hero07 from "@/assets/hero-bank/hero-07.jpg";
import hero08 from "@/assets/hero-bank/hero-08.jpg";
import hero09 from "@/assets/hero-bank/hero-09.jpg";
import hero10 from "@/assets/hero-bank/hero-10.jpg";
import hero11 from "@/assets/hero-bank/hero-11.jpg";
import hero12 from "@/assets/hero-bank/hero-12.jpg";
import hero13 from "@/assets/hero-bank/hero-13.jpg";
import hero14 from "@/assets/hero-bank/hero-14.jpg";
import hero15 from "@/assets/hero-bank/hero-15.jpg";
import hero16 from "@/assets/hero-bank/hero-16.jpg";
import hero17 from "@/assets/hero-bank/hero-17.jpg";
import hero18 from "@/assets/hero-bank/hero-18.jpg";
import hero19 from "@/assets/hero-bank/hero-19.jpg";
import hero20 from "@/assets/hero-bank/hero-20.jpg";
import hero21 from "@/assets/hero-bank/hero-21.jpg";
import hero22 from "@/assets/hero-bank/hero-22.jpg";
import hero23 from "@/assets/hero-bank/hero-23.jpg";
import hero24 from "@/assets/hero-bank/hero-24.jpg";
import hero25 from "@/assets/hero-bank/hero-25.jpg";
import hero26 from "@/assets/hero-bank/hero-26.jpg";
import hero27 from "@/assets/hero-bank/hero-27.jpg";
import hero28 from "@/assets/hero-bank/hero-28.jpg";
import hero29 from "@/assets/hero-bank/hero-29.jpg";
import hero30 from "@/assets/hero-bank/hero-30.jpg";
import hero31 from "@/assets/hero-bank/hero-31.jpg";
import hero32 from "@/assets/hero-bank/hero-32.jpg";
import hero33 from "@/assets/hero-bank/hero-33.jpg";
import hero34 from "@/assets/hero-bank/hero-34.jpg";
import hero35 from "@/assets/hero-bank/hero-35.jpg";
import hero36 from "@/assets/hero-bank/hero-36.jpg";
import hero37 from "@/assets/hero-bank/hero-37.jpg";
import hero38 from "@/assets/hero-bank/hero-38.jpg";
import hero39 from "@/assets/hero-bank/hero-39.jpg";
import hero40 from "@/assets/hero-bank/hero-40.jpg";
import hero41 from "@/assets/hero-bank/hero-41.jpg";
import hero42 from "@/assets/hero-bank/hero-42.jpg";
import hero43 from "@/assets/hero-bank/hero-43.jpg";
import hero44 from "@/assets/hero-bank/hero-44.jpg";
import hero45 from "@/assets/hero-bank/hero-45.jpg";
import hero46 from "@/assets/hero-bank/hero-46.jpg";
import hero47 from "@/assets/hero-bank/hero-47.jpg";
import hero48 from "@/assets/hero-bank/hero-48.jpg";
import hero49 from "@/assets/hero-bank/hero-49.jpg";
import hero50 from "@/assets/hero-bank/hero-50.jpg";

export const HERO_BANK: readonly string[] = [
  hero01, hero02, hero03, hero04, hero05, hero06, hero07, hero08, hero09, hero10,
  hero11, hero12, hero13, hero14, hero15, hero16, hero17, hero18, hero19, hero20,
  hero21, hero22, hero23, hero24, hero25, hero26, hero27, hero28, hero29, hero30,
  hero31, hero32, hero33, hero34, hero35, hero36, hero37, hero38, hero39, hero40,
  hero41, hero42, hero43, hero44, hero45, hero46, hero47, hero48, hero49, hero50,
];

/**
 * Hash FNV-1a 32 bits (déterministe, distribution uniforme correcte).
 * Convertit une chaîne (typiquement un UUID) en index dans la banque.
 */
function hashStringToIndex(input: string, modulo: number): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = (hash * 0x01000193) >>> 0;
  }
  return hash % modulo;
}

/**
 * Retourne l'URL de l'image hero assignée à un gardien donné.
 * - Stable : un même ID donne toujours la même image.
 * - Bien réparti : hash FNV-1a sur les 50 images.
 *
 * Fallback : si pas d'ID, on prend la première image.
 */
export function getSitterHeroImage(sitterId?: string | null): string {
  if (!sitterId) return HERO_BANK[0];
  const index = hashStringToIndex(sitterId, HERO_BANK.length);
  return HERO_BANK[index];
}
