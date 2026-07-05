import { useState } from "react";
import { MapPin, Loader2, X, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  RADIUS_OPTIONS,
  type RadiusKm,
  type GeolocationResult,
  type GeolocationErrorReason,
} from "@/hooks/useMissionDistance";

interface Props {
  postal: string;
  onPostalChange: (v: string) => void;
  radius: RadiusKm;
  onRadiusChange: (v: RadiusKm) => void;
  active: boolean;
  resolving: boolean;
  isValidPostal: boolean;
  onUseMyLocation: () => Promise<GeolocationResult>;
  onClear: () => void;
}

const GEO_ERROR_MESSAGES: Record<GeolocationErrorReason, string> = {
  denied:
    "Localisation refusée. Autorisez l'accès dans les réglages de votre navigateur ou saisissez votre code postal.",
  timeout:
    "La localisation a pris trop de temps. Réessayez ou saisissez votre code postal.",
  unavailable:
    "Position indisponible pour le moment. Saisissez votre code postal pour continuer.",
  unsupported:
    "Votre navigateur ne prend pas en charge la géolocalisation. Saisissez votre code postal.",
};

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
  const [geoError, setGeoError] = useState<GeolocationErrorReason | null>(null);
  const showPostalError = postal.length > 0 && !isValidPostal;
  const errorMsg = geoError ? GEO_ERROR_MESSAGES[geoError] : null;

  const handleLocate = async () => {
    setLocating(true);
    setGeoError(null);
    const res = await onUseMyLocation();
    setLocating(false);
    if (res.ok === true) {
      toast.success("Position détectée. Tri par proximité activé.");
      return;
    }
    const reason = res.reason;
    setGeoError(reason);
    toast.error(GEO_ERROR_MESSAGES[reason]);
  };

  // Toute saisie manuelle purge l'erreur géoloc pour ne pas fausser le contexte.
  const handlePostalChange = (v: string) => {
    if (geoError) setGeoError(null);
    onPostalChange(v);
  };

  const handleClear = () => {
    setGeoError(null);
    onClear();
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
          onChange={(e) => handlePostalChange(e.target.value.replace(/\D/g, "").slice(0, 5))}
          placeholder="Code postal"
          aria-label="Votre code postal (5 chiffres)"
          aria-invalid={showPostalError || undefined}
          aria-describedby={
            showPostalError
              ? "proximity-postal-error"
              : errorMsg
                ? "proximity-geo-error"
                : undefined
          }
          className={`h-9 w-[148px] pl-8 pr-7 text-xs ${showPostalError ? "border-destructive" : ""}`}
        />
        {postal && (
          <button
            type="button"
            onClick={handleClear}
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
          className="h-9 w-auto min-w-[100px] text-xs"
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
        variant="outline"
        size="sm"
        onClick={handleLocate}
        disabled={locating || resolving}
        className="h-9 text-xs gap-1.5 px-3"
        aria-label={
          locating
            ? "Recherche de votre position en cours"
            : "Utiliser ma position actuelle"
        }
        aria-busy={locating || undefined}
      >
        {locating || resolving ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
        ) : (
          <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
        )}
        <span>
          {locating ? "Localisation…" : "Ma position"}
        </span>
      </Button>

      {showPostalError && (
        <span
          id="proximity-postal-error"
          role="alert"
          className="text-[11px] text-destructive w-full"
        >
          Code postal invalide (5 chiffres).
        </span>
      )}

      {!showPostalError && errorMsg && (
        <div
          id="proximity-geo-error"
          role="alert"
          className="w-full flex items-start gap-1.5 text-[11px] text-destructive"
        >
          <AlertCircle className="h-3.5 w-3.5 mt-px shrink-0" aria-hidden="true" />
          <span className="leading-snug">{errorMsg}</span>
        </div>
      )}
    </div>
  );
};

export default ProximityFilter;
