import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import ChipSelect from "./ChipSelect";
import HintBubble from "./HintBubble";
import type { SitterProfileData } from "@/hooks/useSitterProfile";

const SITTER_TYPES = ["Solo", "Couple", "Famille", "Retraité"];
const AVAILABILITY_OPTIONS = ["100% en congés", "En télétravail", "Flexible"];
const LIFESTYLE_OPTIONS = [
  "Sportif / grandes balades", "Joueur", "Tranquille / casanier", "Lève-tôt", "Couche-tard"
];

interface Props {
  data: SitterProfileData;
  onChange: (partial: Partial<SitterProfileData>) => void;
}

const StepSitterProfile = ({ data, onChange }: Props) => {
  const showAccompanied = data.sitter_type === "Couple" || data.sitter_type === "Famille";

  return (
    <div className="space-y-6">
      <h2 className="font-heading text-2xl font-bold">Mon profil de gardien</h2>

      <div className="space-y-2">
        <Label>Type de gardien</Label>
        <Select value={data.sitter_type} onValueChange={v => onChange({ sitter_type: v })}>
          <SelectTrigger className="rounded-lg h-12"><SelectValue placeholder="Choisir" /></SelectTrigger>
          <SelectContent>
            {SITTER_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {showAccompanied && (
        <div className="space-y-2">
          <Label htmlFor="accompanied_by">Accompagné de</Label>
          <Input
            id="accompanied_by"
            value={data.accompanied_by}
            onChange={e => onChange({ accompanied_by: e.target.value })}
            placeholder="Conjoint, enfants — précisez les âges si applicable"
            className="rounded-lg h-12"
            maxLength={200}
          />
        </div>
      )}

      <div className="flex items-center justify-between py-2">
        <Label>Fumeur</Label>
        <Switch checked={data.smoker} onCheckedChange={v => onChange({ smoker: v })} />
      </div>

      <div className="space-y-2">
        <Label>Disponibilité pendant le séjour</Label>
        <Select value={data.availability_during} onValueChange={v => onChange({ availability_during: v })}>
          <SelectTrigger className="rounded-lg h-12"><SelectValue placeholder="Choisir" /></SelectTrigger>
          <SelectContent>
            {AVAILABILITY_OPTIONS.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Style de vie / habitudes</Label>
        <ChipSelect options={LIFESTYLE_OPTIONS} selected={data.lifestyle} onChange={v => onChange({ lifestyle: v })} />
        <HintBubble>Les propriétaires d'un chien sportif chercheront un gardien actif. Soyez honnête, ça aide au matching.</HintBubble>
      </div>
    </div>
  );
};

export default StepSitterProfile;
