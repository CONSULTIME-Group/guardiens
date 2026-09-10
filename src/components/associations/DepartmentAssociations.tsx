import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { associationSpeciesLabel, associationTypeLabel } from "@/lib/associationLabels";
import { PUBLIC_ASSOCIATION_COLUMNS, type PublicAssociation } from "@/components/associations/types";

/**
 * Bloc de maillage : associations publiées du département.
 * Rendu uniquement quand au moins une fiche existe.
 */
const DepartmentAssociations = ({ departementCode }: { departementCode?: string | null }) => {
  const { data = [] } = useQuery<PublicAssociation[]>({
    queryKey: ["department-associations", departementCode],
    enabled: !!departementCode,
    staleTime: 10 * 60 * 1000,
    queryFn: async () => {
      const { data } = await supabase
        .from("public_animal_associations" as any)
        .select(PUBLIC_ASSOCIATION_COLUMNS)
        .eq("departement_code", departementCode!)
        .order("name");
      return ((data as any) ?? []) as PublicAssociation[];
    },
  });

  if (!departementCode || data.length === 0) return null;

  return (
    <section className="max-w-5xl mx-auto px-4 py-8 border-t border-border">
      <h2 className="font-heading text-xl font-semibold text-foreground mb-4">
        Associations de protection animale
      </h2>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {data.map((a) => (
          <Link key={a.id} to={`/associations/${a.slug}`} className="block group">
            <Card className="h-full transition-shadow group-hover:shadow-md">
              <CardContent className="p-4">
                <p className="font-semibold text-sm text-foreground">{a.name}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {associationTypeLabel(a.association_type)} · {a.city}
                </p>
                {a.species.length > 0 && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {a.species.map((s) => associationSpeciesLabel(s)).join(", ")}
                  </p>
                )}
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
      <Link to="/associations" className="mt-4 inline-block text-sm text-primary hover:underline">
        Toutes les associations →
      </Link>
    </section>
  );
};

export default DepartmentAssociations;
