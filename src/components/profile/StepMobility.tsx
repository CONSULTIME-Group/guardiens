import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import HintBubble from "./HintBubble";
import ChipSelect from "./ChipSelect";
import type { SitterProfileData } from "@/hooks/useSitterProfile";

const VEHICLE_OPTIONS = ["Oui — voiture", "Oui — moto", "Non — transports en commun", "Non — vélo uniquement"];

const DURATION_OPTIONS = ["1-3 jours", "1 semaine", "2 semaines", "1 mois", "Flexible"];
const DURATION_VALUES: Record<string, string> = {
  "1-3 jours": "1_3_days",
  "1 semaine": "1_week",
  "2 semaines": "2_weeks",
  "1 mois": "1_month",
  "Flexible": "flexible",
};
const DURATION_REVERSE: Record<string, string> = Object.fromEntries(
  Object.entries(DURATION_VALUES).map(([k, v]) => [v, k])
);

const FREQUENCY_OPTIONS = ["Occasionnel", "Régulier", "Flexible"];
const FREQUENCY_VALUES: Record<string, string> = {
  "Occasionnel": "occasional",
  "Régulier": "regular",
  "Flexible": "flexible",
};
const FREQUENCY_REVERSE: Record<string, string> = Object.fromEntries(
  Object.entries(FREQUENCY_VALUES).map(([k, v]) => [v, k])
);

const NOTICE_OPTIONS = ["Dès que possible", "1 semaine", "2 semaines", "1 mois"];
const NOTICE_VALUES: Record<string, string> = {
  "Dès que possible": "asap",
  "1 semaine": "1_week",
  "2 semaines": "2_weeks",
  "1 mois": "1_month",
};
const NOTICE_REVERSE: Record<string, string> = Object.fromEntries(
  Object.entries(NOTICE_VALUES).map(([k, v]) => [v, k])
);

const PERIOD_OPTIONS = ["Toute l'année", "Été", "Hiver", "Vacances scolaires", "Week-ends"];
const ENVIRONMENT_OPTIONS = ["Ville", "Campagne", "Montagne", "Lac", "Vignes", "Forêt"];

interface Props {
  data: SitterProfileData;
  onChange: (partial: Partial<SitterProfileData>) => void;
}

const StepMobility = ({ data, onChange }: Props) => {
  return (
    <div className="space-y-6">
      {/* Vehicle type */}
      <div className="space-y-2">
        <Label>Vous avez un véhicule ?</Label>
        <ChipSelect
          options={VEHICLE_OPTIONS}
          selected={(data as any).vehicle_type ? [(data as any).vehicle_type] : []}
          onChange={v => onChange({ vehicle_type: v[v.length - 1] || "" } as any)}
        />
        <p className="text-xs text-muted-foreground">
          Indispensable pour les gardes en zone rurale ou avec animaux nécessitant des sorties véto.
        </p>
      </div>

      <div className="flex items-center justify-between py-2">
        <Label>Permis de conduire</Label>
        <Switch checked={data.has_license} onCheckedChange={v => onChange({ has_license: v })} />
      </div>

      <div className="flex items-center justify-between py-2">
        <Label>Véhicule personnel</Label>
        <Switch checked={data.has_vehicle} onCheckedChange={v => onChange({ has_vehicle: v })} />
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label>Rayon géographique</Label>
          <span className="text-sm font-semibold text-primary">{data.geographic_radius} km</span>
        </div>
        <Slider
          value={[data.geographic_radius]}
          onValueChange={v => onChange({ geographic_radius: v[0] })}
          min={10} max={100} step={5}
          className="py-2"
        />
        <HintBubble>Plus votre rayon est large, plus vous verrez d'annonces. Mais la proximité est un atout — les propriétaires préfèrent les gardiens proches.</HintBubble>
      </div>

      {/* Durée minimum souhaitée */}
      <div className="space-y-2">
        <Label>Durée minimum souhaitée</Label>
        <ChipSelect
          options={DURATION_OPTIONS}
          selected={DURATION_REVERSE[data.min_stay_duration] ? [DURATION_REVERSE[data.min_stay_duration]] : ["Flexible"]}
          onChange={v => {
            const last = v[v.length - 1] || "Flexible";
            onChange({ min_stay_duration: DURATION_VALUES[last] || "flexible" });
          }}
        />
        <p className="text-xs text-muted-foreground">
          Nous vous montrons les annonces qui correspondent à cette durée minimum.
        </p>
      </div>

      {/* Fréquence souhaitée */}
      <div className="space-y-2">
        <Label>Fréquence souhaitée</Label>
        <ChipSelect
          options={FREQUENCY_OPTIONS}
          selected={FREQUENCY_REVERSE[data.preferred_frequency] ? [FREQUENCY_REVERSE[data.preferred_frequency]] : ["Flexible"]}
          onChange={v => {
            const last = v[v.length - 1] || "Flexible";
            onChange({ preferred_frequency: FREQUENCY_VALUES[last] || "flexible" });
          }}
        />
      </div>

      {/* Préavis minimum */}
      <div className="space-y-2">
        <Label>Préavis minimum</Label>
        <ChipSelect
          options={NOTICE_OPTIONS}
          selected={NOTICE_REVERSE[data.min_notice] ? [NOTICE_REVERSE[data.min_notice]] : ["Dès que possible"]}
          onChange={v => {
            const last = v[v.length - 1] || "Dès que possible";
            onChange({ min_notice: NOTICE_VALUES[last] || "asap" });
          }}
        />
      </div>

      {/* Période de l'année */}
      <div className="space-y-2">
        <Label>Période de l'année</Label>
        <ChipSelect
          options={PERIOD_OPTIONS}
          selected={data.preferred_periods}
          onChange={v => {
            if (v.length <= 3) onChange({ preferred_periods: v });
          }}
        />
      </div>

      {/* Environnements préférés */}
      <div className="space-y-2">
        <Label>Environnements préférés</Label>
        <ChipSelect
          options={ENVIRONMENT_OPTIONS}
          selected={data.preferred_environments}
          onChange={v => {
            if (v.length <= 3) onChange({ preferred_environments: v });
          }}
        />
        <p className="text-xs text-muted-foreground">
          Vos préférences — pas une contrainte. Cela aide les propriétaires à vous choisir.
        </p>
      </div>
    </div>
  );
};

export default StepMobility;
