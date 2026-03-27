import { useState, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, X, Camera, ImageIcon } from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import ChipSelect from "./ChipSelect";
import HintBubble from "./HintBubble";
import type { SitterProfileData, PastAnimal } from "@/hooks/useSitterProfile";

const ANIMAL_TYPES = ["Chiens", "Chats", "Chevaux", "Oiseaux", "Animaux de ferme", "NAC"];
const EXPERIENCE_OPTIONS = ["Débutant", "1-3 ans", "3-5 ans", "5+ ans"];
const SPECIES_OPTIONS = ["Chien", "Chat", "Cheval", "Oiseau", "Animal de ferme", "NAC"];

interface Props {
  data: SitterProfileData;
  pastAnimals: PastAnimal[];
  onChange: (partial: Partial<SitterProfileData>) => void;
  onAddAnimal: (animal: PastAnimal) => Promise<void>;
  onRemoveAnimal: (id: string) => Promise<void>;
}

const StepExperience = ({ data, pastAnimals, onChange, onAddAnimal, onRemoveAnimal }: Props) => {
  const { user } = useAuth();
  const [newSpecies, setNewSpecies] = useState("");
  const [newName, setNewName] = useState("");
  const [newBreed, setNewBreed] = useState("");
  const [newPhotoFile, setNewPhotoFile] = useState<File | null>(null);
  const [newPhotoPreview, setNewPhotoPreview] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("La photo ne doit pas dépasser 5 Mo");
      return;
    }
    setNewPhotoFile(file);
    setNewPhotoPreview(URL.createObjectURL(file));
  };

  const uploadAnimalPhoto = async (file: File): Promise<string | null> => {
    if (!user) return null;
    const ext = file.name.split(".").pop();
    const path = `${user.id}/past-animals/${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from("sitter-gallery").upload(path, file, { upsert: true });
    if (error) {
      toast.error("Impossible d'uploader la photo");
      return null;
    }
    const { data: urlData } = supabase.storage.from("sitter-gallery").getPublicUrl(path);
    return urlData.publicUrl;
  };

  const handleAdd = async () => {
    if (!newSpecies || !newName.trim()) return;
    setAdding(true);

    let photoUrl: string | undefined;
    if (newPhotoFile) {
      const url = await uploadAnimalPhoto(newPhotoFile);
      if (url) photoUrl = url;
    }

    await onAddAnimal({
      species: newSpecies,
      name: newName.trim(),
      breed: newBreed.trim() || undefined,
      photo_url: photoUrl,
    });

    setNewSpecies("");
    setNewName("");
    setNewBreed("");
    setNewPhotoFile(null);
    setNewPhotoPreview(null);
    setAdding(false);
  };

  return (
    <div className="space-y-6">

      <div className="space-y-2">
        <Label>Types d'animaux gérés</Label>
        <ChipSelect options={ANIMAL_TYPES} selected={data.animal_types} onChange={v => onChange({ animal_types: v })} />
      </div>

      <div className="space-y-2">
        <Label>Années d'expérience</Label>
        <Select value={data.experience_years} onValueChange={v => onChange({ experience_years: v })}>
          <SelectTrigger className="rounded-lg h-12"><SelectValue placeholder="Choisir" /></SelectTrigger>
          <SelectContent>
            {EXPERIENCE_OPTIONS.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Références / gardes passées</Label>
        <Textarea
          value={data.references_text}
          onChange={e => onChange({ references_text: e.target.value })}
          placeholder="Décrivez vos expériences précédentes : nombre de gardes, types d'animaux, durées..."
          className="rounded-lg min-h-[120px]"
          maxLength={3000}
        />
      </div>

      {/* Past animals */}
      <div className="space-y-3">
        <Label>Animaux gardés par le passé</Label>

        {pastAnimals.map(animal => (
          <div key={animal.id} className="flex items-center gap-3 bg-muted/50 rounded-xl p-3">
            <Avatar className="h-12 w-12 rounded-lg shrink-0">
              {animal.photo_url ? (
                <AvatarImage src={animal.photo_url} alt={animal.name} className="object-cover" />
              ) : null}
              <AvatarFallback className="rounded-lg bg-muted text-muted-foreground">
                <ImageIcon className="h-5 w-5" />
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">{animal.name}</span>
                <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">{animal.species}</span>
              </div>
              {animal.breed && (
                <span className="text-xs text-muted-foreground">{animal.breed}</span>
              )}
            </div>
            <button type="button" onClick={() => animal.id && onRemoveAnimal(animal.id)} className="text-muted-foreground hover:text-destructive shrink-0">
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}

        {/* Add form */}
        <div className="border border-dashed border-border rounded-xl p-4 space-y-3">
          <div className="flex items-end gap-3">
            <div className="flex-1">
              <Label className="text-xs text-muted-foreground mb-1">Espèce *</Label>
              <Select value={newSpecies} onValueChange={setNewSpecies}>
                <SelectTrigger className="rounded-lg h-10"><SelectValue placeholder="Espèce" /></SelectTrigger>
                <SelectContent>
                  {SPECIES_OPTIONS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1">
              <Label className="text-xs text-muted-foreground mb-1">Nom *</Label>
              <Input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Ex: Luna" className="rounded-lg h-10" maxLength={50} />
            </div>
          </div>

          <div className="flex items-end gap-3">
            <div className="flex-1">
              <Label className="text-xs text-muted-foreground mb-1">Race (optionnel)</Label>
              <Input value={newBreed} onChange={e => setNewBreed(e.target.value)} placeholder="Ex: Labrador, Siamois..." className="rounded-lg h-10" maxLength={100} />
            </div>
            <div className="shrink-0">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handlePhotoSelect}
              />
              {newPhotoPreview ? (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="relative"
                >
                  <Avatar className="h-10 w-10 rounded-lg">
                    <AvatarImage src={newPhotoPreview} className="object-cover" />
                  </Avatar>
                  <div className="absolute inset-0 bg-black/30 rounded-lg flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                    <Camera className="h-4 w-4 text-white" />
                  </div>
                </button>
              ) : (
                <Button type="button" variant="outline" size="icon" className="h-10 w-10 rounded-lg" onClick={() => fileInputRef.current?.click()}>
                  <Camera className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>

          <Button type="button" variant="outline" size="sm" onClick={handleAdd} disabled={adding || !newSpecies || !newName.trim()} className="w-full">
            <Plus className="w-4 h-4 mr-1" /> Ajouter cet animal
          </Button>
        </div>

        <HintBubble>Chaque animal que vous ajoutez ici est une preuve concrète de votre expérience. Ajoutez une photo pour rassurer les propriétaires !</HintBubble>
      </div>
    </div>
  );
};

export default StepExperience;
