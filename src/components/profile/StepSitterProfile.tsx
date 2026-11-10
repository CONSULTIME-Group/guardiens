import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import ChipSelect from "./ChipSelect";
import HintBubble from "./HintBubble";
import YesNoChips from "./YesNoChips";
import type { SitterProfileData } from "@/hooks/useSitterProfile";
import { LIFE_PACE_OPTIONS, SITTER_TYPE_OPTIONS, WORK_DURING_SIT_OPTIONS } from "@/lib/profileMatchingOptions";
import TripsQuestion from "./TripsQuestion";
import FieldRole from "./FieldRole";
import SectionBadge from "./SectionBadge";

const SITTER_TYPES = SITTER_TYPE_OPTIONS;
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

      {/* Lot SC1 : les deux réponses qui comptent double dans le calcul
          d'affinité (présence, trajets) ouvrent la section. */}
      <section className="space-y-5 rounded-[20px] border border-border bg-card p-4 shadow-sm" aria-labelledby="lbl-during-sit" data-block="pendant-la-garde">
        <div className="flex items-center gap-3">
          <SectionBadge icon="home" tone="sky" />
          <h3 id="lbl-during-sit" className="font-heading text-xl font-semibold">Pendant la garde</h3>
        </div>
        <div className="space-y-2" data-field="presence">
          <Label htmlFor="work-during-sit-trigger" className="text-base">Votre présence pendant la garde</Label>
          <Select value={data.work_during_sit} onValueChange={v => onChange({ work_during_sit: v })}>
            <SelectTrigger id="work-during-sit-trigger" className="rounded-lg h-12"><SelectValue placeholder="Choisir" /></SelectTrigger>
            <SelectContent>
              {WORK_DURING_SIT_OPTIONS.map(o => (
                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FieldRole roles={["match_double", "public"]} />
        </div>
        <TripsQuestion
          value={{ has_license: data.has_license, has_vehicle: data.has_vehicle }}
          onChange={cols => onChange(cols)}
          roleLine="Compte double sur les annonces où une voiture est nécessaire."
          roles={["public"]}
        />
      </section>

      <div className="space-y-2">
        <Label htmlFor="sitter-type-trigger">Type de gardien</Label>
        <Select value={data.sitter_type} onValueChange={v => onChange({ sitter_type: v })}>
          <SelectTrigger id="sitter-type-trigger" className="rounded-lg h-12"><SelectValue placeholder="Choisir" /></SelectTrigger>
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
            placeholder="Conjoint, enfants, précisez les âges si applicable"
            className="rounded-lg h-12"
            maxLength={200}
          />
        </div>
      )}

      <div className="space-y-2">
        <Label id="lbl-smoker">Fumeur</Label>
        <YesNoChips ariaLabelledBy="lbl-smoker" value={data.smoker} onChange={v => onChange({ smoker: v })} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="availability-during-trigger">Disponibilité pendant le séjour</Label>
        <Select value={data.availability_during} onValueChange={v => onChange({ availability_during: v })}>
          <SelectTrigger id="availability-during-trigger" className="rounded-lg h-12"><SelectValue placeholder="Choisir" /></SelectTrigger>
          <SelectContent>
            {AVAILABILITY_OPTIONS.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Availability toggle, moved here from Mobility */}
      <div className="flex items-center justify-between rounded-lg border border-primary/20 bg-primary/5 p-4">
        <div>
          <Label htmlFor="is-available-switch" className="text-base font-semibold">Je suis disponible</Label>
          <p className="text-sm text-muted-foreground mt-0.5">Activez pour apparaître dans les résultats de recherche avec un badge vert.</p>
        </div>
        <Switch id="is-available-switch" checked={data.is_available} onCheckedChange={v => onChange({ is_available: v })} />
      </div>

      <section className="space-y-4 rounded-[20px] border border-border bg-card p-4 shadow-sm" aria-labelledby="lbl-rhythm">
        <div className="flex items-center gap-3">
          <SectionBadge icon="clock" tone="honey" />
          <h3 id="lbl-rhythm" className="font-heading text-xl font-semibold">Votre rythme</h3>
        </div>
        <div className="space-y-2">
          <Label htmlFor="life-pace-trigger" className="text-base">Rythme de vie</Label>
          <Select value={data.life_pace} onValueChange={v => onChange({ life_pace: v })}>
            <SelectTrigger id="life-pace-trigger" className="rounded-lg h-12"><SelectValue placeholder="Choisir" /></SelectTrigger>
            <SelectContent>
              {LIFE_PACE_OPTIONS.map(o => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label} · {o.description}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FieldRole roles={["match", "public"]} />
        </div>
        <div className="space-y-2">
          <Label id="lbl-lifestyle" className="text-base">Vos habitudes</Label>
          <ChipSelect
            options={LIFESTYLE_OPTIONS}
            selected={data.lifestyle}
            onChange={v => onChange({ lifestyle: v })}
            ariaLabelledBy="lbl-lifestyle"
          />
          <HintBubble>Ces informations aident les propriétaires à vous choisir. Plus c'est précis, mieux c'est.</HintBubble>
        </div>
      </section>
    </div>
  );
};

export default StepSitterProfile;
