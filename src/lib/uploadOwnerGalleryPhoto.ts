import { supabase } from "@/integrations/supabase/client";
import { compressImageFile } from "@/lib/compressImage";
import { getImageDimensions } from "@/lib/imageDimensions";
import { appendPropertyPhoto } from "@/lib/uploadOwnerPhoto";

/**
 * Envoi d'une photo dans la galerie du profil propriétaire : même stockage,
 * même compression, même branchement sur le logement que l'ajout en ligne
 * du parcours de création. Renvoie l'URL publique.
 */
export async function uploadOwnerGalleryPhoto(userId: string, file: File, position = 0): Promise<string> {
  const compressed = await compressImageFile(file, 5, 1200);
  const dims = await getImageDimensions(compressed);
  const ext = (compressed.name.split(".").pop() || "jpg").toLowerCase();
  const path = `${userId}/owner-gallery/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { error: uploadErr } = await supabase.storage.from("property-photos").upload(path, compressed);
  if (uploadErr) throw uploadErr;
  const { data: urlData } = supabase.storage.from("property-photos").getPublicUrl(path);
  const { error: insertErr } = await supabase.from("owner_gallery").insert({
    user_id: userId,
    photo_url: urlData.publicUrl,
    caption: "",
    category: "home_life" as any,
    season: null,
    position,
    width: dims.width || null,
    height: dims.height || null,
  } as any);
  if (insertErr) throw insertErr;
  // Branche aussi properties.photos / cover_photo_url (colonnes du logement).
  await appendPropertyPhoto(userId, urlData.publicUrl);
  return urlData.publicUrl;
}
