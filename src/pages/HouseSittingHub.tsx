import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import PageMeta from "@/components/PageMeta";
import PageBreadcrumb from "@/components/seo/PageBreadcrumb";
import { Skeleton } from "@/components/ui/skeleton";
import { CITIES } from "@/data/cities";

const SITE = "https://guardiens.fr";

interface CityRow {
  city: string;
  slug: string;
  department: string;
}

/**
 * Hub `/house-sitting` : point d'entrée unique des 56 pages villes du silo
 * house-sitting, groupées par département. Auparavant cette racine renvoyait
 * une 404, ce qui laissait les pages villes sans parent dans l'arborescence.
 */
const HouseSittingHub = () => {
  const { data: dbCities = [], isLoading } = useQuery({
    queryKey: ["house-sitting-hub-cities"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("seo_city_pages" as any)
        .select("city, slug, department")
        .eq("published", true)
        // Pages de test/QA: accessibles en direct par leur URL, jamais listées.
        .not("slug", "like", "test-%")
        .order("city");
      if (error) throw error;
      return (data || []) as unknown as CityRow[];
    },
  });

  const grouped = useMemo(() => {
    const map = new Map<string, CityRow[]>();
    const push = (row: CityRow) => {
      const dept = row.department || "Autres";
      const list = map.get(dept) || [];
      if (!list.some((c) => c.slug === row.slug)) list.push(row);
      map.set(dept, list);
    };
    for (const c of CITIES) push({ city: c.name, slug: c.slug, department: c.department });
    for (const c of dbCities) push(c);
    return Array.from(map.entries())
      .map(([dept, cities]) => [dept, cities.sort((a, b) => a.city.localeCompare(b.city, "fr"))] as const)
      .sort((a, b) => a[0].localeCompare(b[0], "fr"));
  }, [dbCities]);

  const total = grouped.reduce((n, [, cities]) => n + cities.length, 0);

  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Accueil", item: SITE },
        { "@type": "ListItem", position: 2, name: "House-sitting", item: `${SITE}/house-sitting` },
      ],
    },
    {
      "@context": "https://schema.org",
      "@type": "ItemList",
      name: "Villes couvertes par Guardiens",
      numberOfItems: total,
      itemListElement: grouped
        .flatMap(([, cities]) => cities)
        .map((c, i) => ({
          "@type": "ListItem",
          position: i + 1,
          name: `House-sitting ${c.city}`,
          url: `${SITE}/house-sitting/${c.slug}`,
        })),
    },
  ];

  return (
    <>
      <PageMeta
        title="House-sitting en France : toutes les villes couvertes | Guardiens"
        description="Toutes les villes où Guardiens met en relation propriétaires et gardiens de maison et d'animaux. Choisissez votre ville et découvrez les gardes disponibles près de chez vous."
        path="/house-sitting"
        jsonLd={jsonLd}
      />

      <div className="min-h-screen bg-background">
        <PageBreadcrumb items={[{ label: "House-sitting" }]} />

        <section className="max-w-5xl mx-auto px-4 py-10 md:py-14">
          <h1 className="font-serif text-3xl md:text-5xl font-bold text-foreground mb-5">
            House-sitting en France, ville par ville
          </h1>
          <p className="text-lg text-muted-foreground max-w-3xl leading-relaxed">
            Le house-sitting, c'est confier sa maison et ses animaux à une personne de confiance
            qui s'installe chez vous pendant votre absence. Vos animaux restent dans leur
            environnement, votre logement reste habité. Guardiens couvre la France entière :
            choisissez votre ville pour voir comment cela se passe près de chez vous, qui sont les
            gardiens inscrits et quelles gardes sont ouvertes.
          </p>
          <div className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-sm">
            <Link to="/departement" className="text-primary hover:underline">
              Voir l'index des départements
            </Link>
            <Link to="/annonces" className="text-primary hover:underline">
              Toutes les annonces de garde
            </Link>
            <Link to="/devenir-home-sitter" className="text-primary hover:underline">
              Devenir home-sitter
            </Link>
          </div>
        </section>

        <section className="max-w-5xl mx-auto px-4 pb-16">
          {isLoading && grouped.length === 0 ? (
            <div className="space-y-4">
              <Skeleton className="h-8 w-1/3" />
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
            </div>
          ) : (
            <div className="space-y-8">
              {grouped.map(([dept, cities]) => (
                <div key={dept} className="border-t border-border pt-6">
                  <h2 className="font-serif text-xl font-bold text-foreground mb-3">{dept}</h2>
                  <ul className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {cities.map((c) => (
                      <li key={c.slug}>
                        <Link
                          to={`/house-sitting/${c.slug}`}
                          className="text-sm text-primary hover:underline"
                        >
                          House-sitting {c.city}
                        </Link>
                      </li>
                    ))}
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

export default HouseSittingHub;
