import { useState } from "react";
import { MapPin, Loader2, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RADIUS_OPTIONS, type RadiusKm } from "@/hooks/useMissionDistance";

interface Props {
  postal: string;
  onPostalChange: (v: string) => void;
  radius: RadiusKm;
  onRadiusChange: (v: RadiusKm) => void;
  active: boolean;
  resolving: boolean;
  isValidPostal: boolean;
  onUseMyLocation: () => Promise<boolean>;
  onClear: () => void;
}

const ProximityFilter = ({
  postal,
  onPostalChange,
  radius,
  onRadiusChange,
  active,
  resolving,
  isValidPostal,
  onUseMyLocation,
  onClear,
}: Props) => {
  const [locating, setLocating] = useState(false);
  const showError = postal.length > 0 && !isValidPostal;

  const handleLocate = async () => {
    setLocating(true);
    await onUseMyLocation();
    setLocating(false);
  };

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <div className="relative">
        <MapPin
          aria-hidden="true"
          className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none"
        />
        <Input
          type="text"
          inputMode="numeric"
          pattern="\d{5}"
          maxLength={5}
          value={postal}
          onChange={(e) => onPostalChange(e.target.value.replace(/\D/g, "").slice(0, 5))}
          placeholder="Code postal"
          aria-label="Votre code postal (5 chiffres)"
          aria-invalid={showError || undefined}
          aria-describedby={showError ? "proximity-postal-error" : undefined}
          className={`h-8 w-[130px] pl-8 pr-7 text-xs ${showError ? "border-destructive" : ""}`}
        />
        {postal && (
          <button
            type="button"
            onClick={onClear}
            aria-label="Effacer le code postal"
            className="absolute right-1.5 top-1/2 -translate-y-1/2 p-0.5 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted"
          >
            <X className="h-3 w-3" />
          </button>
        )}
      </div>

      <Select
        value={String(radius)}
        onValueChange={(v) => onRadiusChange(Number(v) as RadiusKm)}
        disabled={!active}
      >
        <SelectTrigger
          className="h-8 w-auto min-w-[100px] text-xs"
          aria-label="Rayon de recherche"
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {RADIUS_OPTIONS.map((r) => (
            <SelectItem key={r} value={String(r)} className="text-xs">
              {r} km
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={handleLocate}
        disabled={locating || resolving}
        className="h-8 text-xs gap-1.5"
        aria-label="Utiliser ma position actuelle"
      >
        {locating || resolving ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
        ) : (
          <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
        )}
        <span className="hidden sm:inline">Ma position</span>
      </Button>

      {showError && (
        <span id="proximity-postal-error" role="alert" className="text-[11px] text-destructive w-full">
          Code postal invalide (5 chiffres).
        </span>
      )}
    </div>
  );
};

export default ProximityFilter;
