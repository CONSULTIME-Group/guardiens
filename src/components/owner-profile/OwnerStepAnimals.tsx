import { useState, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, ChevronDown, ChevronUp, Camera, X } from "lucide-react";
import HintBubble from "../profile/HintBubble";
import BreedProfileCard from "../breeds/BreedProfileCard";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { Pet } from "@/hooks/useOwnerProfile";

const SPECIES = [
  { value: "dog", label: "Chien" }, { value: "cat", label: "Chat" },
  { value: "horse", label: "Cheval" }, { value: "bird", label: "Oiseau" },
  { value: "rodent", label: "Rongeur" }, { value: "fish", label: "Poisson" },
  { value: "reptile", label: "Reptile" }, { value: "farm_animal", label: "Animal de ferme" },
  { value: "nac", label: "NAC" },
];
const ALONE = [
  { value: "never", label: "Jamais" }, { value: "2h", label: "Jusqu'à 2h" },
  { value: "6h", label: "Jusqu'à 6h" }, { value: "all_day", label: "Toute la journée" },
];
const WALK = [
  { value: "none", label: "Aucune" }, { value: "30min", label: "30 min" },
  { value: "1h", label: "1h" }, { value: "2h_plus", label: "2h+" },
];
const ACTIVITY = [
  { value: "calm", label: "Tranquille / canapé" },
  { value: "moderate", label: "Modéré / balades quotidiennes" },
  { value: "sportive", label: "Sportif / grandes randos" },
];

const emptyPet: Pet = {
  species: "dog", breed: "", name: "", age: null, photo_url: "",
  character: "", alone_duration: "never", walk_duration: "none",
  medication: "", food: "", special_needs: "", activity_level: "moderate",
  owner_breed_note: "",
};

interface Props {
  pets: Pet[];
  onAddPet: (pet: Pet) => Promise<void>;
  onUpdatePet: (pet: Pet) => Promise<void>;
  onRemovePet: (id: string) => Promise<void>;
}

