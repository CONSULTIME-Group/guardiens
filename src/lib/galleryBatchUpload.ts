/**
 * Dépôt multiple dans la galerie gardien.
 *
 * Logique pure et injectable : un résultat par fichier, un échec isolé
 * n'empêche jamais les autres d'aboutir, et le plafond de 50 photos porte sur
 * le total après ajout, pas sur chaque fichier pris isolément.
 */

export const GALLERY_MAX_PHOTOS = 50;

export interface GalleryUploadDeps<TRow> {
  /** Compression déjà existante (compressGalleryFile), réutilisée telle quelle. */
  compress: (file: File) => Promise<File>;
  upload: (path: string, file: File) => Promise<void>;
  publicUrl: (path: string) => string;
  insertRow: (row: { photo_url: string; photo_date: string | null }) => Promise<TRow>;
  /** Date déduite (EXIF puis nom de fichier), jamais la date du jour. */
  inferDate: (file: File) => Promise<string | null>;
  /** Discriminant du chemin, injectable pour les tests. */
  randomSuffix?: () => string;
  onProgress?: (index: number, state: "uploading" | "done" | "error") => void;
}

export type GalleryUploadResult<TRow> =
  | { index: number; fileName: string; status: "success"; row: TRow }
  | { index: number; fileName: string; status: "error"; message: string }
  | { index: number; fileName: string; status: "skipped_limit" };

const defaultRandom = () => Math.random().toString(36).slice(2, 8);

/**
 * Construit un chemin de stockage unique même si dix fichiers tombent sur la
 * même milliseconde : horodatage, index de boucle, suffixe aléatoire.
 */
export function buildGalleryPath(userId: string, fileName: string, index: number, suffix: string): string {
  const ext = (fileName.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
  return `${userId}/${Date.now()}-${index}-${suffix}.${ext}`;
}

export async function uploadGalleryBatch<TRow>(
  userId: string,
  files: File[],
  existingCount: number,
  deps: GalleryUploadDeps<TRow>,
): Promise<GalleryUploadResult<TRow>[]> {
  const rand = deps.randomSuffix || defaultRandom;
  const available = Math.max(0, GALLERY_MAX_PHOTOS - existingCount);
  const results: GalleryUploadResult<TRow>[] = [];

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    if (i >= available) {
      results.push({ index: i, fileName: file.name, status: "skipped_limit" });
      continue;
    }
    deps.onProgress?.(i, "uploading");
    try {
      const compressed = await deps.compress(file);
      const path = buildGalleryPath(userId, compressed.name || file.name, i, rand());
      await deps.upload(path, compressed);
      const url = deps.publicUrl(path);
      const photoDate = await deps.inferDate(file).catch(() => null);
      const row = await deps.insertRow({ photo_url: url, photo_date: photoDate });
      results.push({ index: i, fileName: file.name, status: "success", row });
      deps.onProgress?.(i, "done");
    } catch (err: unknown) {
      results.push({
        index: i,
        fileName: file.name,
        status: "error",
        message: err instanceof Error ? err.message : String(err),
      });
      deps.onProgress?.(i, "error");
    }
  }

  return results;
}
