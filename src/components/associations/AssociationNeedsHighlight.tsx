import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { associationInitials, associationNeedChipLabel } from "@/lib/associationLabels";
import type { PublicAssociation } from "@/components/associations/types";

const ELIGIBLE_NEEDS = ["benevoles", "familles_accueil"] as const;
const MAX_ENTRIES = 8;

interface AssociationNeedsHighlightProps {
  associations: PublicAssociation[];
}

/**
 * Bloc « Ce que les associations cherchent en ce moment ».
 *
 * Rassemble les appels à bénévoles et aux familles d'accueil des fiches
 * vérifiées récemment. Une seule entrée par association, huit au maximum.
 */
export const AssociationNeedsHighlight = ({ associations }: AssociationNeedsHighlightProps) => {
  const entries = useMemo(() => {
    const eligible: { association: PublicAssociation; need: string; detail: string | null }[] = [];

    for (const association of associations) {
      const details = association.needs_details ?? [];
      const matched = details.find((d) => ELIGIBLE_NEEDS.includes(d.need as (typeof ELIGIBLE_NEEDS)[number]));
      if (!matched) continue;
      eligible.push({ association, need: matched.need, detail: matched.detail ?? null });
    }

    return eligible
      .sort((a, b) => {
        const dateA = new Date(a.association.verified_at ?? 0).getTime();
        const dateB = new Date(b.association.verified_at ?? 0).getTime();
        return dateB - dateA;
      })
      .slice(0, MAX_ENTRIES);
  }, [associations]);

  if (entries.length === 0) return null;

  return (
    <section className="mb-10">
      <div className="flex items-center gap-2">
        <span aria-hidden="true" className="inline-block h-[2px] w-5 bg-terra" />
        <p className="text-[11px] font-bold uppercase text-terra [letter-spacing:.16em]">
          Elles cherchent de l'aide
        </p>
      </div>
      <h2 className="mt-2 font-heading text-lg md:text-xl font-semibold text-foreground">
        Ce que les associations cherchent en ce moment
      </h2>

      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {entries.map(({ association, need, detail }) => (
          <AssociationNeedCard key={association.id} association={association} need={need} detail={detail} />
        ))}
      </div>
    </section>
  );
};

const AssociationNeedCard = ({
  association,
  need,
  detail,
}: {
  association: PublicAssociation;
  need: string;
  detail: string | null;
}) => {
  const [logoFailed, setLogoFailed] = useState(false);
  const chip = associationNeedChipLabel(need);

  return (
    <Link to={`/associations/${association.slug}`} className="block group">
      <Card className="h-full transition-shadow group-hover:shadow-md">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted">
              {association.logo_url && !logoFailed ? (
                <img
                  src={association.logo_url}
                  alt={`Logo de ${association.name}`}
                  width={40}
                  height={40}
                  loading="lazy"
                  decoding="async"
                  referrerPolicy="no-referrer"
                  onError={() => setLogoFailed(true)}
                  className="h-full w-full object-contain"
                />
              ) : (
                <span className="text-[11px] font-semibold text-muted-foreground">
                  {associationInitials(association.name)}
                </span>
              )}
            </span>
            <div className="min-w-0">
              <h3 className="font-heading text-base font-semibold text-foreground leading-tight">
                {association.name}
              </h3>
              <p className="text-xs text-muted-foreground">
                {association.city}, {association.departement_name}
              </p>
            </div>
          </div>

          {chip && (
            <p className="mt-3 inline-flex rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground">
              {chip}
            </p>
          )}

          {detail && (
            <p className="mt-2 text-sm text-muted-foreground line-clamp-2">{detail}</p>
          )}
        </CardContent>
      </Card>
    </Link>
  );
};

export default AssociationNeedsHighlight;
