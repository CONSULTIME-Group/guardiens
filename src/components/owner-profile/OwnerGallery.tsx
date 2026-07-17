import { useState, useRef, useEffect, useCallback } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { compressImageFile } from "@/lib/compressImage";
import { getImageDimensions } from "@/lib/imageDimensions";
import { backfillOwnerGalleryDimensions } from "@/lib/backfillGalleryDimensions";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2, ArrowLeft, Info, GripVertical, UploadCloud, Pencil, Check, X, Star } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import PhotoTipsAlert from "./PhotoTipsAlert";
import PhotoQualityChecker from "./PhotoQualityChecker";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

const CATEGORIES = [
  { value: "home_life", label: "La vie à la maison" },
  { value: "animals_life", label: "Vos animaux au quotidien" },
  { value: "garden", label: "Le jardin / extérieur" },
  { value: "neighborhood", label: "Le quartier" },
  { value: "seasonal", label: "Au fil des saisons" },
];

const SEASONS = [
  { value: "printemps", label: "Printemps" },
  { value: "été", label: "Été" },
  { value: "automne", label: "Automne" },
  { value: "hiver", label: "Hiver" },
];

const MAX_PHOTOS = 30;

interface GalleryPhoto {
  id: string;
  photo_url: string;
  caption: string;
  category: string;
  season: string | null;
  position: number;
  created_at: string;
}

interface SortablePhotoProps {
  photo: GalleryPhoto;
  onDelete: (id: string) => void;
  onEditCaption: (id: string, caption: string) => void;
  onSetAsMain: (photo: GalleryPhoto) => void;
}

