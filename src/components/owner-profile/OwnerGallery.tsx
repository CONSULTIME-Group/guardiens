import { useState, useRef, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { compressImageFile } from "@/lib/compressImage";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Camera, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const CATEGORIES = [
  { value: "home_life", label: "🏠 La vie à la maison" },
  { value: "animals_life", label: "🐾 Mes animaux au quotidien" },
  { value: "garden", label: "🌿 Le jardin / extérieur" },
  { value: "neighborhood", label: "🏘️ Le quartier" },
  { value: "seasonal", label: "🍂 Au fil des saisons" },
];

const SEASONS = [
  { value: "printemps", label: "🌸 Printemps" },
  { value: "été", label: "☀️ Été" },
  { value: "automne", label: "🍂 Automne" },
  { value: "hiver", label: "❄️ Hiver" },
];

interface GalleryPhoto {
  id: string;
  photo_url: string;
  caption: string;
  category: string;
  season: string | null;
  created_at: string;
}

const OwnerGallery = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);

  const [photos, setPhotos] = useState<GalleryPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [caption, setCaption] = useState("");
  const [category, setCategory] = useState("home_life");
  const [season, setSeason] = useState("");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);

  const loadPhotos = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("owner_gallery")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    setPhotos((data as GalleryPhoto[]) || []);
    setLoading(false);
  };

  useEffect(() => { loadPhotos(); }, [user]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    try {
      const compressed = await compressImageFile(f, 5, 1200);
      setFile(compressed);
      setPreviewUrl(URL.createObjectURL(compressed));
    } catch {
      toast({ variant: "destructive", title: "Impossible de traiter cette image" });
    }
  };

  const handleSubmit = async () => {
    if (!user || !file) return;
    setUploading(true);

    const ext = file.name.split(".").pop();
    const path = `${user.id}/owner-gallery/${Date.now()}.${ext}`;
    const { error: uploadErr } = await supabase.storage.from("property-photos").upload(path, file);
    if (uploadErr) {
      toast({ variant: "destructive", title: "Erreur upload" });
      setUploading(false);
      return;
    }

    const { data: urlData } = supabase.storage.from("property-photos").getPublicUrl(path);

    const { error } = await supabase.from("owner_gallery").insert({
      user_id: user.id,
      photo_url: urlData.publicUrl,
      caption: caption.trim(),
      category: category as any,
      season: season || null,
    });

    setUploading(false);
    if (error) {
      toast({ variant: "destructive", title: "Erreur", description: error.message });
    } else {
      toast({ title: "Photo ajoutée !" });
      setShowForm(false);
      setFile(null);
      setPreviewUrl(null);
      setCaption("");
      setCategory("home_life");
      setSeason("");
      loadPhotos();
    }
  };

  const handleDelete = async (id: string) => {
    await supabase.from("owner_gallery").delete().eq("id", id);
    setPhotos(prev => prev.filter(p => p.id !== id));
    toast({ title: "Photo supprimée" });
  };

  if (loading) return <div className="text-muted-foreground text-sm">Chargement...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-heading text-2xl font-bold">Ma galerie</h2>
          <p className="text-sm text-muted-foreground mt-1">
            {photos.length}/30 photos — Montrez aux gardiens ce qui rend votre maison unique
          </p>
        </div>
      </div>

      {/* Photo grid */}
      {photos.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {photos.map(photo => (
            <div key={photo.id} className="group relative rounded-xl overflow-hidden aspect-square">
              <img src={photo.photo_url} alt={photo.caption} className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-end">
                <div className="p-2 w-full opacity-0 group-hover:opacity-100 transition-opacity">
                  <p className="text-white text-xs line-clamp-2">{photo.caption}</p>
                </div>
              </div>
              <button
                onClick={() => handleDelete(photo.id)}
                className="absolute top-2 right-2 p-1 rounded-full bg-black/50 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive"
              >
                <Trash2 className="h-3 w-3" />
              </button>
              {photo.season && (
                <span className="absolute top-2 left-2 px-1.5 py-0.5 rounded-full bg-black/50 text-white text-[10px]">
                  {SEASONS.find(s => s.value === photo.season)?.label || photo.season}
                </span>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Add form */}
      {showForm ? (
        <div className="bg-card rounded-xl border border-primary/30 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-heading font-semibold">Ajouter une photo</h3>
            <button onClick={() => { setShowForm(false); setFile(null); setPreviewUrl(null); }}>
              <X className="h-4 w-4 text-muted-foreground" />
            </button>
          </div>

          <div className="flex items-center gap-4">
            {previewUrl ? (
              <img src={previewUrl} alt="" className="w-24 h-24 rounded-xl object-cover" />
            ) : (
              <button
                onClick={() => fileRef.current?.click()}
                className="w-24 h-24 rounded-xl bg-muted border border-dashed border-border flex items-center justify-center hover:bg-accent transition-colors"
              >
                <Camera className="h-6 w-6 text-muted-foreground" />
              </button>
            )}
            <div className="flex-1 space-y-1">
              <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()}>
                {previewUrl ? "Changer" : "Choisir une photo"}
              </Button>
              <p className="text-xs text-muted-foreground">Max 5 Mo</p>
            </div>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
          </div>

          <div className="space-y-2">
            <Label>Légende</Label>
            <Input
              value={caption}
              onChange={e => setCaption(e.target.value)}
              placeholder="Ex : Le jardin en juin, quand les tomates commencent à rougir"
              maxLength={200}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Catégorie</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Saison (optionnel)</Label>
              <Select value={season} onValueChange={setSeason}>
                <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Aucune</SelectItem>
                  {SEASONS.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button onClick={handleSubmit} disabled={uploading || !file} className="w-full">
            {uploading ? "Upload..." : "Ajouter la photo"}
          </Button>
        </div>
      ) : (
        photos.length < 30 && (
          <Button variant="outline" onClick={() => setShowForm(true)} className="w-full">
            <Plus className="h-4 w-4 mr-2" /> Ajouter une photo
          </Button>
        )
      )}
    </div>
  );
};

export default OwnerGallery;
