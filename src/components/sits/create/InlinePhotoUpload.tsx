import { useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { compressImageFile } from "@/lib/compressImage";
import { getImageDimensions } from "@/lib/imageDimensions";
import { appendPropertyPhoto } from "@/lib/uploadOwnerPhoto";
import { Button } from "@/components/ui/button";
import { UploadCloud } from "lucide-react";
import { toast } from "sonner";

interface Props {
  userId: string;
  /** Position de départ dans la galerie, pour ne pas écraser l'ordre existant. */
  nextPosition?: number;
  label?: string;
  onUploaded: (url: string) => void;
}

/**
 * Ajout d'une photo sans quitter le parcours de création d'annonce. La photo
 * rejoint la galerie du profil, source unique des photos du propriétaire.
 */
const InlinePhotoUpload = ({ userId, nextPosition = 0, label = "Ajouter une photo", onUploaded }: Props) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleFile = async (file: File) => {
    setUploading(true);
    try {
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
        position: nextPosition,
        width: dims.width || null,
        height: dims.height || null,
      } as any);
      if (insertErr) throw insertErr;
      // Branche aussi properties.photos / cover_photo_url (colonnes du
      // logement), comme le parcours photo guidé : sans cette écriture les
      // colonnes restent vides et l'annonce ne remonte pas dans le
      // classement vu par les gardiens.
      await appendPropertyPhoto(userId, urlData.publicUrl);
      onUploaded(urlData.publicUrl);
      toast.success("Photo ajoutée à votre galerie");
    } catch (e: any) {
      console.error("[InlinePhotoUpload] upload failed", e);
      toast.error("Photo non ajoutée", {
        description: e?.message || "Réessayez dans un instant, votre saisie est conservée.",
      });
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="sr-only"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void handleFile(f);
        }}
      />
      <Button
        type="button"
        variant="outline"
        className="gap-2"
        disabled={uploading}
        onClick={() => inputRef.current?.click()}
      >
        <UploadCloud className="h-4 w-4" aria-hidden="true" />
        {uploading ? "Envoi en cours…" : label}
      </Button>
    </div>
  );
};

export default InlinePhotoUpload;
