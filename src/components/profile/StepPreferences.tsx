import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import ChipSelect from "./ChipSelect";
import type { SitterProfileData } from "@/hooks/useSitterProfile";

const MEETING_OPTIONS = [
  "Dîner/apéro avant", "Visite la veille", "Passage le jour même",
  "Visio avant", "Échange messagerie suffit", "S'adapte au propriétaire"
];
const HANDOVER_OPTIONS = ["La veille avec nuit commune", "Le jour du départ", "À distance OK", "S'adapte"];
const LANGUAGE_OPTIONS = ["Français", "Anglais", "Espagnol", "Autre"];
const SKILL_OPTIONS = ["Jardinage", "Bricolage", "Ménage", "Cuisine", "Premiers secours animaux"];
const INTEREST_OPTIONS = ["Rando", "Lecture", "Cuisine", "Photo", "Musique", "Yoga", "Vélo", "Autre"];

interface Props {
  data: SitterProfileData;
  onChange: (partial: Partial<SitterProfileData>) => void;
}

const StepPreferences = ({ data, onChange }: Props) => (
  <div className="space-y-6">

    <h3 className="font-heading text-lg font-semibold mt-2">Préférences de garde</h3>

    <div className="flex items-center justify-between py-2">
      <Label className="flex-1 pr-4">J'accepte les maisons où les visites et invités ne sont pas autorisés</Label>
      <Switch checked={data.strict_rules_ok} onCheckedChange={v => onChange({ strict_rules_ok: v })} />
    </div>

    <div className="flex items-center justify-between py-2">
      <Label className="flex-1 pr-4">Je préfère les propriétaires qui autorisent les visites</Label>
      <Switch checked={data.prefer_visitors} onCheckedChange={v => onChange({ prefer_visitors: v })} />
    </div>

    <div className="flex items-center justify-between py-2">
      <Label className="flex-1 pr-4">J'accepte les gardes avec beaucoup d'animaux ou animaux de ferme</Label>
      <Switch checked={data.farm_animals_ok} onCheckedChange={v => onChange({ farm_animals_ok: v })} />
    </div>

    <div className="space-y-2">
      <Label>Précisions</Label>
      <Textarea
        value={data.preferences_notes}
        onChange={e => onChange({ preferences_notes: e.target.value })}
        placeholder="Précisez vos préférences..."
        className="rounded-lg min-h-[80px]"
        maxLength={1000}
      />
    </div>

    <h3 className="font-heading text-lg font-semibold mt-4">Comment j'aime arriver</h3>

    <div className="space-y-2">
      <Label>Rencontre souhaitée</Label>
      <ChipSelect options={MEETING_OPTIONS} selected={data.meeting_preference} onChange={v => onChange({ meeting_preference: v })} />
    </div>

    <div className="space-y-2">
      <Label>Passage de relais préféré</Label>
      <Select value={data.handover_preference} onValueChange={v => onChange({ handover_preference: v })}>
        <SelectTrigger className="rounded-lg h-12"><SelectValue placeholder="Choisir" /></SelectTrigger>
        <SelectContent>
          {HANDOVER_OPTIONS.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>

    <h3 className="font-heading text-lg font-semibold mt-4">Bonus profil</h3>

    <div className="space-y-2">
      <Label>Langues parlées</Label>
      <ChipSelect options={LANGUAGE_OPTIONS} selected={data.languages} onChange={v => onChange({ languages: v })} />
    </div>

    <div className="space-y-2">
      <Label>Compétences bonus</Label>
      <ChipSelect options={SKILL_OPTIONS} selected={data.bonus_skills} onChange={v => onChange({ bonus_skills: v })} />
    </div>

    <div className="space-y-2">
      <Label>Centres d'intérêt</Label>
      <ChipSelect options={INTEREST_OPTIONS} selected={data.interests} onChange={v => onChange({ interests: v })} />
    </div>
  </div>
);

export default StepPreferences;
