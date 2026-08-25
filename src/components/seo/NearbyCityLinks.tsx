import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { departmentIn } from "@/lib/departmentGrammar";

interface Props {
  /** Nom du département de la ville courante. */
  department: string;
  /** Slug de la ville courante, exclu de la liste. */
  currentSlug: string;
}

/**
 * Villes voisines publiées du même département. Complète LocalNetworkGrid,
 * qui ne connaît que les villes statiques du fichier src/data/cities.ts.
 */
const NearbyCityLinks = ({ department, currentSlug }: Props) => {
  const { data: cities = [] } = useQuery({
    queryKey: ["nearby-city-links", department, currentSlug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("seo_city_pages" as any)
        .select("city, slug")
        .eq("department", department)
        .eq("published", true)
        .not("slug", "like", "test-%")
        .neq("slug", currentSlug)
        .order("city")
        .limit(12);
      if (error) throw error;
      return (data || []) as unknown as Array<{ city: string; slug: string }>;
    },
    enabled: !!department,
  });

  if (cities.length === 0) return null;

  return (
    <section className="max-w-5xl mx-auto px-4 py-10 border-t border-border">
      <h2 className="font-heading text-2xl font-bold text-foreground mb-5">
        Autres villes couvertes {departmentIn(department)}
      </h2>
      <ul className="grid grid-cols-2 md:grid-cols-4 gap-2">
        {cities.map((c) => (
          <li key={c.slug}>
            <Link to={`/house-sitting/${c.slug}`} className="text-sm text-primary hover:underline">
              House-sitting {c.city}
            </Link>
          </li>
        ))}
      </ul>
      <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-sm">
        <Link to="/house-sitting" className="text-primary hover:underline">
          Index des villes
        </Link>
        <Link to="/departement" className="text-primary hover:underline">
          Index des départements
        </Link>
        <Link to="/devenir-home-sitter" className="text-primary hover:underline">
          Devenir home-sitter
        </Link>
      </div>
    </section>
  );
};

export default NearbyCityLinks;
