import { SlidersHorizontal } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";

export type HousingFilter = "all" | "house" | "apartment" | "farm";
export type ExperienceFilter = "all" | "1" | "3";

interface EnvOption {
  key: string;
  label: string;
}

interface AdvancedFiltersSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pillClass: string;
  hasActiveFilters: boolean;
  resetFilters: () => void;
  housingTypes: HousingFilter[];
  toggleHousingType: (t: HousingFilter) => void;
  envOptions: EnvOption[];
  environments: string[];
  toggleEnv: (key: string) => void;
  verifiedOnly: boolean;
  setVerifiedOnly: (v: boolean) => void;
  withPhotosOnly: boolean;
  setWithPhotosOnly: (v: boolean) => void;
  minExperience: ExperienceFilter;
  setMinExperience: (v: ExperienceFilter) => void;
  onApply: () => void;
  currentResultsCount?: number;
  loading?: boolean;
}

export const AdvancedFiltersSheet = ({
  open,
  onOpenChange,
  pillClass,
  hasActiveFilters,
  resetFilters,
  housingTypes,
  toggleHousingType,
  envOptions,
  environments,
  toggleEnv,
  verifiedOnly,
  setVerifiedOnly,
  withPhotosOnly,
  setWithPhotosOnly,
  minExperience,
  setMinExperience,
  onApply,
  currentResultsCount,
  loading,
}: AdvancedFiltersSheetProps) => {
  const countLabel = loading
    ? "Recherche…"
    : typeof currentResultsCount === "number"
      ? `Voir ${currentResultsCount} résultat${currentResultsCount > 1 ? "s" : ""}`
      : "Appliquer les filtres";
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetTrigger asChild>
        <button className={`${pillClass} relative`}>
          <SlidersHorizontal className="h-4 w-4" />
          <span className="text-foreground">Filtres</span>
          {hasActiveFilters && (
            <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-primary" />
          )}
        </button>
      </SheetTrigger>
      <SheetContent side="right" className="w-[88vw] sm:w-80 max-w-sm overflow-y-auto">
        <SheetTitle className="sr-only">Filtres de recherche</SheetTitle>
        <SheetDescription className="sr-only">Affinez votre recherche avec les filtres ci-dessous.</SheetDescription>
        <div className="flex items-center justify-between mb-6 mt-2">
          <h3 className="font-heading font-semibold text-lg text-foreground">Filtres</h3>
          <button onClick={resetFilters} className="text-sm text-primary hover:underline">Réinitialiser</button>
        </div>
        <div className="space-y-6">
          {/* Housing type */}
          <div>
            <label className="text-sm font-medium text-foreground mb-2 block">Type de logement</label>
            <div className="flex flex-wrap gap-2">
              {([
                { key: "house" as HousingFilter, label: "Maison" },
                { key: "apartment" as HousingFilter, label: "Appartement" },
                { key: "farm" as HousingFilter, label: "Ferme" },
              ]).map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => toggleHousingType(key)}
                  className={`rounded-full px-3 py-1.5 text-xs transition-colors ${
                    housingTypes.includes(key)
                      ? "bg-primary text-primary-foreground"
                      : "border border-border text-muted-foreground hover:border-primary"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Environment */}
          <div>
            <label className="text-sm font-medium text-foreground mb-2 block">Environnement</label>
            <div className="flex flex-wrap gap-2">
              {envOptions.map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => toggleEnv(key)}
                  className={`rounded-full px-3 py-1.5 text-xs transition-colors ${
                    environments.includes(key)
                      ? "bg-primary text-primary-foreground"
                      : "border border-border text-muted-foreground hover:border-primary"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Verified toggle */}
          <div>
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm text-foreground block">Propriétaire avec ID vérifiée</label>
                <span className="text-xs text-muted-foreground">Afficher uniquement les annonces de proprios dont l'identité a été vérifiée</span>
              </div>
              <Switch checked={verifiedOnly} onCheckedChange={setVerifiedOnly} />
            </div>
          </div>

          {/* With photos toggle */}
          <div className="flex items-center justify-between">
            <label className="text-sm text-foreground">Annonces avec photos</label>
            <Switch checked={withPhotosOnly} onCheckedChange={setWithPhotosOnly} />
          </div>

          {/* Min experience */}
          <div>
            <label className="text-sm font-medium text-foreground mb-2 block">Expérience du propriétaire</label>
            <div className="flex flex-wrap gap-2">
              {([
                { key: "all" as ExperienceFilter, label: "Tous" },
                { key: "1" as ExperienceFilter, label: "1 garde+" },
                { key: "3" as ExperienceFilter, label: "3 gardes+" },
              ]).map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setMinExperience(key)}
                  className={`rounded-full px-3 py-1.5 text-xs transition-colors ${
                    minExperience === key
                      ? "bg-primary text-primary-foreground"
                      : "border border-border text-muted-foreground hover:border-primary"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Apply button */}
          <Button className="w-full bg-primary text-primary-foreground py-3 rounded-xl font-medium" onClick={onApply} disabled={loading}>
            {countLabel}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
};
