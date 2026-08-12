import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import PageMeta from "@/components/PageMeta";
import PageBreadcrumb from "@/components/seo/PageBreadcrumb";
import { Skeleton } from "@/components/ui/skeleton";
import { deptCodeFromName } from "@/lib/deptLookup";

const SITE = "https://guardiens.fr";

interface DeptRow {
  slug: string;
  department: string;
}

/**
 * Index `/departement` : porte d'entrée des 101 pages départements, jusqu'ici
 * découvrables uniquement via le sitemap.
 */
const DepartmentsIndex = () => {
  const { data: depts = [], isLoading } = useQuery({
    queryKey: ["departments-index"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("seo_department_pages" as any)
        .select("slug, department")
        .eq("published", true)
        .order("department");
      if (error) throw error;
      return (data || []) as unknown as DeptRow[];
    },
  });

  const grouped = useMemo(() => {
    const map = new Map<string, DeptRow[]>();
    for (const d of depts) {
      const letter = (d.department || "?")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .charAt(0)
        .toUpperCase();
      const list = map.get(letter) || [];
      list.push(d);
      map.set(letter, list);
    }
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0], "fr"));
  }, [depts]);

  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Accueil", item: SITE },
        { "@type": "ListItem", position: 2, name: "Départements", item: `${SITE}/departement` },
      ],
    },
    {
      "@context": "https://schema.org",
      "@type": "ItemList",
      name: "Départements couverts par Guardiens",
      numberOfItems: depts.length,
      itemListElement: depts.map((d, i) => ({
        "@type": "ListItem",
        position: i + 1,
        name: `Garde d'animaux, de maison et de jardin en ${d.department}`,
        url: `${SITE}/departement/${d.slug}`,
      })),
    },
  ];

  return (
    <>
      <PageMeta
        title="Garde d'animaux, de maison et de jardin par département | Guardiens"
        description="Les 101 départements français couverts par Guardiens. Trouvez un gardien pour votre maison, vos animaux et votre jardin dans votre département, ou proposez vos services près de chez vous."
        path="/departement"
        jsonLd={jsonLd}
      />

      <div className="min-h-screen bg-background">
        <PageBreadcrumb items={[{ label: "Départements" }]} />

        <section className="max-w-5xl mx-auto px-4 py-10 md:py-14">
          <h1 className="font-serif text-3xl md:text-5xl font-bold text-foreground mb-5">
            La garde d'animaux département par département
          </h1>
          <p className="text-lg text-muted-foreground max-w-3xl leading-relaxed">
            Guardiens fonctionne partout en France, du littoral aux zones de montagne. Chaque page
            département recense les villes couvertes, les gardiens inscrits et les guides locaux
            rédigés à partir de gardes réelles. Choisissez le vôtre pour voir ce qui s'y passe.
          </p>
          <div className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-sm">
            <Link to="/house-sitting" className="text-primary hover:underline">
              Voir l'index des villes
            </Link>
            <Link to="/guides" className="text-primary hover:underline">
              Tous les guides locaux
            </Link>
            <Link to="/devenir-home-sitter" className="text-primary hover:underline">
              Devenir home-sitter
            </Link>
          </div>
        </section>

        <section className="max-w-5xl mx-auto px-4 pb-16">
          {isLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-8 w-1/4" />
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
            </div>
          ) : (
            <div className="space-y-8">
              {grouped.map(([letter, list]) => (
                <div key={letter} className="border-t border-border pt-6">
                  <h2 className="font-serif text-xl font-bold text-foreground mb-3">{letter}</h2>
                  <ul className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {list.map((d) => {
                      const code = deptCodeFromName(d.department);
                      return (
                        <li key={d.slug}>
                          <Link
                            to={`/departement/${d.slug}`}
                            className="text-sm text-primary hover:underline"
                          >
                            {d.department}
                            {code ? ` (${code})` : ""}
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </>
  );
};

export default DepartmentsIndex;
