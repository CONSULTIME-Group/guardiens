/**
 * Cartes "quick facts" : Dates, Logement, Animaux, Cadre.
 * Chaque carte ne s'affiche que si la donnée existe.
 */
import { Calendar, Home, PawPrint, Trees } from "lucide-react";
import { formatDate, getEnvMeta } from "./sitMeta";

interface SitQuickFactsProps {
  sit: any;
  property: any;
  petsCount: number;
  speciesSummary: string;
  environments: string[];
  durationDays: number | null;
}

const SitQuickFacts = ({
  sit,
  property,
  petsCount,
  speciesSummary,
  environments,
  durationDays,
}: SitQuickFactsProps) => {
  const cards: React.ReactNode[] = [];

  if (sit?.start_date || sit?.end_date) {
    cards.push(
      <div key="dates" className="rounded-2xl border border-border bg-card p-4">
        <Calendar className="h-5 w-5 text-primary mb-2" />
        <p className="text-xs text-muted-foreground">Dates</p>
        {sit?.start_date && <p className="text-sm font-medium">{formatDate(sit.start_date)}</p>}
        {sit?.end_date && <p className="text-sm font-medium">→ {formatDate(sit.end_date)}</p>}
        {durationDays && (
          <p className="text-xs text-muted-foreground mt-1">{durationDays} jours</p>
        )}
      </div>,
    );
  }

  if (property?.type || property?.surface_m2 || property?.rooms_count) {
    cards.push(
      <div key="housing" className="rounded-2xl border border-border bg-card p-4">
        <Home className="h-5 w-5 text-primary mb-2" />
        <p className="text-xs text-muted-foreground">Logement</p>
        {property?.type && (
          <p className="text-sm font-medium capitalize">
            {property.type === "house"
              ? "Maison"
              : property.type === "apartment"
                ? "Appartement"
                : property.type}
          </p>
        )}
        {(property?.surface_m2 || property?.rooms_count) && (
          <p className="text-xs text-muted-foreground">
            {[
              property?.surface_m2 && `${property.surface_m2} m²`,
              property?.rooms_count && `${property.rooms_count} pièces`,
            ]
              .filter(Boolean)
              .join(" · ")}
          </p>
        )}
      </div>,
    );
  }

  if (petsCount > 0) {
    cards.push(
      <div key="pets" className="rounded-2xl border border-border bg-card p-4">
        <PawPrint className="h-5 w-5 text-primary mb-2" />
        <p className="text-xs text-muted-foreground">Animaux</p>
        <p className="text-sm font-medium">
          {petsCount} pensionnaire{petsCount > 1 ? "s" : ""}
        </p>
        {speciesSummary && <p className="text-xs text-muted-foreground">{speciesSummary}</p>}
      </div>,
    );
  }

  if (environments.length > 0) {
    cards.push(
      <div key="frame" className="rounded-2xl border border-border bg-card p-4">
        <Trees className="h-5 w-5 text-primary mb-2" />
        <p className="text-xs text-muted-foreground">Cadre</p>
        <div className="flex flex-wrap gap-1 mt-1">
          {environments.map((e) => {
            const meta = getEnvMeta(e);
            const Ico = meta.icon;
            return (
              <span
                key={e}
                className="inline-flex items-center gap-1 text-xs bg-muted rounded-full px-2 py-0.5"
              >
                <Ico className="h-3 w-3" /> {meta.label}
              </span>
            );
          })}
        </div>
      </div>,
    );
  }

  if (cards.length === 0) return null;

  const cols =
    cards.length === 1
      ? "grid-cols-1"
      : cards.length === 2
        ? "grid-cols-2"
        : cards.length === 3
          ? "grid-cols-2 md:grid-cols-3"
          : "grid-cols-2 md:grid-cols-4";

  return <div className={`grid ${cols} gap-3 mb-6`}>{cards}</div>;
};

export default SitQuickFacts;
