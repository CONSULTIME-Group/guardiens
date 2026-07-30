/**
 * Règle produit : la photo de couverture d'une annonce montre le LIEU,
 * jamais un animal.
 *
 * Ordre de priorité appliqué partout où une couverture est déduite
 * automatiquement (création d'annonce, gestionnaire de photos, repli
 * d'affichage des cartes de recherche) :
 *   1. home_life ou garden
 *   2. neighborhood ou seasonal
 *   3. toute autre photo de la galerie, sauf animals_life
 *   4. en dernier recours seulement, animals_life
 *
 * Une photo issue de la table `pets` n'est jamais éligible.
 * Ce calcul ne s'applique qu'en l'absence de choix explicite du propriétaire.
 */

export type CoverCandidate = { photo_url: string; category?: string | null };

const RANK: Record<string, number> = {
  home_life: 0,
  garden: 0,
  neighborhood: 1,
  seasonal: 1,
  animals_life: 3,
};

export const coverRank = (category?: string | null): number =>
  RANK[(category ?? "") as string] ?? 2;

/** Trie une galerie selon la priorité de couverture (tri stable). */
export function sortForCover<T extends CoverCandidate>(photos: T[]): T[] {
  return photos
    .map((p, i) => ({ p, i }))
    .sort((a, b) => coverRank(a.p.category) - coverRank(b.p.category) || a.i - b.i)
    .map(({ p }) => p);
}

/** Retourne l'URL de couverture la mieux placée, ou null. */
export function pickPlaceCover(photos: CoverCandidate[]): string | null {
  const sorted = sortForCover(photos.filter((p) => !!p?.photo_url));
  return sorted[0]?.photo_url ?? null;
}

/** Sous-ensemble sans photo d'animal (utilisé pour le scoring IA). */
export function withoutAnimalPhotos<T extends CoverCandidate>(photos: T[]): T[] {
  return photos.filter((p) => p?.category !== "animals_life");
}
