import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import HintBubble from "./HintBubble";
import ChipSelect from "./ChipSelect";
import RadioChipGroup from "./RadioChipGroup";
import {
  VEHICLE_OPTIONS,
  MIN_STAY_DURATION_OPTIONS,
  FREQUENCY_OPTIONS,
  NOTICE_OPTIONS,
} from "@/lib/mobilityOptions";
import type { SitterProfileData } from "@/hooks/useSitterProfile";

const PERIOD_OPTIONS = ["Toute l'année", "Été", "Hiver", "Vacances scolaires", "Week-ends"];
const ENVIRONMENT_OPTIONS = ["Ville", "Campagne", "Montagne", "Lac", "Vignes", "Forêt"];

interface Props {
  data: SitterProfileData;
  onChange: (partial: Partial<SitterProfileData>) => void;
}

const StepMobility = ({ data, onChange }: Props) => {
  return (
    <div className="space-y-6">
      {/* Vehicle type (choix unique, persisté en colonne vehicle_type) */}
      <div className="space-y-2">
        <Label id="lbl-vehicle-type">Vous avez un véhicule ?</Label>
        <RadioChipGroup
          ariaLabelledBy="lbl-vehicle-type"
          options={VEHICLE_OPTIONS}
          value={data.vehicle_type || ""}
          onChange={v => onChange({ vehicle_type: v })}
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
        <HintBubble>Plus votre rayon est large, plus vous verrez d'annonces. Mais la proximité est un atout, les propriétaires préfèrent les gardiens proches.</HintBubble>
      </div>

      {/* Durée minimum souhaitée (choix unique) */}
      <div className="space-y-2">
        <Label id="lbl-min-stay">Durée minimum souhaitée</Label>
        <RadioChipGroup
          ariaLabelledBy="lbl-min-stay"
          options={MIN_STAY_DURATION_OPTIONS}
          value={data.min_stay_duration || ""}
          onChange={v => onChange({ min_stay_duration: v })}
        />
        <p className="text-xs text-muted-foreground">
          Nous vous montrons les annonces qui correspondent à cette durée minimum.
        </p>
      </div>

      {/* Fréquence souhaitée (choix unique) */}
      <div className="space-y-2">
        <Label id="lbl-frequency">Fréquence souhaitée</Label>
        <RadioChipGroup
          ariaLabelledBy="lbl-frequency"
          options={FREQUENCY_OPTIONS}
          value={data.preferred_frequency || ""}
          onChange={v => onChange({ preferred_frequency: v })}
        />
      </div>

      {/* Préavis minimum (choix unique) */}
      <div className="space-y-2">
        <Label id="lbl-notice">Préavis minimum</Label>
        <RadioChipGroup
          ariaLabelledBy="lbl-notice"
          options={NOTICE_OPTIONS}
          value={data.min_notice || ""}
          onChange={v => onChange({ min_notice: v })}
        />
      </div>

      {/* Période de l'année (multi, 3 max) */}
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

      {/* Environnements préférés (multi, 3 max) */}
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
          Vos préférences, pas une contrainte. Cela aide les propriétaires à vous choisir.
        </p>
      </div>
    </div>
  );
};

export default StepMobility;
