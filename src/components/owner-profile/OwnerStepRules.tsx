import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import ChipSelect from "../profile/ChipSelect";
import HintBubble from "../profile/HintBubble";
import AiSuggestButton from "../profile/AiSuggestButton";
import type { OwnerProfileData } from "@/hooks/useOwnerProfile";

const SITTER_TYPES = ["Sans préférence", "Couple", "Famille", "Retraité", "Actif solo"];
const PRESENCE = ["100% sur place", "Télétravail OK", "Absences courtes OK"];
const VISITS = ["Oui librement", "Oui ponctuellement", "Non"];
const OVERNIGHT = ["Oui conjoint/ami", "À discuter", "Non"];
const SPACES = ["Piscine", "BBQ", "Jardin", "Cuisine complète", "Buanderie"];
const SMOKER = ["Oui dehors uniquement", "Non"];

interface Props {
  data: OwnerProfileData;
  onChange: (partial: Partial<OwnerProfileData>) => void;
}

const OwnerStepRules = ({ data, onChange }: Props) => (
  <div className="space-y-6">
    <h2 className="font-heading text-2xl font-bold">Attentes & règles</h2>

    <h3 className="font-heading text-lg font-semibold">Attentes envers le gardien</h3>

    <div className="space-y-2">
      <Label>Profil de gardien privilégié</Label>
      <ChipSelect options={SITTER_TYPES} selected={data.preferred_sitter_types} onChange={v => onChange({ preferred_sitter_types: v })} />
    </div>

    <div className="space-y-2">
      <Label>Présence attendue</Label>
      <Select value={data.presence_expected} onValueChange={v => onChange({ presence_expected: v })}>
        <SelectTrigger className="rounded-lg h-12"><SelectValue placeholder="Choisir" /></SelectTrigger>
        <SelectContent>{PRESENCE.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
      </Select>
    </div>

    <div className="flex items-center justify-between py-2">
      <Label className="flex-1 pr-4">Le gardien doit-il avoir de l'expérience avec ce type d'animal ?</Label>
      <Switch checked={data.experience_required} onCheckedChange={v => onChange({ experience_required: v })} />
    </div>

    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label>Attentes spécifiques</Label>
        <AiSuggestButton field="specific_expectations" currentValue={data.specific_expectations} onSuggestion={text => onChange({ specific_expectations: text })} />
      </div>
      <Textarea value={data.specific_expectations} onChange={e => onChange({ specific_expectations: e.target.value })}
        placeholder="Arrosage, courrier, entretien jardin, ménage... tout ce qui est en plus de la garde"
        className="rounded-lg min-h-[80px]" maxLength={2000} />
    </div>

    <h3 className="font-heading text-lg font-semibold mt-4">Règles de la maison</h3>

    <div className="space-y-2">
      <Label>Visites autorisées</Label>
      <Select value={data.visits_allowed} onValueChange={v => onChange({ visits_allowed: v })}>
        <SelectTrigger className="rounded-lg h-12"><SelectValue placeholder="Choisir" /></SelectTrigger>
        <SelectContent>{VISITS.map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent>
      </Select>
    </div>

    <div className="space-y-2">
      <Label>Invité à dormir autorisé</Label>
      <Select value={data.overnight_guest} onValueChange={v => onChange({ overnight_guest: v })}>
        <SelectTrigger className="rounded-lg h-12"><SelectValue placeholder="Choisir" /></SelectTrigger>
        <SelectContent>{OVERNIGHT.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
      </Select>
    </div>

    <div className="space-y-2">
      <Label>Utilisation des espaces</Label>
      <ChipSelect options={SPACES} selected={data.space_usage} onChange={v => onChange({ space_usage: v })} />
    </div>

    <div className="space-y-2">
      <Label>Fumeur accepté</Label>
      <Select value={data.smoker_accepted} onValueChange={v => onChange({ smoker_accepted: v })}>
        <SelectTrigger className="rounded-lg h-12"><SelectValue placeholder="Choisir" /></SelectTrigger>
        <SelectContent>{SMOKER.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
      </Select>
    </div>

    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label>Précisions règles de vie</Label>
        <AiSuggestButton field="rules_notes" currentValue={data.rules_notes} onSuggestion={text => onChange({ rules_notes: text })} />
      </div>
      <Textarea value={data.rules_notes} onChange={e => onChange({ rules_notes: e.target.value })}
        placeholder="Nuancez ici — ex : un BBQ entre amis OK, pas de soirée de groupe"
        className="rounded-lg min-h-[80px]" maxLength={2000} />
      <HintBubble>Soyez clair dès le départ, ça évite 90% des malentendus. Les gardiens préfèrent savoir à quoi s'attendre.</HintBubble>
    </div>
  </div>
);

export default OwnerStepRules;
