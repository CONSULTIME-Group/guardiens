import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, Camera, X, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { logger } from "@/lib/logger";

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

const SitterGallery = () => {
  const { user } = useAuth();
  const [photos, setPhotos] = useState<GalleryPhoto[]>([]);
  const [completedSits, setCompletedSits] = useState<{ id: string; title: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [lightboxPhoto, setLightboxPhoto] = useState<GalleryPhoto | null>(null);

  // Form state
  const [file, setFile] = useState<File | null>(null);
  const [caption, setCaption] = useState("");
  const [animalType, setAnimalType] = useState("");
  const [animalBreed, setAnimalBreed] = useState("");
  const [city, setCity] = useState("");
  const [photoDate, setPhotoDate] = useState("");
  const [selectedSitId, setSelectedSitId] = useState("");

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const [galleryRes, sitsRes] = await Promise.all([
        supabase.from("sitter_gallery").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
        supabase.from("applications").select("sit_id, sits!applications_sit_id_fkey(id, title)")
          .eq("sitter_id", user.id).eq("status", "accepted"),
      ]);
      setPhotos((galleryRes.data as any[]) || []);
      const sits = (sitsRes.data || []).map((a: any) => ({ id: a.sits?.id, title: a.sits?.title })).filter((s: any) => s.id);
      setCompletedSits(sits);
      setLoading(false);
    };
    load();
  }, [user]);

  const resetForm = () => {
    setFile(null);
    setCaption("");
    setAnimalType("");
    setAnimalBreed("");
    setCity("");
    setPhotoDate("");
    setSelectedSitId("");
  };

  const handleUpload = async () => {
    if (!user || !file) return;
    if (photos.length >= 50) {
      toast.error("Vous avez atteint la limite de 50 photos.");
      return;
    }
    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `${user.id}/${Date.now()}.${ext}`;
      const { error: uploadErr } = await supabase.storage.from("sitter-gallery").upload(path, file, { upsert: false });
      if (uploadErr) throw uploadErr;

      const { data: { publicUrl } } = supabase.storage.from("sitter-gallery").getPublicUrl(path);

      const source = selectedSitId ? "guardiens" : "external";
      const { data, error } = await supabase.from("sitter_gallery").insert({
        user_id: user.id,
        photo_url: publicUrl,
        caption,
        animal_type: animalType || null,
        animal_breed: animalBreed || null,
        city: city || null,
        photo_date: photoDate || null,
        source,
        sit_id: selectedSitId || null,
      }).select().single();

      if (error) throw error;
      setPhotos(prev => [data as any, ...prev]);
      resetForm();
      setDialogOpen(false);
      toast.success("Photo ajoutée à votre galerie !");
    } catch (err: any) {
      toast.error(err.message || "Erreur lors de l'upload");
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (photo: GalleryPhoto) => {
    const urlParts = photo.photo_url.split("/sitter-gallery/");
    if (urlParts[1]) {
      await supabase.storage.from("sitter-gallery").remove([urlParts[1]]);
    }
    await supabase.from("sitter_gallery").delete().eq("id", photo.id);
    setPhotos(prev => prev.filter(p => p.id !== photo.id));
    toast.success("Photo supprimée.");
  };

  if (loading) return <div className="text-muted-foreground text-sm py-8 text-center">Chargement...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-heading text-xl font-bold">Ma galerie</h2>
          <p className="text-sm text-muted-foreground">{photos.length}/50 photos · Montrez les animaux que vous avez gardés</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-1.5" disabled={photos.length >= 50}>
              <Plus className="h-4 w-4" /> Ajouter une photo
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Ajouter une photo</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Photo *</Label>
                <Input type="file" accept="image/*" onChange={e => setFile(e.target.files?.[0] || null)} />
                <p className="text-xs text-muted-foreground mt-1">Max 5 Mo</p>
              </div>
              <div>
                <Label>Légende *</Label>
                <Textarea value={caption} onChange={e => setCaption(e.target.value)} placeholder="Ex : Luna, golden retriever, 2 semaines à Annecy — janvier 2025" rows={2} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Type d'animal</Label>
                  <Select value={animalType} onValueChange={setAnimalType}>
                    <SelectTrigger><SelectValue placeholder="Choisir" /></SelectTrigger>
                    <SelectContent>
                      {animalTypeOptions.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Race (optionnel)</Label>
                  <Input value={animalBreed} onChange={e => setAnimalBreed(e.target.value)} placeholder="Golden Retriever" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Ville (optionnel)</Label>
                  <Input value={city} onChange={e => setCity(e.target.value)} placeholder="Annecy" />
                </div>
                <div>
                  <Label>Date (optionnel)</Label>
                  <Input type="month" value={photoDate} onChange={e => setPhotoDate(e.target.value)} />
                </div>
              </div>
              {completedSits.length > 0 && (
                <div>
                  <Label>Lier à une garde Guardiens</Label>
                  <Select value={selectedSitId} onValueChange={setSelectedSitId}>
                    <SelectTrigger><SelectValue placeholder="Aucune (expérience passée)" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Aucune (expérience passée)</SelectItem>
                      {completedSits.map(s => <SelectItem key={s.id} value={s.id}>{s.title}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <Button onClick={handleUpload} disabled={!file || !caption || uploading} className="w-full">
                <Camera className="h-4 w-4 mr-2" /> {uploading ? "Upload en cours..." : "Ajouter à ma galerie"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {photos.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Camera className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">Ajoutez des photos d'animaux que vous avez gardés pour enrichir votre profil.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {photos.map(photo => (
            <div key={photo.id} className="group relative aspect-square rounded-xl overflow-hidden cursor-pointer" onClick={() => setLightboxPhoto(photo)}>
              <img src={photo.photo_url} alt={photo.caption} className="w-full h-full object-cover transition-transform group-hover:scale-105" />
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
              {/* Delete button */}
              <button onClick={(e) => { e.stopPropagation(); handleDelete(photo); }} className="absolute top-2 right-2 p-1.5 rounded-full bg-destructive/80 text-destructive-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Lightbox */}
      {lightboxPhoto && (
        <Dialog open={!!lightboxPhoto} onOpenChange={() => setLightboxPhoto(null)}>
          <DialogContent className="max-w-2xl p-0 overflow-hidden">
            <div className="relative">
              <img src={lightboxPhoto.photo_url} alt={lightboxPhoto.caption} className="w-full max-h-[70vh] object-contain bg-black" />
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
