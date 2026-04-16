import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { usePostalCodeCity } from "@/hooks/usePostalCodeCity";

interface Props {
  city: string;
  postalCode: string;
  onChange: (partial: { city?: string; postal_code?: string }) => void;
  cityLabel?: string;
  postalLabel?: string;
  cityId?: string;
  postalId?: string;
  className?: string;
  inputClassName?: string;
  required?: boolean;
  disabled?: boolean;
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
}: Props) => {
  const { handlePostalCodeChange, selectCity, cities, loading, error } =
    usePostalCodeCity(onChange);

  return (
    <div className={className}>
      <div className="space-y-2">
        <Label htmlFor={cityId}>
          {cityLabel}
          {required && " *"}
        </Label>
        {cities.length > 1 ? (
          <Select value={city} onValueChange={(v) => selectCity(v)}>
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
  );
};

export default PostalCodeCityFields;
