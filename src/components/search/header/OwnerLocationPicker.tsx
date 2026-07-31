import type { ReactNode, KeyboardEvent } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Crosshair } from "lucide-react";
import { DEPT_NAMES } from "@/lib/departments";
import { REGION_NAMES } from "@/lib/regions";

interface OwnerLocationPickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Bouton déclencheur, seul élément qui diffère entre desktop et mobile. */
  trigger: ReactNode;
  contentClassName: string;
  /** Classe additionnelle sur la liste des communes (défilement desktop). */
  communesClassName?: string;
  autoFocus?: boolean;
  cityInput: string;
  onCityInputChange: (value: string) => void;
  onCityKeyDown: (e: KeyboardEvent<HTMLInputElement>) => void;
  onGeolocate: () => void;
  citySuggestions: any[];
  deptSuggestions: string[];
  regionSuggestions: string[];
  onSelectCity: (suggestion: any) => void;
  onSelectDept: (code: string) => void;
  onSelectRegion: (code: string) => void;
}

/**
 * Sélecteur de lieu de la recherche gardiens, monté une seule fois par
 * SearchOwner (rendu conditionné en JavaScript selon isMobile). Le contenu,
 * les listes et les handlers sont partagés, seul le trigger et la largeur
 * du popover diffèrent selon le contexte.
 */
const OwnerLocationPicker = ({
  open,
  onOpenChange,
  trigger,
  contentClassName,
  communesClassName,
  autoFocus,
  cityInput,
  onCityInputChange,
  onCityKeyDown,
  onGeolocate,
  citySuggestions,
  deptSuggestions,
  regionSuggestions,
  onSelectCity,
  onSelectDept,
  onSelectRegion,
}: OwnerLocationPickerProps) => (
  <Popover open={open} onOpenChange={onOpenChange}>
    <PopoverTrigger asChild>{trigger}</PopoverTrigger>
    <PopoverContent align="start" className={contentClassName}>
      <div className="relative">
        <Input
          placeholder="Ville, département (ex. 69) ou région…"
          value={cityInput}
          onChange={(e) => onCityInputChange(e.target.value)}
          onKeyDown={onCityKeyDown}
          className="pr-10"
          aria-label="Ville, département ou région"
          autoFocus={autoFocus}
        />
        <button
          type="button"
          onClick={onGeolocate}
          aria-label="Utiliser ma position actuelle"
          className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary"
        >
          <Crosshair className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
      {citySuggestions.length > 0 && (
        <div className={`space-y-1${communesClassName ? ` ${communesClassName}` : ""}`}>
          <p className="px-3 text-[10px] uppercase tracking-wide text-muted-foreground/70">Communes</p>
          {citySuggestions.map((s: any, i: number) => (
            <button
              key={i}
              className="w-full text-left px-3 py-2 rounded-lg text-sm hover:bg-muted transition-colors"
              onClick={() => onSelectCity(s)}
            >
              <span className="font-medium">{s.nom}</span>
              {s.codesPostaux?.[0] && <span className="text-muted-foreground ml-1">({s.codesPostaux[0]})</span>}
            </button>
          ))}
        </div>
      )}
      {deptSuggestions.length > 0 && (
        <div className="space-y-1">
          <p className="px-3 text-[10px] uppercase tracking-wide text-muted-foreground/70">Départements</p>
          {deptSuggestions.map((d) => (
            <button
              key={d}
              className="w-full text-left px-3 py-2 rounded-lg text-sm hover:bg-muted transition-colors"
              onClick={() => onSelectDept(d)}
            >
              <span className="font-medium">{DEPT_NAMES[d]}</span>
              <span className="text-muted-foreground ml-1">({d})</span>
            </button>
          ))}
        </div>
      )}
      {regionSuggestions.length > 0 && (
        <div className="space-y-1">
          <p className="px-3 text-[10px] uppercase tracking-wide text-muted-foreground/70">Régions</p>
          {regionSuggestions.map((r) => (
            <button
              key={r}
              className="w-full text-left px-3 py-2 rounded-lg text-sm hover:bg-muted transition-colors"
              onClick={() => onSelectRegion(r)}
            >
              <span className="font-medium">{REGION_NAMES[r]}</span>
            </button>
          ))}
        </div>
      )}
    </PopoverContent>
  </Popover>
);

export default OwnerLocationPicker;
