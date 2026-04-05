import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { compressImageFile } from "@/lib/compressImage";
import { Button } from "@/components/ui/button";
import { ImagePlus, X, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const ACCEPTED = ".jpg,.jpeg,.png,.webp";
const MAX_PHOTOS = 3;

interface MissionPhotoUploadProps {
  userId: string;
  photos: string[];
  onChange: (photos: string[]) => void;
}

const MissionPhotoUpload = ({ userId, photos, onChange }: MissionPhotoUploadProps) => {
  const { toast } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleFiles = async (files: FileList | null) => {
    if (!files || !files.length) return;
    const remaining = MAX_PHOTOS - photos.length;
    if (remaining <= 0) {
      toast({ title: "Maximum atteint", description: `Vous pouvez ajouter ${MAX_PHOTOS} photos maximum.`, variant: "destructive" });
      return;
    }

    setUploading(true);
    const newUrls: string[] = [];

    for (let i = 0; i < Math.min(files.length, remaining); i++) {
      const file = files[i];
      if (!file.type.startsWith("image/")) continue;

      try {
        const compressed = await compressImageFile(file, 2, 1600);
        const ext = compressed.name.split(".").pop() || "jpg";
        const path = `${userId}/${crypto.randomUUID()}.${ext}`;

        const { error } = await supabase.storage.from("mission-photos").upload(path, compressed);
        if (error) throw error;

        const { data: urlData } = supabase.storage.from("mission-photos").getPublicUrl(path);
        newUrls.push(urlData.publicUrl);
      } catch {
        toast({ title: "Erreur", description: "Impossible d'envoyer la photo.", variant: "destructive" });
      }
    }

    if (newUrls.length) onChange([...photos, ...newUrls]);
    setUploading(false);
    if (inputRef.current) inputRef.current.value = "";
  };

  const handleRemove = (index: number) => {
    onChange(photos.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-3">
        {photos.map((url, i) => (
          <div key={url} className="relative w-24 h-24 rounded-lg overflow-hidden border border-border group">
            <img src={url} alt="" className="w-full h-full object-cover" />
            <button
              type="button"
              onClick={() => handleRemove(i)}
              className="absolute top-1 right-1 w-6 h-6 rounded-full bg-background/80 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}

        {photos.length < MAX_PHOTOS && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="w-24 h-24 rounded-lg border-2 border-dashed border-border flex flex-col items-center justify-center gap-1 text-muted-foreground hover:border-primary/50 hover:text-primary transition-colors"
          >
            {uploading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <>
                <ImagePlus className="h-5 w-5" />
                <span className="text-[10px]">Ajouter</span>
              </>
            )}
          </button>
        )}
      </div>

      <p className="text-xs text-muted-foreground">{photos.length}/{MAX_PHOTOS} photos</p>

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED}
        multiple
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />
    </div>
  );
};

export default MissionPhotoUpload;
