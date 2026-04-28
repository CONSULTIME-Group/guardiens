/**
 * Cartes "quick facts" : Dates, Logement, Animaux, Cadre.
 * Chaque carte ne s'affiche que si la donnée existe.
 * Aucune icône Lucide décorative — texte pur (mem://constraints/no-icons-in-content).
 */
import { formatDate, getEnvMeta } from "./sitMeta";

interface SitQuickFactsProps {
  sit: any;
  property: any;
  petsCount: number;
  speciesSummary: string;
  environments: string[];
  durationDays: number | null;
}

const Card = ({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) => (
  <div className="rounded-2xl border border-border bg-card p-4">
    <p className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1.5">
      {label}
    </p>
    {children}
  </div>
);

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
      <Card key="dates" label="Dates">
        {sit?.start_date && (
          <p className="text-sm font-medium leading-tight">{formatDate(sit.start_date)}</p>
        )}
        {sit?.end_date && (
          <p className="text-sm font-medium leading-tight">→ {formatDate(sit.end_date)}</p>
        )}
        {durationDays && (
          <p className="text-xs text-muted-foreground mt-1">{durationDays} jours</p>
        )}
      </Card>,
    );
  }

  if (property?.type || property?.surface_m2 || property?.rooms_count) {
    cards.push(
      <Card key="housing" label="Logement">
        {property?.type && (
          <p className="text-sm font-medium leading-tight capitalize">
            {property.type === "house"
              ? "Maison"
              : property.type === "apartment"
                ? "Appartement"
                : property.type}
          </p>
        )}
        {(property?.surface_m2 || property?.rooms_count) && (
          <p className="text-xs text-muted-foreground mt-1">
            {[
              property?.surface_m2 && `${property.surface_m2} m²`,
              property?.rooms_count && `${property.rooms_count} pièces`,
            ]
              .filter(Boolean)
              .join(" · ")}
          </p>
        )}
      </Card>,
    );
  }

  if (petsCount > 0) {
    cards.push(
      <Card key="pets" label="Animaux">
        <p className="text-sm font-medium leading-tight">
          {petsCount} pensionnaire{petsCount > 1 ? "s" : ""}
        </p>
        {speciesSummary && (
          <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{speciesSummary}</p>
        )}
      </Card>,
    );
  }

  if (environments.length > 0) {
    cards.push(
      <Card key="frame" label="Cadre">
        <div className="flex flex-wrap gap-1 mt-0.5">
          {environments.map((e) => {
            const meta = getEnvMeta(e);
            return (
              <span
                key={e}
                className="inline-flex items-center text-[11px] bg-muted rounded-full px-2 py-0.5 font-medium"
              >
                {meta.label}
              </span>
            );
          })}
        </div>
      </Card>,
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
