import { useId } from "react";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import ChipSelect from "../profile/ChipSelect";
import HintBubble from "../profile/HintBubble";
import AiSuggestButton from "../profile/AiSuggestButton";
import LocationProfileCard from "../location/LocationProfileCard";
import EnvironmentPills from "../shared/EnvironmentPills";
import type { OwnerProfileData } from "@/hooks/useOwnerProfile";

const TYPES = ["Appartement", "Maison", "Ferme", "Chalet", "Autre"];
const TYPE_MAP: Record<string, string> = { Appartement: "apartment", Maison: "house", Ferme: "farm", Chalet: "chalet", Autre: "other" };

/**
 * Ancien sélecteur unique (`environment`), retiré de l'écran : les puces
 * `environments` sont la seule saisie. La valeur ancienne n'est jamais
 * effacée ni recopiée sans geste du membre (bouton « Ajouter »).
 */
const LEGACY_ENV_TO_PILL: Record<string, { key: string; label: string }> = {
  city_center: { key: "ville", label: "Ville" },
  countryside: { key: "campagne", label: "Campagne" },
  mountain: { key: "montagne", label: "Montagne" },
  seaside: { key: "mer", label: "Bord de mer" },
  forest: { key: "foret", label: "Forêt" },
};

const COUNTS = ["1", "2", "3", "4", "5", "Plus de 5"];
const EQUIPMENTS = ["Jardin", "Piscine", "WiFi", "Parking", "Terrasse", "Cheminée", "Buanderie", "Lave-vaisselle", "Congélateur", "TV", "Équipement sport", "BBQ"];

interface Props {
  data: OwnerProfileData;
  onChange: (partial: Partial<OwnerProfileData>) => void;
  /** Conservé pour compat avec OwnerProfile.tsx mais non utilisé ici (la galerie gère ses uploads). */
  onUploadPhoto?: (file: File, bucket: string) => Promise<string | null>;
}

const OwnerStepHousing = ({ data, onChange }: Props) => {
  const uid = useId();
  const propertyTypeId = `${uid}-property-type`;
  const environmentsGroupId = `${uid}-environments-label`;
  const roomsId = `${uid}-rooms`;
  const bedroomsId = `${uid}-bedrooms`;
  const carRequiredId = `${uid}-car-required`;
  const accessibleId = `${uid}-accessible`;
  const equipmentsGroupId = `${uid}-equipments-label`;
  const descriptionId = `${uid}-description`;

  const legacyEnv = data.environment ? LEGACY_ENV_TO_PILL[data.environment] ?? null : null;

  return (
    <div className="space-y-6">
      <h2 className="font-heading text-2xl font-bold">Le logement</h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor={propertyTypeId}>Type de logement</Label>
          <Select value={data.property_type} onValueChange={v => onChange({ property_type: v })}>
            <SelectTrigger id={propertyTypeId} className="rounded-lg h-12"><SelectValue placeholder="Choisir" /></SelectTrigger>
            <SelectContent>
              {TYPES.map(t => <SelectItem key={t} value={TYPE_MAP[t]}>{t}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-1">
        <Label id={environmentsGroupId} className="text-sm font-medium text-foreground">L'environnement de votre logement</Label>
        <p className="text-xs text-muted-foreground mb-3">Sélectionnez jusqu'à 3 environnements qui décrivent votre cadre de vie.</p>
        <div role="group" aria-labelledby={environmentsGroupId}>
          <EnvironmentPills selected={data.environments || []} onChange={v => onChange({ environments: v })} />
        </div>
        {legacyEnv && !(data.environments || []).includes(legacyEnv.key) && (
          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <span>Ancien choix enregistré : {legacyEnv.label}.</span>
            {(data.environments || []).length < 3 && (
              <Button type="button" variant="outline" size="sm" onClick={() => onChange({ environments: [...(data.environments || []), legacyEnv.key] })}>
                Ajouter « {legacyEnv.label} »
              </Button>
            )}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor={roomsId}>Nombre de pièces</Label>
          <Select value={String(data.rooms_count)} onValueChange={v => onChange({ rooms_count: v === "Plus de 5" ? 6 : Number(v) })}>
            <SelectTrigger id={roomsId} className="rounded-lg h-12"><SelectValue placeholder="Choisir" /></SelectTrigger>
            <SelectContent>{COUNTS.map(c => <SelectItem key={c} value={c === "Plus de 5" ? "6" : c}>{c}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor={bedroomsId}>Nombre de chambres</Label>
          <Select value={String(data.bedrooms_count)} onValueChange={v => onChange({ bedrooms_count: v === "Plus de 5" ? 6 : Number(v) })}>
            <SelectTrigger id={bedroomsId} className="rounded-lg h-12"><SelectValue placeholder="Choisir" /></SelectTrigger>
            <SelectContent>{COUNTS.map(c => <SelectItem key={c} value={c === "Plus de 5" ? "6" : c}>{c}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex items-center justify-between py-2">
        <Label htmlFor={carRequiredId}>Accès voiture nécessaire</Label>
        <Switch id={carRequiredId} checked={data.car_required} onCheckedChange={v => onChange({ car_required: v })} />
      </div>
      <div className="flex items-center justify-between py-2">
        <Label htmlFor={accessibleId}>Accessible PMR</Label>
        <Switch id={accessibleId} checked={data.accessible} onCheckedChange={v => onChange({ accessible: v })} />
      </div>

      <div className="space-y-2">
        <Label id={equipmentsGroupId}>Équipements</Label>
        <ChipSelect ariaLabelledBy={equipmentsGroupId} options={EQUIPMENTS} selected={data.equipments} onChange={v => onChange({ equipments: v })} />
      </div>

      {/* Photos, gérées dans la Galerie (source unique) */}
      <div className="space-y-2">
        <Label>Photos du logement</Label>
        <p className="text-xs text-muted-foreground">
          Toutes vos photos se gèrent dans la <strong>Galerie</strong>. Vous y choisissez aussi la photo de couverture de chaque annonce.
        </p>
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            const evt = new CustomEvent("owner-profile:goto-section", { detail: "gallery" });
            window.dispatchEvent(evt);
          }}
        >
          Ouvrir la Galerie
        </Button>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor={descriptionId}>Description du logement</Label>
          <AiSuggestButton field="description" currentValue={data.description} context={{ property_type: data.property_type, environment: data.environment, city: data.city }} onSuggestion={text => onChange({ description: text })} />
        </div>
        <Textarea id={descriptionId} value={data.description} onChange={e => onChange({ description: e.target.value })}
          placeholder="Ce qui fait le charme de votre logement : son ambiance, ses particularités, ce qu'on y ressent…"
          className="rounded-lg min-h-[120px]" maxLength={3000} />
        <HintBubble>Décrivez votre intérieur : la luminosité, l'ambiance, le confort. Les infos sur le quartier et la région sont générées automatiquement.</HintBubble>
      </div>

      {/* Location profile generated by AI, replaces manual region_highlights */}
      <LocationProfileCard
        city={data.city}
        postalCode={data.postal_code}
        editable={false}
      />
    </div>
  );
};

export default OwnerStepHousing;
