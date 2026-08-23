import { Label } from "@/components/ui/label";
import HintBubble from "./HintBubble";
import ChipSelect from "./ChipSelect";
import RadioChipGroup from "./RadioChipGroup";
import YesNoChips from "./YesNoChips";
import {
  MIN_STAY_DURATION_OPTIONS,
  FREQUENCY_OPTIONS,
  NOTICE_OPTIONS,
} from "@/lib/mobilityOptions";
import type { SitterProfileData } from "@/hooks/useSitterProfile";
import { isRadiusDeclared, RADIUS_CHOICE_OPTIONS } from "@/lib/searchRadius";

const PERIOD_OPTIONS = ["Toute l'année", "Été", "Hiver", "Vacances scolaires", "Week-ends"];
const ENVIRONMENT_OPTIONS = ["Ville", "Campagne", "Montagne", "Lac", "Vignes", "Forêt"];

interface Props {
  data: SitterProfileData;
  onChange: (partial: Partial<SitterProfileData>) => void;
}

const StepMobility = ({ data, onChange }: Props) => {
  // 30 n'est jamais proposé : c'est le marqueur de silence (ancien défaut de
  // colonne). Une déclaration hors liste (ancienne saisie) reste visible.
  const radiusChoices = new Set<number>(RADIUS_CHOICE_OPTIONS);
  if (isRadiusDeclared(data.geographic_radius)) radiusChoices.add(data.geographic_radius);
  const radiusOptions = [...radiusChoices]
    .sort((a, b) => a - b)
    .map(km => ({ value: String(km), label: `${km} km` }));
  return (
    <div className="space-y-6">
      {/* Le choix du type de véhicule a été retiré le 23/08/2026 (champ mort :
          3 profils sur 1 037, jamais scoré). La mobilité se déclare via
          Permis de conduire + Véhicule personnel, qui sont scorés. */}
      <div className="space-y-2">
        <Label id="lbl-has-license">Permis de conduire</Label>
        <YesNoChips ariaLabelledBy="lbl-has-license" value={data.has_license} onChange={v => onChange({ has_license: v })} />
      </div>

      <div className="space-y-2">
        <Label id="lbl-has-vehicle">Véhicule personnel</Label>
        <YesNoChips ariaLabelledBy="lbl-has-vehicle" value={data.has_vehicle} onChange={v => onChange({ has_vehicle: v })} />
      </div>

      <div className="space-y-3">
        <Label id="lbl-radius">Jusqu'à quelle distance acceptez-vous de vous déplacer pour une garde ?</Label>
        <RadioChipGroup
          ariaLabelledBy="lbl-radius"
          options={radiusOptions}
          value={isRadiusDeclared(data.geographic_radius) ? String(data.geographic_radius) : ""}
          onChange={v => onChange({ geographic_radius: v === "" ? null : Number(v) })}
        />
        <HintBubble>Sans réponse, nous retenons 100 km autour de chez vous. Choisissez la distance qui vous convient vraiment : elle détermine les annonces que vous recevez.</HintBubble>
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
