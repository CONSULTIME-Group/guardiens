import { MapPin, Search as SearchIcon, X } from "lucide-react";
import { CategoryFilter, FILTER_PILLS } from "./constants";

interface Props {
  postalCodeInput: string;
  setPostalCodeInput: (v: string) => void;
  onPostalCodeSearch: () => void;
  geocodingOrigin: boolean;
  radiusKm: number;
  setRadiusKm: (v: number) => void;
  competenceSearch: string;
  setCompetenceSearch: (v: string) => void;
  categoryFilter: CategoryFilter;
  setCategoryFilter: (v: CategoryFilter) => void;
}

const MissionsFilterBar = ({
  postalCodeInput,
  setPostalCodeInput,
  onPostalCodeSearch,
  geocodingOrigin,
  radiusKm,
  setRadiusKm,
  competenceSearch,
  setCompetenceSearch,
  categoryFilter,
  setCategoryFilter,
}: Props) => (
  <div className="space-y-3">
    <div className="flex flex-col sm:flex-row gap-3">
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <div className="relative min-w-0 w-[170px] shrink-0">
          <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            value={postalCodeInput}
            onChange={(e) => setPostalCodeInput(e.target.value)}
            onBlur={onPostalCodeSearch}
            onKeyDown={(e) => e.key === "Enter" && onPostalCodeSearch()}
            placeholder="Code postal"
            className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>
        <div className="flex items-center gap-2 flex-1 min-w-0 max-w-[300px]">
          <span className="text-xs font-medium text-muted-foreground whitespace-nowrap shrink-0">Rayon</span>
          <input
            type="range"
            min={1}
            max={100}
            step={1}
            value={radiusKm === 0 ? 100 : radiusKm}
            onChange={(e) => {
              const v = Number(e.target.value);
              setRadiusKm(v >= 100 ? 0 : v);
            }}
            aria-label="Rayon de recherche en kilomètres"
            className="flex-1 h-2 accent-[hsl(var(--primary))] cursor-pointer"
          />
          <span className="text-xs font-semibold text-foreground whitespace-nowrap min-w-[70px] text-right tabular-nums">
            {radiusKm === 0 ? "France entière" : `${radiusKm} km`}
          </span>
        </div>
        {geocodingOrigin && (
          <span className="text-xs text-muted-foreground animate-pulse">…</span>
        )}
      </div>

      <div className="relative flex-1 min-w-0 max-w-[300px]">
        <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          type="text"
          value={competenceSearch}
          onChange={(e) => setCompetenceSearch(e.target.value)}
          placeholder="Rechercher une compétence (ex: arroser jardin)"
          className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
        {competenceSearch && (
          <button
            onClick={() => setCompetenceSearch("")}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </div>

    <div className="-mx-4 px-4 overflow-x-auto sm:overflow-visible sm:mx-0 sm:px-0">
      <div className="flex sm:flex-wrap items-center gap-2 sm:justify-center w-max sm:w-auto">
        {FILTER_PILLS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setCategoryFilter(key)}
            className={`rounded-full border px-4 py-2 text-sm whitespace-nowrap transition-colors ${
              categoryFilter === key
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-muted text-foreground border-border hover:border-primary/40"
            }`}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  </div>
);

export default MissionsFilterBar;
