import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { MapPin, Crosshair } from "lucide-react";
import { normalize } from "@/lib/normalize";

interface CitySuggestion { nom: string; codesPostaux?: string[] }
interface DeptSuggestion { code: string; name: string; isPrimary?: boolean }
interface RegionSuggestion { code: string; name: string }

interface LocationPickerPopoverProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  triggerClassName: string;
  city: string;
  cityInput: string;
  onCityInputChange: (val: string) => void;
  onCityConfirm: () => void;
  citySuggestions: CitySuggestion[];
  deptSuggestions: DeptSuggestion[];
  regionSuggestions: RegionSuggestion[];
  primaryDeptCode: string | null;
  onCitySelect: (name: string, postalCode?: string) => void;
  onDeptSelect: (code: string) => void;
  onRegionSelect: (code: string) => void;
  onGeolocate: () => void;
}

const LocationPickerPopover = ({
  open,
  onOpenChange,
  triggerClassName,
  city,
  cityInput,
  onCityInputChange,
  onCityConfirm,
  citySuggestions,
  deptSuggestions,
  regionSuggestions,
  primaryDeptCode,
  onCitySelect,
  onDeptSelect,
  onRegionSelect,
  onGeolocate,
}: LocationPickerPopoverProps) => {
  const q = normalize(cityInput);
  const looksLikeDeptOrCp = /^\d{1,5}$|^2[ab]\d{0,3}$/i.test(q);
  const exactDeptOrRegion =
    deptSuggestions.some(d => normalize(d.name) === q) ||
    regionSuggestions.some(r => normalize(r.name) === q);
  const territoryFirst = looksLikeDeptOrCp || exactDeptOrRegion;
  const isCp = /^\d{5}$/.test(q);
  const communesLimit = territoryFirst ? 3 : 8;
  const visibleCities = citySuggestions.slice(0, communesLimit);
  const hiddenCitiesCount = Math.max(0, citySuggestions.length - visibleCities.length);

  const Communes = visibleCities.length > 0 && (
    <div className="mt-2" key="communes">
      <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground px-1 mb-1 flex items-center justify-between">
        <span>Communes</span>
        {hiddenCitiesCount > 0 && (
          <span className="text-[10px] normal-case tracking-normal text-muted-foreground/70">
            +{hiddenCitiesCount} masquée{hiddenCitiesCount > 1 ? "s" : ""}
          </span>
        )}
      </p>
      <div className="border border-border rounded-lg overflow-hidden">
        {visibleCities.map((s, i) => (
          <button
            key={i}
            onClick={() => onCitySelect(s.nom, s.codesPostaux?.[0])}
            className="w-full text-left px-3 py-2 text-sm text-foreground hover:bg-accent transition-colors flex items-center gap-2"
          >
            <MapPin className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <span>{s.nom}</span>
            {s.codesPostaux?.[0] && (
              <span className="text-muted-foreground ml-auto text-xs">{s.codesPostaux[0]}</span>
            )}
          </button>
        ))}
      </div>
    </div>
  );

  const Departements = deptSuggestions.length > 0 && (
    <div className="mt-2" key="depts">
      <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground px-1 mb-1">
        {primaryDeptCode ? (isCp ? "Département (depuis le code postal)" : "Département reconnu") : "Départements"}
      </p>
      <div className="border border-border rounded-lg overflow-hidden">
        {deptSuggestions.map((d) => (
          <button
            key={d.code}
            onClick={() => onDeptSelect(d.code)}
            className={`w-full text-left px-3 py-2 text-sm transition-colors flex items-center gap-2 ${
              d.isPrimary
                ? "bg-primary/10 hover:bg-primary/15 text-foreground ring-1 ring-inset ring-primary/30"
                : "text-foreground hover:bg-accent"
            }`}
          >
            <span className={`inline-flex items-center justify-center min-w-[28px] h-5 rounded text-[11px] font-mono font-semibold ${
              d.isPrimary ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"
            }`}>{d.code}</span>
            <span className={d.isPrimary ? "font-medium" : ""}>{d.name}</span>
            <span className="ml-auto text-[11px] text-muted-foreground">
              {d.isPrimary ? (isCp ? "match CP" : "correspondance") : "département"}
            </span>
          </button>
        ))}
      </div>
    </div>
  );

  const Regions = regionSuggestions.length > 0 && (
    <div className="mt-2" key="regions">
      <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground px-1 mb-1">Régions</p>
      <div className="border border-border rounded-lg overflow-hidden">
        {regionSuggestions.map((r) => (
          <button
            key={r.code}
            onClick={() => onRegionSelect(r.code)}
            className="w-full text-left px-3 py-2 text-sm text-foreground hover:bg-accent transition-colors flex items-center gap-2"
          >
            <MapPin className="h-4 w-4 text-muted-foreground" />
            <span>{r.name}</span>
            <span className="ml-auto text-[11px] text-muted-foreground">région</span>
          </button>
        ))}
      </div>
    </div>
  );

  const noResults =
    cityInput.length >= 2 &&
    citySuggestions.length === 0 &&
    deptSuggestions.length === 0 &&
    regionSuggestions.length === 0;

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        <button className={triggerClassName} aria-label={`Ville sélectionnée : ${city || "aucune"}. Cliquer pour changer.`}>
          <MapPin className="h-4 w-4 text-primary" />
          <span className="text-foreground">{city || "Lieu"}</span>
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-3" align="start">
        <Input
          placeholder="Ville, département (ex. 69) ou région…"
          value={cityInput}
          onChange={e => onCityInputChange(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter") onCityConfirm(); }}
          autoFocus
        />

        <div className="max-h-[60vh] overflow-y-auto">
          {territoryFirst
            ? <>{Departements}{Regions}{Communes}</>
            : <>{Communes}{Departements}{Regions}</>}
        </div>

        {noResults && (
          <p className="mt-2 px-1 text-xs text-muted-foreground">
            Aucun résultat. Essayez un nom de ville, un numéro de département ou une région.
          </p>
        )}

        <button
          onClick={onGeolocate}
          className="flex items-center gap-2 w-full mt-2 px-3 py-2 text-sm text-primary hover:bg-accent rounded-lg transition-colors border-t border-border pt-3"
        >
          <Crosshair className="h-4 w-4" /> Utiliser ma position
        </button>
      </PopoverContent>
    </Popover>
  );
};

export default LocationPickerPopover;
