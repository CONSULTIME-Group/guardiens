import { useRef } from "react";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Plus, X } from "lucide-react";
import ChipSelect from "../profile/ChipSelect";
import HintBubble from "../profile/HintBubble";
import AiSuggestButton from "../profile/AiSuggestButton";
import LocationProfileCard from "../location/LocationProfileCard";
import EnvironmentPills from "../shared/EnvironmentPills";
import type { OwnerProfileData } from "@/hooks/useOwnerProfile";

const TYPES = ["Appartement", "Maison", "Ferme", "Chalet", "Autre"];
const TYPE_MAP: Record<string, string> = { Appartement: "apartment", Maison: "house", Ferme: "farm", Chalet: "chalet", Autre: "other" };
const TYPE_REVERSE: Record<string, string> = Object.fromEntries(Object.entries(TYPE_MAP).map(([k, v]) => [v, k]));

const ENVS = ["Centre-ville", "Périurbain", "Campagne", "Montagne", "Bord de mer", "Forêt"];
const ENV_MAP: Record<string, string> = { "Centre-ville": "city_center", Périurbain: "suburban", Campagne: "countryside", Montagne: "mountain", "Bord de mer": "seaside", Forêt: "forest" };
const ENV_REVERSE: Record<string, string> = Object.fromEntries(Object.entries(ENV_MAP).map(([k, v]) => [v, k]));

const COUNTS = ["1", "2", "3", "4", "5", "Plus de 5"];
const EQUIPMENTS = ["Jardin", "Piscine", "WiFi", "Parking", "Terrasse", "Cheminée", "Buanderie", "Lave-vaisselle", "Congélateur", "TV", "Équipement sport", "BBQ"];

interface Props {
  data: OwnerProfileData;
  onChange: (partial: Partial<OwnerProfileData>) => void;
  onUploadPhoto: (file: File, bucket: string) => Promise<string | null>;
}

const OwnerStepHousing = ({ data, onChange, onUploadPhoto }: Props) => {
  const fileRef = useRef<HTMLInputElement>(null);

  const handlePhotos = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    for (const file of files) {
      const url = await onUploadPhoto(file, "property-photos");
      if (url) onChange({ photos: [...(data.photos || []), url] });
    }
  };

  const removePhoto = (index: number) => {
    onChange({ photos: data.photos.filter((_, i) => i !== index) });
  };

  return (
    <div className="space-y-6">
      <h2 className="font-heading text-2xl font-bold">Le logement</h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Type de logement</Label>
          <Select value={data.property_type} onValueChange={v => onChange({ property_type: v })}>
            <SelectTrigger className="rounded-lg h-12"><SelectValue placeholder="Choisir" /></SelectTrigger>
            <SelectContent>
              {TYPES.map(t => <SelectItem key={t} value={TYPE_MAP[t]}>{t}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Environnement</Label>
          <Select value={data.environment} onValueChange={v => onChange({ environment: v })}>
            <SelectTrigger className="rounded-lg h-12"><SelectValue placeholder="Choisir" /></SelectTrigger>
            <SelectContent>
              {ENVS.map(e => <SelectItem key={e} value={ENV_MAP[e]}>{e}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Nombre de pièces</Label>
          <Select value={String(data.rooms_count)} onValueChange={v => onChange({ rooms_count: v === "Plus de 5" ? 6 : Number(v) })}>
            <SelectTrigger className="rounded-lg h-12"><SelectValue placeholder="Choisir" /></SelectTrigger>
            <SelectContent>{COUNTS.map(c => <SelectItem key={c} value={c === "Plus de 5" ? "6" : c}>{c}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Nombre de chambres</Label>
          <Select value={String(data.bedrooms_count)} onValueChange={v => onChange({ bedrooms_count: v === "Plus de 5" ? 6 : Number(v) })}>
            <SelectTrigger className="rounded-lg h-12"><SelectValue placeholder="Choisir" /></SelectTrigger>
            <SelectContent>{COUNTS.map(c => <SelectItem key={c} value={c === "Plus de 5" ? "6" : c}>{c}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex items-center justify-between py-2">
        <Label>Accès voiture nécessaire</Label>
        <Switch checked={data.car_required} onCheckedChange={v => onChange({ car_required: v })} />
      </div>
      <div className="flex items-center justify-between py-2">
        <Label>Accessible PMR</Label>
        <Switch checked={data.accessible} onCheckedChange={v => onChange({ accessible: v })} />
      </div>

      <div className="space-y-2">
        <Label>Équipements</Label>
        <ChipSelect options={EQUIPMENTS} selected={data.equipments} onChange={v => onChange({ equipments: v })} />
      </div>

      {/* Photos */}
      <div className="space-y-3">
        <Label>Photos du logement (3 à 10)</Label>
        <div className="flex flex-wrap gap-3">
          {data.photos.map((url, i) => (
            <div key={i} className="relative w-24 h-24 rounded-lg overflow-hidden border border-border">
              <img src={url} alt="" className="w-full h-full object-cover" />
              <button type="button" onClick={() => removePhoto(i)}
                className="absolute top-1 right-1 bg-background/80 rounded-full p-0.5 hover:bg-destructive hover:text-destructive-foreground">
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
          {data.photos.length < 10 && (
            <button type="button" onClick={() => fileRef.current?.click()}
              className="w-24 h-24 rounded-lg border-2 border-dashed border-border flex items-center justify-center hover:border-primary transition-colors">
              <Plus className="w-6 h-6 text-muted-foreground" />
            </button>
          )}
        </div>
        <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={handlePhotos} />
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>Description du logement</Label>
          <AiSuggestButton field="description" currentValue={data.description} context={{ property_type: data.property_type, environment: data.environment, city: data.city }} onSuggestion={text => onChange({ description: text })} />
        </div>
        <Textarea value={data.description} onChange={e => onChange({ description: e.target.value })}
          placeholder="Ce qui fait le charme de votre logement : son ambiance, ses particularités, ce qu'on y ressent…"
          className="rounded-lg min-h-[120px]" maxLength={3000} />
        <HintBubble>Décrivez votre intérieur : la luminosité, l'ambiance, le confort. Les infos sur le quartier et la région sont générées automatiquement.</HintBubble>
      </div>

      {/* Location profile generated by AI — replaces manual region_highlights */}
      <LocationProfileCard
        city={data.city}
        postalCode={data.postal_code}
        editable={false}
      />
    </div>
  );
};

export default OwnerStepHousing;
