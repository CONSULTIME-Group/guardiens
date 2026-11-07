import { supabase } from "@/integrations/supabase/client";
import { compressImageFile } from "@/lib/compressImage";
import { getImageDimensions } from "@/lib/imageDimensions";
import { appendPropertyPhoto } from "@/lib/uploadOwnerPhoto";


/**
 * Lot PUB2 (07/11/2026) : photo que le navigateur ne sait pas lire (fichier
 * abîmé, format non pris en charge). Réessayer le même fichier n'y change
 * rien, le message le dit (photoUploadErrorMessage).
 */
export class PhotoUnreadableError extends Error {
  constructor() {
    super("photo_unreadable");
    this.name = "PhotoUnreadableError";
  }
}

export const PHOTO_UNREADABLE_MESSAGE =
  "Cette photo ne peut pas être lue. Choisissez une photo au format JPEG ou PNG, ou prenez-en une avec l'appareil photo.";
export const PHOTO_UPLOAD_INTERRUPTED_MESSAGE = "Envoi de la photo interrompu. Réessayez.";

export function photoUploadErrorMessage(error: unknown): string {
  return error instanceof PhotoUnreadableError ? PHOTO_UNREADABLE_MESSAGE : PHOTO_UPLOAD_INTERRUPTED_MESSAGE;
}

/**
 * Envoi d'une photo dans la galerie du profil propriétaire : même stockage,
 * même compression, même branchement sur le logement que l'ajout en ligne
 * du parcours de création. Renvoie l'URL publique.
 */
export async function uploadOwnerGalleryPhoto(userId: string, file: File, position = 0): Promise<string> {
  let compressed: File;
  try {
    compressed = await compressImageFile(file, 5, 1200);
  } catch {
    throw new PhotoUnreadableError();
  }
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
  // Un échec ici ne remet pas en cause la photo déjà en galerie : journalisé seulement.
  try {
    await appendPropertyPhoto(userId, urlData.publicUrl);
  } catch (e) {
    console.error("[uploadOwnerGalleryPhoto] appendPropertyPhoto failed", e);
  }
  return urlData.publicUrl;
}
