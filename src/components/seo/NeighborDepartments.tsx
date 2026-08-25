import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { neighborDeptNames } from "@/lib/deptLookup";

interface Props {
  /** Nom du département courant, par exemple « Haute-Savoie ». */
  department: string;
}

/**
 * Bloc de maillage horizontal : les départements limitrophes réellement
 * publiés. L'adjacence vient des frontières administratives officielles
 * (src/data/departmentAdjacency.ts), pas d'une approximation par distance.
 */
const NeighborDepartments = ({ department }: Props) => {
  const names = neighborDeptNames(department);

  const { data: pages = [] } = useQuery({
    queryKey: ["neighbor-departments", department],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("seo_department_pages" as any)
        .select("slug, department")
        .in("department", names)
        .eq("published", true)
        .order("department");
      if (error) throw error;
      return (data || []) as unknown as Array<{ slug: string; department: string }>;
    },
    enabled: names.length > 0,
  });

  if (pages.length === 0) return null;

  return (
    <section className="max-w-5xl mx-auto px-4 py-10 border-t border-border">
      <h2 className="font-heading text-2xl font-bold text-foreground mb-3">
        Les départements limitrophes
      </h2>
      <p className="text-sm text-muted-foreground mb-5">
        Beaucoup de gardes se jouent à quelques dizaines de kilomètres, parfois de l'autre côté
        d'une frontière départementale. Voici ce qui se passe juste à côté.
      </p>
      <ul className="grid grid-cols-2 md:grid-cols-4 gap-2">
        {pages.map((p) => (
          <li key={p.slug}>
            <Link to={`/departement/${p.slug}`} className="text-sm text-primary hover:underline">
              {p.department}
            </Link>
          </li>
        ))}
      </ul>
      <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-sm">
        <Link to="/departement" className="text-primary hover:underline">
          Index des départements
        </Link>
        <Link to="/house-sitting" className="text-primary hover:underline">
          Index des villes
        </Link>
        <Link to="/devenir-home-sitter" className="text-primary hover:underline">
          Devenir home-sitter
        </Link>
      </div>
    </section>
  );
};

export default NeighborDepartments;