const OwnerStepAnimals = ({ pets, onAddPet, onUpdatePet, onRemovePet }: Props) => {
  const [editingPet, setEditingPet] = useState<Pet | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const editFormRef = useRef<HTMLDivElement>(null);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  const compressImage = (file: File, maxWidth = 1200, quality = 0.8): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement("canvas");
          const ratio = Math.min(maxWidth / img.width, 1);
          canvas.width = Math.max(1, Math.round(img.width * ratio));
          canvas.height = Math.max(1, Math.round(img.height * ratio));
          const ctx = canvas.getContext("2d")!;
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          canvas.toBlob(
            (blob) => (blob ? resolve(blob) : reject(new Error("Compression failed"))),
            "image/jpeg",
            quality
          );
        };
        img.onerror = () => reject(new Error("Impossible de lire l'image"));
        img.src = e.target?.result as string;
      };
      reader.onerror = () => reject(new Error("Erreur de lecture du fichier"));
      reader.readAsDataURL(file);
    });
  };

  const handlePhotoUpload = async (file: File) => {
    if (!editingPet || !file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Seules les images sont acceptées");
      return;
    }
    setUploading(true);
    try {
      // Always compress to ensure JPEG compatibility (handles HEIC, large files, etc.)
      const uploadFile = await compressImage(file);
      const path = `pets/${Date.now()}_${Math.random().toString(36).slice(2)}.jpg`;
      const { error } = await supabase.storage.from("property-photos").upload(path, uploadFile, { contentType: "image/jpeg" });
      if (error) {
        console.error("Storage upload error:", error);
        toast.error("Erreur lors de l'upload : " + (error.message || "réessayez"));
      } else {
        const { data: urlData } = supabase.storage.from("property-photos").getPublicUrl(path);
        setEditingPet({ ...editingPet, photo_url: urlData.publicUrl });
        toast.success("Photo ajoutée !");
      }
    } catch (err) {
      console.error("Photo processing error:", err);
      toast.error("Format d'image non supporté ou fichier corrompu");
    }
    setUploading(false);
  };

  const startNew = () => {
    setEditingPet({ ...emptyPet });
    setIsNew(true);
  };

  const startEdit = (pet: Pet) => {
    setEditingPet({ ...pet });
    setIsNew(false);
    setTimeout(() => editFormRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 100);
  };

  const handleSave = async () => {
    if (!editingPet || !editingPet.name.trim()) return;
    setSaving(true);
    if (isNew) {
      await onAddPet(editingPet);
    } else {
      await onUpdatePet(editingPet);
    }
    setEditingPet(null);
    setSaving(false);
  };

  const speciesLabel = (val: string) => SPECIES.find(s => s.value === val)?.label || val;

  return (
    <div className="space-y-6">
      <h2 className="font-heading text-2xl font-bold">Les animaux</h2>
      <HintBubble>Chaque animal a sa fiche. Plus vous êtes précis, plus le gardien sera préparé — et rassuré.</HintBubble>

      {pets.map(pet => (
        <div key={pet.id} className="bg-muted/30 rounded-lg border border-border overflow-hidden">
          <button type="button" onClick={() => setExpandedId(expandedId === pet.id ? null : pet.id!)}
            className="w-full flex items-center gap-3 p-4 text-left">
            {pet.photo_url && <img src={pet.photo_url} alt={pet.name} className="w-12 h-12 rounded-lg object-cover cursor-pointer hover:ring-2 ring-primary transition-all" onClick={(e) => { e.stopPropagation(); setLightboxUrl(pet.photo_url!); }} />}
            <div className="flex-1">
              <span className="font-semibold">{pet.name}</span>
              <span className="text-sm text-muted-foreground ml-2">{speciesLabel(pet.species)}{pet.breed ? ` — ${pet.breed}` : ""}</span>
            </div>
            {expandedId === pet.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
          {expandedId === pet.id && (
            <div className="px-4 pb-4 space-y-3">
              <div className="flex gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => startEdit(pet)}>
                  <Pencil className="w-3 h-3 mr-1" /> Modifier
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={() => pet.id && onRemovePet(pet.id)}
                  className="text-destructive hover:text-destructive">
                  <Trash2 className="w-3 h-3 mr-1" /> Supprimer
                </Button>
              </div>
              {pet.breed && (
                <BreedProfileCard
                  species={pet.species}
                  breed={pet.breed}
                  ownerNote={pet.owner_breed_note}
                  editable
                  onNoteChange={(note) => onUpdatePet({ ...pet, owner_breed_note: note })}
                />
              )}
            </div>
          )}
        </div>
      ))}

      {editingPet ? (
        <div ref={editFormRef} className="bg-card rounded-lg border border-primary/30 p-5 space-y-4">
          <h3 className="font-heading text-lg font-semibold">{isNew ? "Nouvel animal" : `Modifier ${editingPet.name}`}</h3>

          {/* Photo upload */}
          <div className="space-y-2">
            <Label>Photo</Label>
            <div className="flex items-center gap-4">
              {editingPet.photo_url ? (
                <img src={editingPet.photo_url} alt="" className="w-20 h-20 rounded-xl object-cover border border-border cursor-pointer hover:ring-2 ring-primary transition-all" onClick={() => setLightboxUrl(editingPet.photo_url!)} />
              ) : (
                <div className="w-20 h-20 rounded-xl bg-muted flex items-center justify-center border border-dashed border-border">
                  <Camera className="w-6 h-6 text-muted-foreground" />
                </div>
              )}
              <div className="space-y-1">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={uploading}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Camera className="w-3 h-3 mr-1" />
                  {uploading ? "Upload..." : editingPet.photo_url ? "Changer la photo" : "Ajouter une photo"}
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => e.target.files?.[0] && handlePhotoUpload(e.target.files[0])}
                />
                <p className="text-xs text-muted-foreground">Max 5 Mo</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Espèce</Label>
              <Select value={editingPet.species} onValueChange={v => setEditingPet({ ...editingPet, species: v })}>
                <SelectTrigger className="rounded-lg h-10"><SelectValue /></SelectTrigger>
                <SelectContent>{SPECIES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Race</Label>
              <Input value={editingPet.breed} onChange={e => setEditingPet({ ...editingPet, breed: e.target.value })} className="rounded-lg h-10" maxLength={100} />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Nom</Label>
              <Input value={editingPet.name} onChange={e => setEditingPet({ ...editingPet, name: e.target.value })} className="rounded-lg h-10" maxLength={50} />
            </div>
            <div className="space-y-2">
              <Label>Âge</Label>
              <Input type="number" value={editingPet.age ?? ""} onChange={e => setEditingPet({ ...editingPet, age: e.target.value ? Number(e.target.value) : null })} className="rounded-lg h-10" min={0} max={50} />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Caractère</Label>
            <Input value={editingPet.character} onChange={e => setEditingPet({ ...editingPet, character: e.target.value })}
              placeholder="Joueur, câlin, timide, indépendant..." className="rounded-lg h-10" maxLength={200} />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Peut rester seul</Label>
              <Select value={editingPet.alone_duration} onValueChange={v => setEditingPet({ ...editingPet, alone_duration: v })}>
                <SelectTrigger className="rounded-lg h-10"><SelectValue /></SelectTrigger>
                <SelectContent>{ALONE.map(a => <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Balade quotidienne</Label>
              <Select value={editingPet.walk_duration} onValueChange={v => setEditingPet({ ...editingPet, walk_duration: v })}>
                <SelectTrigger className="rounded-lg h-10"><SelectValue /></SelectTrigger>
                <SelectContent>{WALK.map(w => <SelectItem key={w.value} value={w.value}>{w.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Niveau d'activité</Label>
            <Select value={editingPet.activity_level} onValueChange={v => setEditingPet({ ...editingPet, activity_level: v })}>
              <SelectTrigger className="rounded-lg h-10"><SelectValue /></SelectTrigger>
              <SelectContent>{ACTIVITY.map(a => <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>)}</SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Médication</Label>
            <Input value={editingPet.medication} onChange={e => setEditingPet({ ...editingPet, medication: e.target.value })}
              placeholder="Aucune, ou détaillez la fréquence et le dosage" className="rounded-lg h-10" maxLength={500} />
          </div>

          <div className="space-y-2">
            <Label>Alimentation</Label>
            <Textarea value={editingPet.food} onChange={e => setEditingPet({ ...editingPet, food: e.target.value })}
              placeholder="Type de nourriture, fréquence, quantité, habitudes" className="rounded-lg" maxLength={1000} />
          </div>

          <div className="space-y-2">
            <Label>Besoins spéciaux</Label>
            <Textarea value={editingPet.special_needs} onChange={e => setEditingPet({ ...editingPet, special_needs: e.target.value })}
              placeholder="Peurs, habitudes particulières, consignes spécifiques" className="rounded-lg" maxLength={1000} />
          </div>

          <div className="flex gap-2">
            <Button type="button" onClick={handleSave} disabled={saving || !editingPet.name.trim()}>
              {saving ? "Enregistrement..." : "Enregistrer"}
            </Button>
            <Button type="button" variant="outline" onClick={() => setEditingPet(null)}>Annuler</Button>
          </div>
        </div>
      ) : (
        <Button type="button" variant="outline" onClick={startNew} className="w-full">
          <Plus className="w-4 h-4 mr-2" /> Ajouter un animal
        </Button>
      )}

      {/* Lightbox */}
      <Dialog open={!!lightboxUrl} onOpenChange={() => setLightboxUrl(null)}>
        <DialogContent className="max-w-2xl p-2 bg-background/95 backdrop-blur">
          {lightboxUrl && (
            <img src={lightboxUrl} alt="Photo animal" className="w-full h-auto max-h-[80vh] object-contain rounded-lg" />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default OwnerStepAnimals;
