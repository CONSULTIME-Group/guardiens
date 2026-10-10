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
import { getDeptCode } from "@/lib/departments";
import { getRegionCode } from "@/lib/regions";
import {
  CONTINENT_LABELS, FR_REGION_LABELS, KNOWN_COUNTRY_CODES, countryName, normalizeTravelZones,
  type ContinentCode,
} from "@/lib/travelZones";

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

      <TravelZonesField data={data} onChange={onChange} />

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

/**
 * Lot 2 : où le gardien accepte d'aller. Choix explicites et combinables ;
 * aucune case cochée = mobilité non renseignée (null), jamais un opt-in.
 */
export const TravelZonesField = ({ data, onChange }: Props) => {
  const zones = data.travel_zones ?? [];
  const has = (t: string) => zones.includes(t);
  const set = (next: string[]) => onChange({ travel_zones: normalizeTravelZones(next) });
  const toggle = (t: string) => set(has(t) ? zones.filter((z) => z !== t) : [...zones, t]);
  const home = (data.country || "FR").toUpperCase();
  const homeRegion = home === "FR" ? getRegionCode(getDeptCode(data.postal_code || null)) : null;
  const regionToken = homeRegion && FR_REGION_LABELS[homeRegion] ? `region:FR-${homeRegion}` : null;
  const otherCountries = zones.filter((z) => z.startsWith("country:") && z !== `country:${home}`);
  const countryOptions = KNOWN_COUNTRY_CODES
    .filter((c) => c !== home && !has(`country:${c}`))
    .map((c) => ({ c, n: countryName(c) }))
    .sort((a, b) => a.n.localeCompare(b.n, "fr"));
  const chip = (t: string, label: string) => (
    <button
      key={t}
      type="button"
      aria-pressed={has(t)}
      onClick={() => toggle(t)}
      className={`min-h-11 rounded-full border px-4 py-2 text-sm transition-colors ${has(t) ? "border-primary bg-primary/10 text-primary font-medium" : "border-border bg-card text-foreground hover:border-primary"}`}
    >
      {label}
    </button>
  );
  return (
    <div className="space-y-3">
      <Label id="lbl-travel-zones">Où acceptez-vous de partir en garde ?</Label>
      <p className="text-xs text-muted-foreground">Plusieurs choix possibles. Les propriétaires de ces zones pourront vous trouver.</p>
      <div role="group" aria-labelledby="lbl-travel-zones" className="flex flex-wrap gap-2">
        {chip("local", "Près de chez moi (mon rayon)")}
        {regionToken && chip(regionToken, `Toute ma région (${FR_REGION_LABELS[homeRegion!]})`)}
        {chip(`country:${home}`, `${countryName(home)} entière`)}
        {chip("world", "Le monde entier")}
      </div>
      <p className="text-xs font-medium text-foreground pt-1">Continents</p>
      <div className="flex flex-wrap gap-2">
        {(Object.keys(CONTINENT_LABELS) as ContinentCode[]).map((c) => chip(`continent:${c}`, CONTINENT_LABELS[c]))}
      </div>
      <p className="text-xs font-medium text-foreground pt-1">Pays précis</p>
      <div className="flex flex-wrap gap-2">
        {otherCountries.map((t) => chip(t, countryName(t.slice(8))))}
        <select
          aria-label="Ajouter un pays"
          className="min-h-11 rounded-full border border-border bg-card px-3 text-base"
          value=""
          onChange={(e) => { if (e.target.value) set([...zones, `country:${e.target.value}`]); }}
        >
          <option value="">Ajouter un pays</option>
          {countryOptions.map(({ c, n }) => <option key={c} value={c}>{n}</option>)}
        </select>
      </div>
      <HintBubble>
        {zones.length === 0
          ? "Sans réponse, votre fiche indique « Mobilité non renseignée »."
          : "Vos disponibilités restent à part : ces zones disent seulement où vous pouvez aller."}
      </HintBubble>
    </div>
  );
};

export default StepMobility;
