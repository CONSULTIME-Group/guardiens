/**
 * Cartes "quick facts" : Dates, Logement, Animaux, Cadre.
 * Mobile-first 2026 : dates sur une ligne avec durée mise en valeur,
 * texte hiérarchisé, cibles tactiles généreuses.
 */
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { getEnvMeta } from "./sitMeta";

interface SitQuickFactsProps {
  sit: any;
  property: any;
  petsCount: number;
  speciesSummary: string;
  environments: string[];
  durationDays: number | null;
}

const fmtShort = (d: string) => format(new Date(d), "d MMM yyyy", { locale: fr });

const Card = ({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) => (
  <div className="rounded-2xl border border-border bg-card px-4 py-3.5 min-h-[72px] flex flex-col justify-center">
    <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
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
    const sameLine =
      sit?.start_date && sit?.end_date
        ? `${fmtShort(sit.start_date)} → ${fmtShort(sit.end_date)}`
        : sit?.start_date
          ? `À partir du ${fmtShort(sit.start_date)}`
          : sit?.end_date
            ? `Jusqu'au ${fmtShort(sit.end_date)}`
            : null;

    cards.push(
      <Card key="dates" label="Dates">
        {sameLine && (
          <p className="text-sm font-semibold text-foreground leading-snug">{sameLine}</p>
        )}
        {durationDays && (
          <p className="text-xs font-medium text-primary mt-0.5">
            {durationDays} {durationDays === 1 ? "jour" : "jours"}
          </p>
        )}
      </Card>,
    );
  }

  if (property?.type || property?.surface_m2 || property?.rooms_count) {
    cards.push(
      <Card key="housing" label="Logement">
        {property?.type && (
          <p className="text-sm font-semibold text-foreground leading-snug capitalize">
            {property.type === "house"
              ? "Maison"
              : property.type === "apartment"
                ? "Appartement"
                : property.type}
          </p>
        )}
        {(property?.surface_m2 || property?.rooms_count) && (
          <p className="text-xs text-muted-foreground mt-0.5">
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
        <p className="text-sm font-semibold text-foreground leading-snug">
          {petsCount} pensionnaire{petsCount > 1 ? "s" : ""}
        </p>
        {speciesSummary && (
          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{speciesSummary}</p>
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
