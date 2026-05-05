/**
 * SitPhotoManager — gestion intégrée des photos & couverture sur la fiche annonce owner.
 *
 * Périmètre :
 *  - Affiche les photos de la galerie propriétaire (`owner_gallery`).
 *  - Permet de définir la photo de couverture de CETTE annonce (sit.cover_photo_url).
 *    Cette photo est utilisée dans les listes / résultats de recherche / partage.
 *  - Permet d'uploader de nouvelles photos directement depuis la fiche
 *    (compression + bucket property-photos + insert owner_gallery).
 *  - Lien direct vers la galerie complète pour réorganiser / supprimer en masse.
 *
 * Source de vérité = `owner_gallery`. Le hero immersif `SitImmersiveContent`
 * reste branché sur `property.photos` (autre bataille).
 */
import { useState } from "react";
import { Link } from "react-router-dom";
import { Image as ImageIcon, Plus, Loader2, Star, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { compressImageFile } from "@/lib/compressImage";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface GalleryPhoto {
  id: string;
  photo_url: string;
}

interface SitPhotoManagerProps {
  sitId: string;
  ownerId: string;
  initialCoverPhotoUrl: string | null;
  initialGallery: GalleryPhoto[];
  /** Notifié quand la couverture change pour resync du parent. */
  onCoverChange?: (url: string | null) => void;
}

const SitPhotoManager = ({
  sitId,
  ownerId,
  initialCoverPhotoUrl,
  initialGallery,
  onCoverChange,
}: SitPhotoManagerProps) => {
  const { toast } = useToast();
  const [gallery, setGallery] = useState<GalleryPhoto[]>(initialGallery);
  const [coverUrl, setCoverUrl] = useState<string | null>(initialCoverPhotoUrl);
  const [savingCover, setSavingCover] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const effectiveCover = coverUrl || gallery[0]?.photo_url || null;

  const handleSetCover = async (url: string) => {
    if (savingCover) return;
    const previous = coverUrl;
    setCoverUrl(url);
    setSavingCover(url);
    const { error } = await supabase
      .from("sits")
      .update({ cover_photo_url: url } as any)
      .eq("id", sitId)
      .eq("user_id", ownerId);
    setSavingCover(null);
    if (error) {
      setCoverUrl(previous);
      toast({
        variant: "destructive",
        title: "Couverture non enregistrée",
        description: "Réessayez dans un instant.",
      });
      return;
    }
    onCoverChange?.(url);
    toast({ title: "Photo de couverture mise à jour" });
  };

  const handleUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    if (gallery.length + files.length > 30) {
      toast({
        variant: "destructive",
        title: "Limite atteinte",
        description: "Votre galerie ne peut pas dépasser 30 photos.",
      });
      return;
    }
    setUploading(true);
    const inserted: GalleryPhoto[] = [];
    try {
      for (const file of Array.from(files)) {
        try {
          const compressed = await compressImageFile(file, 5, 1200);
          const ext = (compressed.type.split("/")[1] || "jpg").replace("jpeg", "jpg");
          const path = `${ownerId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
          const { error: upErr } = await supabase.storage
            .from("property-photos")
            .upload(path, compressed);
          if (upErr) throw upErr;
          const { data: urlData } = supabase.storage.from("property-photos").getPublicUrl(path);
          const photo_url = urlData.publicUrl;

          const nextPosition = gallery.length + inserted.length;
          const { data: row, error: insErr } = await supabase
            .from("owner_gallery")
            .insert({
              user_id: ownerId,
              photo_url,
              position: nextPosition,
            } as any)
            .select("id, photo_url")
            .single();
          if (insErr) throw insErr;
          inserted.push(row as GalleryPhoto);
        } catch {
          // continue with the rest
        }
      }
      if (inserted.length > 0) {
        setGallery((prev) => [...prev, ...inserted]);
        toast({
          title: `${inserted.length} photo${inserted.length > 1 ? "s" : ""} ajoutée${inserted.length > 1 ? "s" : ""}`,
          description: "Cliquez sur une photo pour en faire la couverture de l'annonce.",
        });
      }
    } finally {
      setUploading(false);
    }
  };

  return (
    <section
      aria-labelledby="sit-photo-manager-title"
      className="mb-6 rounded-2xl border border-border bg-card p-5 md:p-6"
    >
      <div className="flex flex-wrap items-start justify-between gap-3 mb-2">
        <div>
          <h2
            id="sit-photo-manager-title"
            className="text-lg font-semibold flex items-center gap-2"
          >
            <ImageIcon className="h-5 w-5 text-primary" /> Photos & couverture
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            La photo de couverture apparaît dans les résultats de recherche et lors d'un partage.
            Cliquez sur une photo pour la définir comme couverture.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <label className="inline-flex">
            <input
              type="file"
              multiple
              accept="image/*"
              className="sr-only"
              disabled={uploading}
              onChange={(e) => {
                handleUpload(e.target.files);
                e.target.value = "";
              }}
            />
            <span
              className={cn(
                "inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-3 py-1.5 text-sm font-medium cursor-pointer hover:bg-accent transition-colors",
                uploading && "opacity-60 pointer-events-none",
              )}
            >
              {uploading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Envoi…
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4" /> Ajouter des photos
                </>
              )}
            </span>
          </label>
        </div>
      </div>

      {gallery.length === 0 ? (
        <div className="mt-4 rounded-xl border border-dashed border-border bg-muted/30 p-6 text-center">
          <p className="text-sm text-foreground font-medium mb-1">
            Aucune photo dans votre galerie
          </p>
          <p className="text-xs text-muted-foreground mb-4">
            Une annonce avec photos reçoit en moyenne plus de candidatures.
          </p>
          <label className="inline-flex">
            <input
              type="file"
              multiple
              accept="image/*"
              className="sr-only"
              onChange={(e) => {
                handleUpload(e.target.files);
                e.target.value = "";
              }}
            />
            <span className="inline-flex items-center gap-1.5 rounded-md bg-primary text-primary-foreground px-3 py-1.5 text-sm font-medium cursor-pointer hover:bg-primary/90">
              <Plus className="h-4 w-4" /> Ajouter mes premières photos
            </span>
          </label>
        </div>
      ) : (
        <div className="mt-4 grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
          {gallery.map((p) => {
            const isCover = effectiveCover === p.photo_url;
            const isSaving = savingCover === p.photo_url;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => handleSetCover(p.photo_url)}
                disabled={isSaving}
                aria-label={
                  isCover
                    ? "Photo de couverture actuelle"
                    : "Définir comme photo de couverture"
                }
                aria-pressed={isCover}
                className={cn(
                  "group relative aspect-[4/3] w-full overflow-hidden rounded-lg border-2 transition-all",
                  isCover
                    ? "border-primary ring-2 ring-primary/30"
                    : "border-transparent hover:border-primary/50",
                )}
              >
                <img
                  src={p.photo_url}
                  alt=""
                  loading="lazy"
                  className="w-full h-full object-cover"
                />
                {isCover && (
                  <span className="absolute bottom-0 inset-x-0 bg-primary text-primary-foreground text-[10px] font-medium py-0.5 px-1 flex items-center justify-center gap-1">
                    <Star className="h-3 w-3 fill-current" /> Couverture
                  </span>
                )}
                {!isCover && (
                  <span className="absolute inset-0 bg-foreground/0 group-hover:bg-foreground/30 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                    <span className="bg-background text-foreground text-[10px] font-medium px-2 py-1 rounded-full shadow flex items-center gap-1">
                      <Check className="h-3 w-3" /> Définir
                    </span>
                  </span>
                )}
                {isSaving && (
                  <span className="absolute inset-0 bg-background/60 flex items-center justify-center">
                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
        <span>
          {gallery.length} / 30 photo{gallery.length > 1 ? "s" : ""} dans votre galerie
        </span>
        <Link
          to={`/owner-profile?from=sit:${sitId}#galerie`}
          className="text-primary hover:underline"
        >
          Réorganiser ou supprimer mes photos →
        </Link>
      </div>
    </section>
  );
};

export default SitPhotoManager;
