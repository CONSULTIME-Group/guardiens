import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import {
  PRO_CATEGORIES,
  getCategoryBySlug,
  getCategoryByValue,
  getProInitials,
} from "@/lib/proCategories";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

type ProRow = {
  id: string;
  slug: string;
  raison_sociale: string;
  category: string;
  city: string | null;
  logo_url: string | null;
  description: string | null;
  urgences_24_7: boolean;
};

const citySlugify = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

export default function ProCategoryListing() {
  const { catSlug, villeSlug } = useParams<{ catSlug: string; villeSlug?: string }>();
  const category = getCategoryBySlug(catSlug ?? "");
  const [pros, setPros] = useState<ProRow[]>([]);
  const [allCitiesForCat, setAllCitiesForCat] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!category) return;
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("pro_profiles")
        .select("id, slug, raison_sociale, category, city, logo_url, description, urgences_24_7")
        .eq("status", "approved")
        .eq("category", category.value as any)
        .order("created_at", { ascending: false });
      const rows = (data as any[]) ?? [];
      setPros(rows);
      const cities = Array.from(
        new Set(rows.map((r) => r.city).filter(Boolean) as string[])
      ).sort((a, b) => a.localeCompare(b, "fr"));
      setAllCitiesForCat(cities);
      setLoading(false);
    })();
  }, [category]);

  const cityLabel = useMemo(() => {
    if (!villeSlug) return null;
    return allCitiesForCat.find((c) => citySlugify(c) === villeSlug) ?? villeSlug;
  }, [villeSlug, allCitiesForCat]);

  const filtered = useMemo(() => {
    if (!villeSlug) return pros;
    return pros.filter((p) => p.city && citySlugify(p.city) === villeSlug);
  }, [pros, villeSlug]);

  if (!category) {
    return (
      <div className="container mx-auto px-4 py-20 max-w-2xl text-center min-w-0">
        <Helmet>
          <meta name="robots" content="noindex" />
        </Helmet>
        <h1 className="text-2xl font-bold mb-3">Catégorie inconnue</h1>
        <Button asChild>
          <Link to="/pros">Voir l'annuaire complet</Link>
        </Button>
      </div>
    );
  }

  const baseUrl = "https://guardiens.fr";
  const path = villeSlug
    ? `/pros/categorie/${category.slug}/${villeSlug}`
    : `/pros/categorie/${category.slug}`;
  const canonical = `${baseUrl}${path}`;

  const h1 = villeSlug
    ? `${category.label} à ${cityLabel}`
    : `${category.label} en France`;
  const metaTitle = villeSlug
    ? `${category.label} à ${cityLabel} : annuaire des pros animaliers`
    : `${category.label} : annuaire des pros animaliers`;
  const metaDesc = villeSlug
    ? `Trouvez un ${category.label.toLowerCase()} à ${cityLabel}. ${category.shortDesc}. Annuaire Guardiens.`
    : `Annuaire des ${category.label.toLowerCase()}s en France. ${category.shortDesc}.`;

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Accueil", item: `${baseUrl}/` },
      { "@type": "ListItem", position: 2, name: "Pros animaliers", item: `${baseUrl}/pros` },
      {
        "@type": "ListItem",
        position: 3,
        name: category.label,
        item: `${baseUrl}/pros/categorie/${category.slug}`,
      },
      ...(villeSlug
        ? [
            {
              "@type": "ListItem",
              position: 4,
              name: cityLabel ?? villeSlug,
              item: canonical,
            },
          ]
        : []),
    ],
  };

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>{metaTitle} | Guardiens</title>
        <meta name="description" content={metaDesc} />
        <link rel="canonical" href={canonical} />
        <meta property="og:title" content={metaTitle} />
        <meta property="og:url" content={canonical} />
        <meta property="og:type" content="website" />
        <script type="application/ld+json">{JSON.stringify(breadcrumbJsonLd)}</script>
      </Helmet>

      <main className="container mx-auto px-4 py-6 md:py-10 max-w-6xl min-w-0">
        <header className="mb-6 md:mb-10">
          <h1 className="text-2xl md:text-4xl font-display font-bold mb-2">{h1}</h1>
          <p className="text-lg text-muted-foreground max-w-2xl">{category.shortDesc}</p>
          <div className="mt-6 flex flex-wrap gap-2">
            <Button asChild>
              <Link to="/pros/inscription">Inscrire mon activité</Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/pros">Toutes les catégories</Link>
            </Button>
          </div>
        </header>

        {/* Filtres villes (silos enfants) */}
        {!villeSlug && allCitiesForCat.length > 1 && (
          <section className="mb-8">
            <h2 className="text-sm font-semibold mb-2 text-muted-foreground uppercase tracking-wider">
              Villes couvertes
            </h2>
            <div className="flex flex-wrap gap-2">
              {allCitiesForCat.map((c) => (
                <Link
                  key={c}
                  to={`/pros/categorie/${category.slug}/${citySlugify(c)}`}
                  className="inline-flex items-center px-3 py-1 rounded-full border border-border text-sm hover:bg-muted transition"
                >
                  {c}
                </Link>
              ))}
            </div>
          </section>
        )}

        {loading ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-48" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              Aucun pro inscrit dans cette catégorie{villeSlug ? ` à ${cityLabel}` : ""} pour le moment.
              <div className="mt-4">
                <Button asChild variant="outline">
                  <Link to="/pros/inscription">Être le premier</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((p) => {
              const cat = getCategoryByValue(p.category);
              return (
                <Link key={p.id} to={`/pros/${p.slug}`} className="group">
                  <Card className="h-full hover:shadow-md transition">
                    <CardContent className="p-5">
                      <div className="flex items-center gap-3 mb-3">
                        {p.logo_url ? (
                          <img
                            src={p.logo_url}
                            alt={`Logo ${p.raison_sociale}`}
                            className="w-14 h-14 rounded-lg object-contain bg-muted"
                          />
                        ) : (
                          <div
                            className={`w-14 h-14 rounded-lg flex items-center justify-center font-semibold text-lg ${cat?.placeholderClass ?? "bg-muted text-muted-foreground"}`}
                            aria-hidden="true"
                          >
                            {getProInitials(p.raison_sociale)}
                          </div>
                        )}
                        <div className="min-w-0">
                          <h2 className="font-semibold truncate group-hover:underline">
                            {p.raison_sociale}
                          </h2>
                          <p className="text-xs text-muted-foreground">
                            {cat?.label}
                            {p.city ? ` · ${p.city}` : ""}
                          </p>
                        </div>
                      </div>
                      {p.description && (
                        <p className="text-sm text-muted-foreground line-clamp-3">
                          {p.description}
                        </p>
                      )}
                      {p.urgences_24_7 && (
                        <Badge variant="secondary" className="mt-3">
                          Urgences 24/7
                        </Badge>
                      )}
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}

        {/* Maillage : autres catégories */}
        <section className="mt-12 pt-8 border-t">
          <h2 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wider">
            Autres catégories de pros
          </h2>
          <div className="flex flex-wrap gap-2">
            {PRO_CATEGORIES.filter((c) => c.value !== category.value).map((c) => (
              <Link
                key={c.value}
                to={`/pros/categorie/${c.slug}`}
                className="inline-flex items-center px-3 py-1 rounded-full border border-border text-sm hover:bg-muted transition"
              >
                {c.label}
              </Link>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
