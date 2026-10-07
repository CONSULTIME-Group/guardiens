/**
 * Lot L2 : une photo du logement se gère à un seul endroit, la Galerie.
 *
 * La base (déclencheur trg_sync_owner_gallery_delete) retire la photo du
 * logement et remplace les couvertures par la photo suivante de la galerie.
 * Ce module reproduit la même règle côté interface pour annoncer, avant la
 * suppression, ce qui va se passer sur une annonce publiée.
 * Règle miroir de public.owner_gallery_next_cover : la première photo placée
 * après celle supprimée, sinon la première de la galerie, sinon aucune.
 */
export interface GalleryPhotoLite {
  id: string;
  photo_url: string;
  position: number;
  created_at: string;
}

export function nextCoverAfterRemoval(photos: GalleryPhotoLite[], removedId: string): GalleryPhotoLite | null {
  const removed = photos.find((p) => p.id === removedId);
  if (!removed) return null;
  const rest = photos.filter((p) => p.id !== removedId && p.photo_url !== removed.photo_url);
  if (rest.length === 0) return null;
  const sorted = [...rest].sort((a, b) => a.position - b.position || a.created_at.localeCompare(b.created_at));
  const after = sorted.find(
    (p) => p.position > removed.position || (p.position === removed.position && p.created_at > removed.created_at),
  );
  return after ?? sorted[0];
}

/** Message de confirmation quand la photo est la couverture d'une annonce publiée. */
export function publishedCoverWarning(sitTitle: string, hasReplacement: boolean): string {
  const title = (sitTitle || "").trim() || "sans titre";
  return `Cette photo est la couverture de votre annonce « ${title} ». Elle sera remplacée par ${
    hasReplacement ? "la photo suivante" : "aucune photo"
  }.`;
}

/** Chemin de stockage dans le compartiment property-photos, ou null. */
export function propertyPhotoStoragePath(url: string | null | undefined): string | null {
  const marker = "/property-photos/";
  const idx = url?.indexOf(marker) ?? -1;
  if (!url || idx < 0) return null;
  return decodeURIComponent(url.slice(idx + marker.length).split("?")[0]);
}
