// Choix du pays de destination, partagé par /annonces (France, moteur L1) et
// /annonces/international (moteur intlSitSearch). Lot L2.
// Valeurs : "FR", un code ISO, DEST_WORLD (France incluse), DEST_ABROAD (hors France).
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectSeparator, SelectTrigger, SelectValue } from "@/components/ui/select";
import { COUNTRIES } from "@/lib/countries";
import { DEST_ABROAD, DEST_WORLD } from "@/lib/intlSitSearch";

export interface DestinationCountrySelectProps {
  value: string;
  onChange: (v: string) => void;
  /** Annonces ouvertes par pays étranger (moteur partagé). */
  counts: Array<{ code: string; name: string; count: number }>;
  className?: string;
  triggerClassName?: string;
}

export default function DestinationCountrySelect({ value, onChange, counts, className, triggerClassName }: DestinationCountrySelectProps) {
  const abroad = counts.reduce((n, c) => n + c.count, 0);
  const listed = new Set(counts.map((c) => c.code));
  const others = COUNTRIES.filter((c) => c.code !== "FR" && !listed.has(c.code));
  return (
    <div className={className}>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger aria-label="Pays de destination" className={triggerClassName}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="max-h-80">
          <SelectItem value="FR">France</SelectItem>
          {counts.map((c) => (
            <SelectItem key={c.code} value={c.code}>{c.name} ({c.count})</SelectItem>
          ))}
          <SelectSeparator />
          <SelectItem value={DEST_WORLD}>Tous les pays, France incluse</SelectItem>
          <SelectItem value={DEST_ABROAD}>Tous les pays hors France ({abroad})</SelectItem>
          {others.length > 0 && (
            <>
              <SelectSeparator />
              <SelectGroup>
                <SelectLabel>Autres pays (aucune annonce pour l'instant)</SelectLabel>
                {others.map((c) => (
                  <SelectItem key={c.code} value={c.code}>{c.name}</SelectItem>
                ))}
              </SelectGroup>
            </>
          )}
        </SelectContent>
      </Select>
    </div>
  );
}
