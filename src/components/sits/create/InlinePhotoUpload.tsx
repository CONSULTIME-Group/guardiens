import { useRef, useState } from "react";
import { photoUploadErrorMessage, uploadOwnerGalleryPhoto } from "@/lib/uploadOwnerGalleryPhoto";
import { Button } from "@/components/ui/button";
import { UploadCloud } from "lucide-react";
import { toast } from "sonner";
import { analyzeHomePhoto } from "@/lib/homePhotos";

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
 * Lot PHOTO1 : la photo est analysée juste après l'ajout (ce qu'elle montre,
 * netteté, lumière, rangement) et un conseil s'affiche sous le bouton.
 */
const InlinePhotoUpload = ({ userId, nextPosition = 0, label = "Ajouter une photo", onUploaded }: Props) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [tip, setTip] = useState<string | null>(null);

  const handleFile = async (file: File) => {
    setUploading(true);
    try {
      const url = await uploadOwnerGalleryPhoto(userId, file, nextPosition);
      onUploaded(url);
      toast.success("Photo ajoutée à votre galerie");
      setTip(null);
      void analyzeHomePhoto(userId, url).then((r) => setTip(r?.tip ?? null));
    } catch (e: any) {
      console.error("[InlinePhotoUpload] upload failed", e);
      toast.error(photoUploadErrorMessage(e));
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
      <p role="status" aria-live="polite" className="mt-2 text-sm text-muted-foreground empty:hidden" data-testid="home-photo-tip">
        {tip ?? ""}
      </p>
    </div>
  );
};

export default InlinePhotoUpload;
