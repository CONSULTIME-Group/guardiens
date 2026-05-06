/**
 * Revalidation automatique de l'indexation SEO des annonces.
 *
 * Mesure (côté navigateur) les dimensions réelles des photos `owner_gallery`
 * dont `width`/`height` sont encore `NULL` et les persiste en base.
 * Une fois remplies, le filtre `isIndexable` (≥800×600) sur les pages
 * publiques `/annonces/:id` se réévalue automatiquement au prochain rendu.
 *
 * Déclenché silencieusement quand l'owner consulte sa galerie ou sa fiche
 * annonce — pas d'impact UX, pas de toast, pas de re-render bloquant.
 */
import { supabase } from "@/integrations/supabase/client";

interface GalleryRow {
  id: string;
  photo_url: string;
  width: number | null;
  height: number | null;
}

const measureFromUrl = (url: string): Promise<{ width: number; height: number } | null> =>
  new Promise((resolve) => {
    try {
      const img = new Image();
      // Photos servies depuis le bucket public — pas besoin de credentials.
      img.crossOrigin = "anonymous";
      img.onload = () => {
        const w = img.naturalWidth || img.width || 0;
        const h = img.naturalHeight || img.height || 0;
        resolve(w && h ? { width: w, height: h } : null);
      };
      img.onerror = () => resolve(null);
      img.src = url;
    } catch {
      resolve(null);
    }
  });

/**
 * Backfill silencieux des dimensions manquantes pour un owner.
 * @returns nombre de lignes effectivement mises à jour.
 */
export async function backfillOwnerGalleryDimensions(ownerId: string): Promise<number> {
  if (!ownerId) return 0;
  const { data, error } = await supabase
    .from("owner_gallery")
    .select("id, photo_url, width, height")
    .eq("user_id", ownerId)
    .or("width.is.null,height.is.null")
    .limit(50);

  if (error || !data || data.length === 0) return 0;

  let updated = 0;
  for (const row of data as GalleryRow[]) {
    const dims = await measureFromUrl(row.photo_url);
    if (!dims) continue;
    const { error: updErr } = await supabase
      .from("owner_gallery")
      .update({ width: dims.width, height: dims.height } as any)
      .eq("id", row.id);
    if (!updErr) updated += 1;
  }
  return updated;
}
