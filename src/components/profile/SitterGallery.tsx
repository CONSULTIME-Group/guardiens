import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, Camera, X, CheckCircle2, Star, UploadCloud, Loader2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { logger } from "@/lib/logger";
import { compressGalleryFile } from "@/lib/compressImage";
import { storageImageUrl } from "@/lib/storageImage";
import { galleryPhotoAlt } from "@/lib/galleryPhotoAlt";
import { trackEvent } from "@/lib/analytics";
import { useTranslation } from "react-i18next";
import { uploadGalleryBatch, GALLERY_MAX_PHOTOS, type GalleryUploadResult } from "@/lib/galleryBatchUpload";
import { inferPhotoDate } from "@/lib/galleryPhotoDate";

const NO_SIT_VALUE = "__none__";
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const animalTypeOptions = [
  { value: "chien", label: "Chien" },
  { value: "chat", label: "Chat" },
  { value: "cheval", label: "Cheval" },
  { value: "nac", label: "NAC" },
  { value: "autre", label: "Autre" },
];

interface GalleryPhoto {
  id: string;
  photo_url: string;
  caption: string;
  animal_type: string | null;
  animal_breed: string | null;
  city: string | null;
  photo_date: string | null;
  source: "guardiens" | "external";
  sit_id: string | null;
}

interface PendingTile {
  index: number;
  fileName: string;
  previewUrl: string;
  state: "queued" | "uploading" | "done" | "error" | "skipped";
  message?: string;
  photo?: GalleryPhoto;
}

