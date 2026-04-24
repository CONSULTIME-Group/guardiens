/**
 * Variantes mobile (768×272 WebP, ~34KB en moyenne) des 100 images hero.
 *
 * Objectif : réduire de ~74% le poids transféré sur smartphone (1536px JPG → 768px WebP),
 * tout en gardant assez de résolution pour l'affichage retina mobile (≤ 412pt × 2 = 824px).
 *
 * Les fichiers sont nommés à l'identique (hero-01.webp … hero-100.webp) afin que
 * l'index calculé dans heroBank.ts soit réutilisable tel quel.
 */

// Import groupé eager : Vite résout chaque module au build, donc le bundle reste optimal.
const modules = import.meta.glob<{ default: string }>(
  "@/assets/hero-bank-mobile/hero-*.webp",
  { eager: true }
);

// Tri par numéro pour aligner l'ordre sur HERO_BANK (01, 02, …, 100).
const HERO_BANK_MOBILE: readonly string[] = Object.entries(modules)
  .sort(([a], [b]) => a.localeCompare(b))
  .map(([, mod]) => mod.default);

if (HERO_BANK_MOBILE.length !== 100) {
  // Garde-fou de dev : on s'attend strictement à 100 variantes mobile.
  // eslint-disable-next-line no-console
  console.warn(
    `[heroBankMobile] ${HERO_BANK_MOBILE.length} variantes trouvées (attendu : 100)`
  );
}

export function getMobileByIndex(index: number): string | undefined {
  return HERO_BANK_MOBILE[index];
}

export { HERO_BANK_MOBILE };
