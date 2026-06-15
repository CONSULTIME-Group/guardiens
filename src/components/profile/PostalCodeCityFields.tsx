import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { usePostalCodeCity } from "@/hooks/usePostalCodeCity";
import { COUNTRIES } from "@/lib/countries";

interface Props {
  city: string;
  postalCode: string;
  onChange: (partial: { city?: string; postal_code?: string; country?: string }) => void;
  cityLabel?: string;
  postalLabel?: string;
  cityId?: string;
  postalId?: string;
  className?: string;
  inputClassName?: string;
  required?: boolean;
  disabled?: boolean;
  /** Optional: enable "I live abroad" toggle. Pass the current country (defaults to "FR"). */
  country?: string;
  showAbroadToggle?: boolean;
}

const PostalCodeCityFields = ({
  city,
  postalCode,
  onChange,
  cityLabel = "Ville",
  postalLabel = "Code postal",
  cityId = "city",
  postalId = "postal_code",
  className = "grid grid-cols-1 sm:grid-cols-2 gap-4",
  inputClassName = "rounded-lg h-12",
  required = false,
  disabled = false,
  country,
  showAbroadToggle = true,
}: Props) => {
  const { handlePostalCodeChange, selectCity, cities, loading, error } =
    usePostalCodeCity(onChange);

  // Si on n'a pas reçu de country mais qu'il y a déjà un postal → FR par défaut.
  const initialCountry = country ?? "FR";
  const [abroad, setAbroad] = useState<boolean>(initialCountry !== "FR");

  const toggleAbroad = () => {
    const next = !abroad;
    setAbroad(next);
    if (next) {
      // Passe à l'étranger : on vide le code postal FR
      onChange({ postal_code: "", country: country && country !== "FR" ? country : "" });
    } else {
      onChange({ country: "FR" });
    }
  };

  if (abroad) {
    return (
      <div className="space-y-3">
        <div className={className}>
          <div className="space-y-2">
            <Label htmlFor={cityId}>
              {cityLabel}
              {required && " *"}
            </Label>
            <Input
              id={cityId}
              value={city}
              onChange={(e) => onChange({ city: e.target.value })}
              className={inputClassName}
              maxLength={100}
              disabled={disabled}
              placeholder="Ex : Bruxelles"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`${postalId}_country`}>
              Pays{required && " *"}
            </Label>
            <Select
              value={country && country !== "FR" ? country : ""}
              onValueChange={(v) => onChange({ country: v })}
              disabled={disabled}
            >
              <SelectTrigger id={`${postalId}_country`} className={inputClassName}>
                <SelectValue placeholder="Sélectionner un pays" />
              </SelectTrigger>
              <SelectContent className="max-h-72">
                {COUNTRIES.filter((c) => c.code !== "FR").map((c) => (
                  <SelectItem key={c.code} value={c.code}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        {showAbroadToggle && (
          <button
            type="button"
            onClick={toggleAbroad}
            className="text-xs text-primary hover:underline"
          >
            Je vis en France
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className={className}>
        <div className="space-y-2">
          <Label htmlFor={cityId}>
            {cityLabel}
            {required && " *"}
          </Label>
          {cities.length > 1 && !disabled ? (
            <Select value={city} onValueChange={(v) => selectCity(v)} disabled={disabled}>
              <SelectTrigger className={inputClassName}>
                <SelectValue placeholder="Choisir la ville…" />
              </SelectTrigger>
              <SelectContent>
                {cities.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <Input
              id={cityId}
              value={city}
              onChange={(e) => onChange({ city: e.target.value })}
              className={inputClassName}
              maxLength={100}
              disabled={disabled}
            />
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor={postalId}>
            {postalLabel}
            {required && " *"}
          </Label>
          <div className="relative">
            <Input
              id={postalId}
              value={postalCode}
              onChange={(e) => {
                const v = e.target.value.replace(/\D/g, "");
                handlePostalCodeChange(v);
              }}
              inputMode="numeric"
              pattern="[0-9]*"
              className={inputClassName}
              maxLength={5}
              placeholder="69001"
              disabled={disabled}
            />
            {loading && (
              <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
            )}
          </div>
          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}
        </div>
      </div>
      {showAbroadToggle && (
        <button
          type="button"
          onClick={toggleAbroad}
          className="text-xs text-primary hover:underline"
        >
          Je vis à l'étranger
        </button>
      )}
    </div>
  );
};

export default PostalCodeCityFields;