const SortablePhoto = ({ photo, onDelete, onEditCaption, onSetAsMain }: SortablePhotoProps) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: photo.id,
  });
  const [editing, setEditing] = useState(false);
  const [draftCaption, setDraftCaption] = useState(photo.caption);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="group relative rounded-xl overflow-hidden aspect-square bg-muted"
    >
      <img src={photo.photo_url} alt={photo.caption} className="w-full h-full object-cover" />

      {/* Drag handle */}
      <button
        type="button"
        {...attributes}
        {...listeners}
        className="absolute top-2 left-2 p-1.5 rounded-md bg-black/60 text-white opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing touch-none"
        aria-label="Déplacer la photo"
      >
        <GripVertical className="h-3.5 w-3.5" />
      </button>

      {/* Actions (top-right) */}
      <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          type="button"
          onClick={() => onSetAsMain(photo)}
          className="p-1.5 rounded-md bg-black/60 text-white hover:bg-primary"
          aria-label="Définir comme photo principale"
          title="Définir comme photo principale"
        >
          <Star className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={() => onDelete(photo.id)}
          className="p-1.5 rounded-md bg-black/60 text-white hover:bg-destructive"
          aria-label="Supprimer la photo"
          title="Supprimer"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Caption overlay */}
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-2">
        {editing ? (
          <div className="flex items-center gap-1">
            <Input
              value={draftCaption}
              onChange={(e) => setDraftCaption(e.target.value)}
              maxLength={200}
              className="h-7 text-xs bg-background/90"
              autoFocus
            />
            <button
              type="button"
              onClick={() => { onEditCaption(photo.id, draftCaption.trim()); setEditing(false); }}
              className="p-1 rounded bg-primary text-primary-foreground"
              aria-label="Valider"
            >
              <Check className="h-3 w-3" />
            </button>
            <button
              type="button"
              onClick={() => { setDraftCaption(photo.caption); setEditing(false); }}
              className="p-1 rounded bg-background text-foreground"
              aria-label="Annuler"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        ) : (
          <div className="flex items-end justify-between gap-2">
            <p className="text-white text-xs line-clamp-2 flex-1">
              {photo.caption || <span className="italic opacity-70">Sans légende</span>}
            </p>
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="p-1 rounded bg-black/60 text-white opacity-0 group-hover:opacity-100 transition-opacity"
              aria-label="Modifier la légende"
            >
              <Pencil className="h-3 w-3" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

const OwnerGallery = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const fromSitId = searchParams.get("from")?.startsWith("sit:") ? searchParams.get("from")!.slice(4) : null;
  const fileRef = useRef<HTMLInputElement>(null);

  const [photos, setPhotos] = useState<GalleryPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const [defaultCategory, setDefaultCategory] = useState<string>("home_life");
  const [defaultSeason, setDefaultSeason] = useState<string>("");

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const loadPhotos = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("owner_gallery")
      .select("*")
      .eq("user_id", user.id)
      .order("position", { ascending: true })
      .order("created_at", { ascending: false });
    setPhotos((data as GalleryPhoto[]) || []);
    setLoading(false);
  }, [user]);

  useEffect(() => { loadPhotos(); }, [loadPhotos]);

  // Revalidation silencieuse de l'indexation : mesure et persiste les dimensions
  // manquantes des photos historiques pour réactiver le filtre `isIndexable` SEO.
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      const updated = await backfillOwnerGalleryDimensions(user.id);
      if (!cancelled && updated > 0) loadPhotos();
    })();
    return () => { cancelled = true; };
  }, [user, loadPhotos]);

  const uploadFiles = async (files: File[]) => {
    if (!user || files.length === 0) return;
    const remaining = MAX_PHOTOS - photos.length;
    if (remaining <= 0) {
      toast({ variant: "destructive", title: "Limite atteinte", description: `Maximum ${MAX_PHOTOS} photos.` });
      return;
    }
    const toUpload = files.slice(0, remaining);
    if (files.length > remaining) {
      toast({ title: "Limite atteinte", description: `Seulement ${remaining} photo(s) ajoutée(s) sur ${files.length}.` });
    }

    setUploading(true);
    let successCount = 0;
    let nextPosition = (photos[photos.length - 1]?.position ?? -1) + 1;

    for (const f of toUpload) {
      try {
        const compressed = await compressImageFile(f, 5, 1200);
        const dims = await getImageDimensions(compressed);
        const ext = (compressed.name.split(".").pop() || "jpg").toLowerCase();
        const path = `${user.id}/owner-gallery/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
        const { error: uploadErr } = await supabase.storage.from("property-photos").upload(path, compressed);
        if (uploadErr) throw uploadErr;
        const { data: urlData } = supabase.storage.from("property-photos").getPublicUrl(path);
        const { error: insertErr } = await supabase.from("owner_gallery").insert({
          user_id: user.id,
          photo_url: urlData.publicUrl,
          caption: "",
          category: defaultCategory as any,
          season: defaultSeason || null,
          position: nextPosition,
          width: dims.width || null,
          height: dims.height || null,
        } as any);
        if (insertErr) throw insertErr;
        nextPosition += 1;
        successCount += 1;
      } catch (err: any) {
        toast({ variant: "destructive", title: "Erreur sur une photo", description: err?.message || "Upload impossible" });
      }
    }

    setUploading(false);
    if (successCount > 0) {
      toast({ title: successCount === 1 ? "Photo ajoutée" : `${successCount} photos ajoutées` });
      await loadPhotos();
      window.dispatchEvent(new Event("owner-gallery:changed"));
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) uploadFiles(files);
    if (fileRef.current) fileRef.current.value = "";
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingFile(false);
    const files = Array.from(e.dataTransfer.files).filter((f) => f.type.startsWith("image/"));
    if (files.length > 0) uploadFiles(files);
  };

  const handleDelete = async (id: string) => {
    const previous = photos;
    setPhotos((prev) => prev.filter((p) => p.id !== id));
    const { error } = await supabase.from("owner_gallery").delete().eq("id", id);
    if (error) {
      setPhotos(previous);
      toast({ variant: "destructive", title: "Erreur", description: "Impossible de supprimer la photo." });
      return;
    }
    toast({ title: "Photo supprimée" });
    window.dispatchEvent(new Event("owner-gallery:changed"));
  };

  const handleEditCaption = async (id: string, caption: string) => {
    const previous = photos;
    setPhotos((prev) => prev.map((p) => (p.id === id ? { ...p, caption } : p)));
    const { error } = await supabase.from("owner_gallery").update({ caption }).eq("id", id);
    if (error) {
      setPhotos(previous);
      toast({ variant: "destructive", title: "Erreur", description: "Légende non sauvegardée." });
    }
  };

  const handleSetAsMain = async (photo: GalleryPhoto) => {
    if (!user) return;
    const { error } = await supabase.from("profiles").update({ avatar_url: photo.photo_url }).eq("id", user.id);
    if (error) {
      toast({ variant: "destructive", title: "Erreur", description: "Impossible de définir cette photo comme principale." });
      return;
    }
    toast({ title: "Photo principale mise à jour" });
    window.dispatchEvent(new Event("profile:avatar-changed"));
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = photos.findIndex((p) => p.id === active.id);
    const newIndex = photos.findIndex((p) => p.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const previous = photos;
    const reordered = arrayMove(photos, oldIndex, newIndex).map((p, i) => ({ ...p, position: i }));
    setPhotos(reordered);

    // Persist all positions
    const updates = reordered.map((p) =>
      supabase.from("owner_gallery").update({ position: p.position }).eq("id", p.id)
    );
    const results = await Promise.all(updates);
    const failed = results.find((r) => r.error);
    if (failed) {
      setPhotos(previous);
      toast({ variant: "destructive", title: "Erreur", description: "Réordre non sauvegardé." });
    }
  };

  if (loading) return <div className="text-muted-foreground text-sm">Chargement...</div>;

  const canAddMore = photos.length < MAX_PHOTOS;

  return (
    <div className="space-y-6">
      {fromSitId && (
        <Link
          to={`/sits/${fromSitId}/edit`}
          className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
        >
          <ArrowLeft className="h-4 w-4" /> Retour à l'édition de l'annonce
        </Link>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-heading text-2xl font-bold">Ma galerie</h2>
          <p className="text-sm text-muted-foreground mt-1">
            {photos.length}/{MAX_PHOTOS} photos, Montrez aux gardiens ce qui rend votre maison unique
          </p>
        </div>
      </div>

      <div className="flex items-start gap-2 rounded-lg border border-border bg-muted/40 p-3">
        <Info className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
        <p className="text-xs text-muted-foreground">
          Ces photos alimentent <strong>toutes vos annonces</strong>. Glissez-déposez pour les réordonner.
          La photo de couverture de chaque annonce se choisit ensuite directement depuis l'écran de création
          ou d'édition de l'annonce concernée. Toutes les modifications sont enregistrées automatiquement.
        </p>
      </div>

      <PhotoTipsAlert />

      {photos.length > 0 && (
        <PhotoQualityChecker photos={photos.map((p) => p.photo_url)} />
      )}

      {/* Drop zone / Add button */}
      {canAddMore && (
        <div
          onDragOver={(e) => { e.preventDefault(); setIsDraggingFile(true); }}
          onDragLeave={() => setIsDraggingFile(false)}
          onDrop={handleDrop}
          className={`rounded-xl border-2 border-dashed p-6 text-center transition-colors ${
            isDraggingFile ? "border-primary bg-primary/5" : "border-border bg-muted/20 hover:bg-muted/40"
          }`}
        >
          <UploadCloud className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
          <p className="text-sm font-medium text-foreground">
            Glissez vos photos ici
            <span className="text-muted-foreground font-normal"> ou </span>
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="text-primary hover:underline font-medium"
              disabled={uploading}
            >
              parcourez vos fichiers
            </button>
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            JPG, PNG ou WEBP, max 5 Mo par photo · plusieurs fichiers acceptés
          </p>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={handleFileInput}
          />

          {/* Default classification for the next uploads */}
          <div className="grid grid-cols-2 gap-3 mt-4 max-w-md mx-auto text-left">
            <div className="space-y-1">
              <Label className="text-xs">Catégorie par défaut</Label>
              <Select value={defaultCategory} onValueChange={setDefaultCategory}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Saison (optionnel)</Label>
              <Select value={defaultSeason || "none"} onValueChange={(v) => setDefaultSeason(v === "none" ? "" : v)}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Aucune</SelectItem>
                  {SEASONS.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          {uploading && (
            <p className="text-xs text-primary mt-3">Envoi en cours…</p>
          )}
        </div>
      )}

      {/* Grid sortable */}
      {photos.length > 0 && (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={photos.map((p) => p.id)} strategy={rectSortingStrategy}>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {photos.map((photo) => (
                <SortablePhoto
                  key={photo.id}
                  photo={photo}
                  onDelete={handleDelete}
                  onEditCaption={handleEditCaption}
                  onSetAsMain={handleSetAsMain}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      {!canAddMore && (
        <div className="rounded-lg border border-border bg-muted/40 p-3 text-center text-xs text-muted-foreground">
          Limite de {MAX_PHOTOS} photos atteinte. Supprimez-en pour en ajouter de nouvelles.
        </div>
      )}
    </div>
  );
};

export default OwnerGallery;
