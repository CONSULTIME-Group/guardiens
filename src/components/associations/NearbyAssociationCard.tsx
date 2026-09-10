import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { associationInitials, associationNeedLabel } from "@/lib/associationLabels";

type NearbyAssociation = {
  slug: string;
  name: string;
  logo_url: string | null;
  tagline: string | null;
  needs: string[] | null;
};

/**
 * Carte discrète des tableaux de bord gardien et propriétaire.
 * Elle cherche une association publiée dans le département du membre
 * (`profiles.departement_code`) et bascule sur un renvoi générique sinon.
 */
export function NearbyAssociationCard() {
  const { user } = useAuth();
  const [assoc, setAssoc] = useState<NearbyAssociation | null>(null);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (!user?.id) return;
      const { data: profile } = await supabase
        .from("profiles")
        .select("departement_code")
        .eq("id", user.id)
        .maybeSingle();
      const code = (profile as { departement_code?: string | null } | null)?.departement_code;
      if (!code) return;
      const { data } = await supabase
        .from("public_animal_associations" as any)
        .select("slug, name, logo_url, tagline, needs")
        .eq("departement_code", code)
        .order("name")
        .limit(1);
      const row = ((data as any[]) ?? [])[0] as NearbyAssociation | undefined;
      if (!cancelled && row) setAssoc(row);
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  const firstNeed = assoc?.needs?.[0];

  return (
    <section
      aria-labelledby="nearby-association-title"
      className="rounded-2xl border border-border bg-card p-4"
    >
      <h2 id="nearby-association-title" className="text-sm font-semibold text-foreground">
        Une association près de chez vous
      </h2>

      {assoc ? (
        <div className="mt-3 flex items-start gap-3">
          {assoc.logo_url ? (
            <img
              src={assoc.logo_url}
              alt={`Logo de ${assoc.name}`}
              width={44}
              height={44}
              loading="lazy"
              decoding="async"
              className="h-11 w-11 shrink-0 rounded-lg object-contain bg-muted/40"
            />
          ) : (
            <span
              aria-hidden="true"
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-muted text-xs font-semibold text-muted-foreground"
            >
              {associationInitials(assoc.name)}
            </span>
          )}
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-foreground">{assoc.name}</p>
            {assoc.tagline && (
              <p className="mt-0.5 text-xs text-muted-foreground">{assoc.tagline}</p>
            )}
            {firstNeed && (
              <p className="mt-1 inline-flex rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
                {associationNeedLabel(firstNeed)}
              </p>
            )}
            <Link
              to={`/associations/${assoc.slug}`}
              className="mt-2 block text-xs font-medium text-primary underline-offset-4 hover:underline"
            >
              Découvrir l'association
            </Link>
          </div>
        </div>
      ) : (
        <>
          <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
            Des associations de protection animale cherchent des bénévoles, des dons et des
            familles d'accueil.
          </p>
          <Link
            to="/associations"
            className="mt-3 inline-block text-xs font-medium text-primary underline-offset-4 hover:underline"
          >
            Voir les associations
          </Link>
        </>
      )}
    </section>
  );
}
