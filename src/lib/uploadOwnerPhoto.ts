import { supabase } from "@/integrations/supabase/client";
import { compressImageFile } from "@/lib/compressImage";
import { getImageDimensions } from "@/lib/imageDimensions";
import type { OwnerGalleryCategory } from "@/lib/photoJourney";

/**
 * Envoi d'une photo de logement.
 *
 * Écrit dans les deux emplacements attendus :
 *  1. `owner_gallery`, source unique lue par les annonces et les pages publiques ;
 *  2. `properties.photos` (et `properties.cover_photo_url` si vide), colonnes
 *     restées vides jusqu'ici faute d'écriture côté interface.
 */
export interface UploadOwnerPhotoResult {
  url: string;
}

export async function uploadOwnerPhoto(params: {
  userId: string;
  file: File;
  category: OwnerGalleryCategory;
  caption?: string;
  position?: number;
}): Promise<UploadOwnerPhotoResult> {
  const { userId, file, category, caption = "", position = 0 } = params;

  const compressed = await compressImageFile(file, 5, 1200);
  const dims = await getImageDimensions(compressed);
  const ext = (compressed.name.split(".").pop() || "jpg").toLowerCase();
  const path = `${userId}/owner-gallery/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

  const { error: uploadErr } = await supabase.storage.from("property-photos").upload(path, compressed);
  if (uploadErr) throw uploadErr;

  const { data: urlData } = supabase.storage.from("property-photos").getPublicUrl(path);
  const url = urlData.publicUrl;

  const { error: insertErr } = await supabase.from("owner_gallery").insert({
    user_id: userId,
    photo_url: url,
    caption,
    category: category as never,
    season: null,
    position,
    width: dims.width || null,
    height: dims.height || null,
  } as never);
  if (insertErr) throw insertErr;

  await appendPropertyPhoto(userId, url);

  return { url };
}

/** Ajoute l'URL au logement du propriétaire, en créant la ligne si besoin. */
export async function appendPropertyPhoto(userId: string, url: string): Promise<void> {
  const { data: prop, error } = await supabase
    .from("properties")
    .select("id, photos, cover_photo_url")
    .eq("user_id", userId)
    .limit(1)
    .maybeSingle();
  if (error) throw error;

  if (!prop) {
    const { error: insErr } = await supabase
      .from("properties")
      .insert({ user_id: userId, photos: [url], cover_photo_url: url });
    if (insErr) throw insErr;
    return;
  }

  const current = Array.isArray(prop.photos) ? (prop.photos as string[]) : [];
  if (current.includes(url)) return;

  const { error: updErr } = await supabase
    .from("properties")
    .update({
      photos: [...current, url],
      cover_photo_url: prop.cover_photo_url || url,
    })
    .eq("id", prop.id);
  if (updErr) throw updErr;
}
