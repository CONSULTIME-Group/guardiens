import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, X } from "lucide-react";
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
  const [newSpecies, setNewSpecies] = useState("");
  const [newName, setNewName] = useState("");
  const [adding, setAdding] = useState(false);

  const handleAdd = async () => {
    if (!newSpecies || !newName.trim()) return;
    setAdding(true);
    await onAddAnimal({ species: newSpecies, name: newName.trim() });
    setNewSpecies("");
    setNewName("");
    setAdding(false);
  };

  return (
    <div className="space-y-6">
      <h2 className="font-heading text-2xl font-bold">Expérience animaux</h2>

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
          <div key={animal.id} className="flex items-center gap-3 bg-muted/50 rounded-lg p-3">
            <span className="text-sm font-medium">{animal.species}</span>
            <span className="text-sm text-muted-foreground">—</span>
            <span className="text-sm">{animal.name}</span>
            <button type="button" onClick={() => animal.id && onRemoveAnimal(animal.id)} className="ml-auto text-muted-foreground hover:text-destructive">
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}

        <div className="flex items-end gap-3">
          <div className="flex-1">
            <Select value={newSpecies} onValueChange={setNewSpecies}>
              <SelectTrigger className="rounded-lg h-10"><SelectValue placeholder="Espèce" /></SelectTrigger>
              <SelectContent>
                {SPECIES_OPTIONS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="flex-1">
            <Input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Nom" className="rounded-lg h-10" maxLength={50} />
          </div>
          <Button type="button" variant="outline" size="sm" onClick={handleAdd} disabled={adding || !newSpecies || !newName.trim()}>
            <Plus className="w-4 h-4 mr-1" /> Ajouter
          </Button>
        </div>
        <HintBubble>Chaque animal que vous ajoutez ici est une preuve concrète de votre expérience. Les photos sont un plus.</HintBubble>
      </div>
    </div>
  );
};

export default StepExperience;
