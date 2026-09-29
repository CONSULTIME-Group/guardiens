import { useRef, useState } from "react";
import { uploadOwnerGalleryPhoto } from "@/lib/uploadOwnerGalleryPhoto";
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
      const url = await uploadOwnerGalleryPhoto(userId, file, nextPosition);
      onUploaded(url);
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