const SitterGallery = () => {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [photos, setPhotos] = useState<GalleryPhoto[]>([]);
  const [completedSits, setCompletedSits] = useState<{ id: string; title: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [lightboxPhoto, setLightboxPhoto] = useState<GalleryPhoto | null>(null);
  const [tiles, setTiles] = useState<PendingTile[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const [galleryRes, sitsRes] = await Promise.all([
        supabase.from("sitter_gallery").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
        supabase.from("applications").select("sit_id, sits!applications_sit_id_fkey(id, title)")
          .eq("sitter_id", user.id).eq("status", "accepted"),
      ]);
      setPhotos((galleryRes.data as any[]) || []);
      const sits = (sitsRes.data || [])
        .map((a: any) => ({ id: a.sits?.id, title: a.sits?.title }))
        .filter((s: any) => s.id && UUID_RE.test(s.id));
      setCompletedSits(sits);
      setLoading(false);
    };
    load();
  }, [user]);

  const handleFiles = useCallback(async (selected: File[]) => {
    if (!user || selected.length === 0 || uploading) return;
    const images = selected.filter(f => f.type.startsWith("image/") || /\.(jpe?g|png|webp|heic|heif)$/i.test(f.name));
    if (images.length === 0) return;

    setUploading(true);
    setTiles(images.map((f, i) => ({
      index: i,
      fileName: f.name,
      previewUrl: URL.createObjectURL(f),
      state: "queued",
    })));

    const existingCount = photos.length;

    const results = await uploadGalleryBatch<GalleryPhoto>(user.id, images, existingCount, {
      compress: (f) => compressGalleryFile(f),
      upload: async (path, f) => {
        const { error } = await supabase.storage.from("sitter-gallery").upload(path, f, { upsert: false });
        if (error) throw error;
      },
      publicUrl: (path) => supabase.storage.from("sitter-gallery").getPublicUrl(path).data.publicUrl,
      inferDate: (f) => inferPhotoDate(f),
      insertRow: async ({ photo_url, photo_date }) => {
        const { data, error } = await supabase.from("sitter_gallery").insert({
          user_id: user.id,
          photo_url,
          caption: "",
          animal_type: null,
          animal_breed: null,
          city: null,
          photo_date,
          source: "external" as const,
          sit_id: null,
        }).select().single();
        if (error) throw error;
        return data as unknown as GalleryPhoto;
      },
      onProgress: (index, state) => {
        setTiles(prev => prev.map(tl => (tl.index === index ? { ...tl, state: state === "done" ? "done" : state } : tl)));
      },
    });

    applyResults(results, images);
    setUploading(false);
    if (inputRef.current) inputRef.current.value = "";
  }, [user, uploading, photos.length]);

  const applyResults = (results: GalleryUploadResult<GalleryPhoto>[], images: File[]) => {
    // Collecte déterministe hors updater : un updater différé au render
    // laisserait added vide au moment du setPhotos et masquerait les uploads réussis.
    const added = results
      .filter((r): r is Extract<GalleryUploadResult<GalleryPhoto>, { status: "success" }> => r.status === "success")
      .sort((a, b) => b.index - a.index)
      .map(r => r.row);
    setTiles(prev => prev.map(tl => {
      const r = results.find(x => x.index === tl.index);
      if (!r) return tl;
      if (r.status === "success") {
        return { ...tl, state: "done", photo: r.row };
      }
      if (r.status === "skipped_limit") {
        return { ...tl, state: "skipped", message: "Plafond de 50 photos atteint" };
      }
      return { ...tl, state: "error", message: r.message };
    }));

    if (added.length > 0) setPhotos(prev => [...added, ...prev]);

    const failed = results.filter(r => r.status === "error") as Extract<GalleryUploadResult<GalleryPhoto>, { status: "error" }>[];
    const skipped = results.filter(r => r.status === "skipped_limit");

    if (added.length > 0) {
      toast.success(added.length === 1 ? "Photo ajoutée à votre galerie" : `${added.length} photos ajoutées à votre galerie`);
    }
    if (skipped.length > 0) {
      toast.warning(`Plafond de ${GALLERY_MAX_PHOTOS} photos atteint : ${skipped.length} fichier${skipped.length > 1 ? "s" : ""} non ajouté${skipped.length > 1 ? "s" : ""}.`);
    }
    for (const f of failed) {
      const src = images[f.index];
      logger.error("SitterGallery upload failed", { error: f.message, file: f.fileName });
      void trackEvent("sitter_gallery_upload_failed", {
        metadata: {
          ext: f.fileName.split(".").pop()?.toLowerCase() || "unknown",
          size_kb: src ? Math.round(src.size / 1024) : 0,
        },
      });
      toast.error(`${f.fileName} : ${t("upload.photo_failed")}`);
    }
  };

  const patchPhoto = async (id: string, patch: Partial<GalleryPhoto>) => {
    setPhotos(prev => prev.map(p => (p.id === id ? { ...p, ...patch } : p)));
    setTiles(prev => prev.map(tl => (tl.photo?.id === id ? { ...tl, photo: { ...tl.photo, ...patch } as GalleryPhoto } : tl)));
    const { error } = await supabase.from("sitter_gallery").update(patch as any).eq("id", id);
    if (error) toast.error("Détail non enregistré, réessayez dans un instant.");
  };

  const handleDelete = async (photo: GalleryPhoto) => {
    const urlParts = photo.photo_url.split("/sitter-gallery/");
    if (urlParts[1]) {
      await supabase.storage.from("sitter-gallery").remove([urlParts[1]]);
    }
    await supabase.from("sitter_gallery").delete().eq("id", photo.id);
    setPhotos(prev => prev.filter(p => p.id !== photo.id));
    setTiles(prev => prev.filter(tl => tl.photo?.id !== photo.id));
    toast.success("Photo supprimée.");
  };

  const handleSetAsMain = async (photo: GalleryPhoto) => {
    if (!user) return;
    const { error } = await supabase.from("profiles").update({ avatar_url: photo.photo_url }).eq("id", user.id);
    if (error) {
      toast.error("Impossible de définir cette photo comme principale.");
      return;
    }
    toast.success("Photo principale mise à jour.");
    window.dispatchEvent(new Event("profile:avatar-changed"));
  };

  const closeDialog = (open: boolean) => {
    setDialogOpen(open);
    if (!open) {
      tiles.forEach(tl => URL.revokeObjectURL(tl.previewUrl));
      setTiles([]);
    }
  };

  if (loading) return <div className="text-muted-foreground text-sm py-8 text-center">Chargement...</div>;

  const remaining = Math.max(0, GALLERY_MAX_PHOTOS - photos.length);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-heading text-xl font-bold">Ma galerie</h2>
          <p className="text-sm text-muted-foreground">{photos.length}/50 photos · Vous avec des animaux, votre quotidien, vos expériences de garde : c'est ce que les propriétaires regardent en premier.</p>
          <p className="text-sm text-muted-foreground mt-1">Vos photos ne sont visibles que par les membres connectés de Guardiens. Elles n'apparaissent pas dans les moteurs de recherche.</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={closeDialog}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-1.5" disabled={photos.length >= GALLERY_MAX_PHOTOS}>
              <Plus className="h-4 w-4" /> Ajouter des photos
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Ajouter des photos</DialogTitle>
              <DialogDescription>
                Déposez plusieurs photos d'un coup. Elles partent immédiatement, vous pourrez les décrire ensuite si vous le souhaitez.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div
                role="button"
                tabIndex={0}
                aria-label="Déposer des photos ou parcourir vos fichiers"
                onClick={() => inputRef.current?.click()}
                onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") inputRef.current?.click(); }}
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragOver(false);
                  void handleFiles(Array.from(e.dataTransfer.files || []));
                }}
                className={`flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-6 py-8 text-center transition-colors ${dragOver ? "border-primary bg-primary/5" : "border-border bg-muted/30"}`}
              >
                <UploadCloud className="h-6 w-6 text-muted-foreground" aria-hidden="true" />
                <p className="text-sm font-medium">Glissez vos photos ici, ou cliquez pour les choisir</p>
                <p className="text-xs text-muted-foreground">
                  Sélection multiple possible (touche Maj). JPG ou PNG, redimensionnées automatiquement. {remaining} emplacement{remaining > 1 ? "s" : ""} restant{remaining > 1 ? "s" : ""}.
                </p>
                <Input
                  ref={inputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  className="sr-only"
                  onChange={(e) => void handleFiles(Array.from(e.target.files || []))}
                />
              </div>

              {tiles.length > 0 && (
                <div className="space-y-3">
                  {tiles.map(tile => (
                    <div key={tile.index} className="flex gap-3 rounded-lg border border-border p-3">
                      <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-md bg-muted">
                        <img src={tile.previewUrl} alt="" className="h-full w-full object-cover" />
                        {(tile.state === "queued" || tile.state === "uploading") && (
                          <div className="absolute inset-0 flex items-center justify-center bg-background/70">
                            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1 space-y-2">
                        <p className="truncate text-xs text-muted-foreground">{tile.fileName}</p>
                        {tile.state === "error" && (
                          <p className="flex items-center gap-1.5 text-xs text-destructive">
                            <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />
                            Envoi impossible pour {tile.fileName}. Réessayez dans un instant.
                          </p>
                        )}
                        {tile.state === "skipped" && (
                          <p className="text-xs text-muted-foreground">{tile.message}</p>
                        )}
                        {tile.state === "done" && tile.photo && (
                          <div className="space-y-2">
                            <div>
                              <Label className="text-xs">Légende (facultatif)</Label>
                              <Textarea
                                rows={2}
                                defaultValue={tile.photo.caption || ""}
                                placeholder="Ex : Luna, golden retriever, 2 semaines à Annecy"
                                onBlur={(e) => {
                                  const v = e.target.value.trim();
                                  if (v !== (tile.photo?.caption || "")) void patchPhoto(tile.photo!.id, { caption: v });
                                }}
                              />
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <Label className="text-xs">Type d'animal</Label>
                                <Select
                                  value={tile.photo.animal_type || ""}
                                  onValueChange={(v) => void patchPhoto(tile.photo!.id, { animal_type: v || null })}
                                >
                                  <SelectTrigger><SelectValue placeholder="Choisir" /></SelectTrigger>
                                  <SelectContent>
                                    {animalTypeOptions.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                                  </SelectContent>
                                </Select>
                              </div>
                              <div>
                                <Label className="text-xs">Race</Label>
                                <Input
                                  defaultValue={tile.photo.animal_breed || ""}
                                  placeholder="Golden Retriever"
                                  onBlur={(e) => {
                                    const v = e.target.value.trim();
                                    if (v !== (tile.photo?.animal_breed || "")) void patchPhoto(tile.photo!.id, { animal_breed: v || null });
                                  }}
                                />
                              </div>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <Label className="text-xs">Ville</Label>
                                <Input
                                  defaultValue={tile.photo.city || ""}
                                  placeholder="Annecy"
                                  onBlur={(e) => {
                                    const v = e.target.value.trim();
                                    if (v !== (tile.photo?.city || "")) void patchPhoto(tile.photo!.id, { city: v || null });
                                  }}
                                />
                              </div>
                              <div>
                                <Label className="text-xs">Date</Label>
                                <Input
                                  type="month"
                                  value={(tile.photo.photo_date || "").slice(0, 7)}
                                  onChange={(e) => {
                                    const v = e.target.value;
                                    void patchPhoto(tile.photo!.id, { photo_date: /^\d{4}-\d{2}$/.test(v) ? `${v}-01` : null });
                                  }}
                                />
                              </div>
                            </div>
                            {completedSits.length > 0 && (
                              <div>
                                <Label className="text-xs">Lier à une garde Guardiens</Label>
                                <Select
                                  value={tile.photo.sit_id || NO_SIT_VALUE}
                                  onValueChange={(v) => {
                                    const sitId = v === NO_SIT_VALUE ? null : v;
                                    void patchPhoto(tile.photo!.id, { sit_id: sitId, source: sitId ? "guardiens" : "external" });
                                  }}
                                >
                                  <SelectTrigger><SelectValue placeholder="Aucune (expérience passée)" /></SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value={NO_SIT_VALUE}>Aucune (expérience passée)</SelectItem>
                                    {completedSits.map(s => <SelectItem key={s.id} value={s.id}>{s.title}</SelectItem>)}
                                  </SelectContent>
                                </Select>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <Button variant="outline" className="w-full" onClick={() => closeDialog(false)} disabled={uploading}>
                {uploading ? "Envoi en cours..." : "Terminer"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {photos.length > 0 && photos.length < 4 && (
        <p className="mb-4 rounded-lg border border-border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
          {photos.length === 1
            ? "Bon début. Les propriétaires choisissent plus souvent les gardiens qui montrent plusieurs instants : ajoutez deux ou trois photos (animaux gardés, quotidien, balades)."
            : `Votre galerie compte ${photos.length} photos. Quatre photos ou plus donnent une vraie confiance : ajoutez encore ${4 - photos.length} instant${photos.length === 3 ? "" : "s"}.`}
        </p>
      )}

      {photos.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Camera className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">Un gardien avec des photos est choisi, un gardien sans photo ne l'est presque jamais. Ajoutez plusieurs instants : vous avec des animaux, votre quotidien, vos expériences de garde.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {photos.map(photo => (
            <div key={photo.id} className="group relative aspect-square rounded-xl overflow-hidden cursor-pointer" onClick={() => setLightboxPhoto(photo)}>
              <img src={storageImageUrl(photo.photo_url, { width: 306, height: 306 })} alt={galleryPhotoAlt(photo)} className="w-full h-full object-cover transition-transform group-hover:scale-105" />
              {/* Badge */}
              <span className={`absolute top-2 left-2 px-2 py-0.5 rounded-full text-xs font-medium ${photo.source === "guardiens" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                {photo.source === "guardiens" ? "Guardiens" : "Expérience passée"}
              </span>
              {/* Overlay on hover */}
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-3">
                <p className="text-white text-xs line-clamp-2">{photo.caption}</p>
                {(photo.city || photo.photo_date) && (
                  <p className="text-white/70 text-xs mt-0.5">{[photo.city, photo.photo_date].filter(Boolean).join(" · ")}</p>
                )}
              </div>
              {/* Actions */}
              <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={(e) => { e.stopPropagation(); handleSetAsMain(photo); }}
                  className="p-1.5 rounded-full bg-background/90 text-foreground hover:bg-background"
                  title="Définir comme photo principale"
                  aria-label="Définir comme photo principale"
                >
                  <Star className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); handleDelete(photo); }}
                  className="p-1.5 rounded-full bg-destructive/80 text-destructive-foreground"
                  title="Supprimer"
                  aria-label="Supprimer la photo"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Lightbox */}
      {lightboxPhoto && (
        <Dialog open={!!lightboxPhoto} onOpenChange={() => setLightboxPhoto(null)}>
          <DialogContent className="max-w-2xl p-0 overflow-hidden">
            <DialogTitle className="sr-only">{lightboxPhoto.caption || "Photo"}</DialogTitle>
            <DialogDescription className="sr-only">Aperçu agrandi de la photo de la galerie.</DialogDescription>
            <div className="relative">
              <img src={storageImageUrl(lightboxPhoto.photo_url, { width: 1600, height: 1600, resize: "contain" })} alt={galleryPhotoAlt(lightboxPhoto)} className="w-full max-h-[70vh] object-contain bg-black" />
              <button onClick={() => setLightboxPhoto(null)} className="absolute top-3 right-3 p-2 rounded-full bg-black/60 text-white hover:bg-black/80">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="p-4 space-y-1">
              <p className="font-medium text-sm">{lightboxPhoto.caption}</p>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                {lightboxPhoto.animal_type && <span className="capitalize">{lightboxPhoto.animal_type}</span>}
                {lightboxPhoto.animal_breed && <span>· {lightboxPhoto.animal_breed}</span>}
                {lightboxPhoto.city && <span>· {lightboxPhoto.city}</span>}
                {lightboxPhoto.photo_date && <span>· {lightboxPhoto.photo_date}</span>}
              </div>
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${lightboxPhoto.source === "guardiens" ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
                {lightboxPhoto.source === "guardiens" ? <><CheckCircle2 className="h-3 w-3" /> Guardiens</> : "Expérience passée"}
              </span>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default SitterGallery;
