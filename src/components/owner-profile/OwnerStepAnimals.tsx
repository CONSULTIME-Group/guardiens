import { useState, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Pencil, Trash2, ChevronDown, ChevronUp, Camera } from "lucide-react";
import HintBubble from "../profile/HintBubble";
import BreedProfileCard from "../breeds/BreedProfileCard";
import { supabase } from "@/integrations/supabase/client";
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

  const startNew = () => {
    setEditingPet({ ...emptyPet });
    setIsNew(true);
  };

  const startEdit = (pet: Pet) => {
    setEditingPet({ ...pet });
    setIsNew(false);
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
            {pet.photo_url && <img src={pet.photo_url} alt={pet.name} className="w-12 h-12 rounded-lg object-cover" />}
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
        <div className="bg-card rounded-lg border border-primary/30 p-5 space-y-4">
          <h3 className="font-heading text-lg font-semibold">{isNew ? "Nouvel animal" : `Modifier ${editingPet.name}`}</h3>

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
    </div>
  );
};

export default OwnerStepAnimals;
