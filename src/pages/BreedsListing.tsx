import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { slugify } from "@/lib/normalize";

interface Breed {
  species: string;
  breed: string;
}

const CANONICAL = "https://guardiens.fr/races";

const BreedsListing = () => {
  const { t, i18n } = useTranslation();
  const [breeds, setBreeds] = useState<Breed[]>([]);

  useEffect(() => {
    supabase
      .from("breed_profiles")
      .select("species, breed")
      .order("species")
      .order("breed")
      .then(({ data }) => setBreeds((data as Breed[]) || []));
  }, []);

  const grouped = breeds.reduce<Record<string, Breed[]>>((acc, b) => {
    (acc[b.species] ||= []).push(b);
    return acc;
  }, {});

  const TITLE = t("breeds_listing.meta_title");
  const DESCRIPTION = t("breeds_listing.meta_description");

  const itemListElement = breeds.slice(0, 60).map((b, i) => {
    const slug = `${b.species.toLowerCase()}-${slugify(b.breed)}`;
    return {
      "@type": "ListItem",
      position: i + 1,
      url: `https://guardiens.fr/races/${slug}`,
      name: b.breed,
    };
  });

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: TITLE,
    description: DESCRIPTION,
    url: CANONICAL,
    inLanguage: i18n.language,
    mainEntity: {
      "@type": "ItemList",
      name: "Fiches de race d'animaux",
      numberOfItems: itemListElement.length,
      itemListOrder: "https://schema.org/ItemListOrderAscending",
      itemListElement,
    },
  };

  return (
    <>
      <Helmet>
        <title>{TITLE}</title>
        <meta name="description" content={DESCRIPTION} />
        <link rel="canonical" href={CANONICAL} />
        <meta property="og:title" content={TITLE} />
        <meta property="og:description" content={DESCRIPTION} />
        <meta property="og:url" content={CANONICAL} />
        <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
      </Helmet>

      <main className="min-w-0 max-w-5xl mx-auto px-4 py-12">
        <header className="mb-10">
          <h1 className="font-serif text-3xl md:text-4xl font-bold text-foreground mb-3">
            {t("breeds_listing.h1")}
          </h1>
          <p className="text-muted-foreground text-lg max-w-2xl">
            {t("breeds_listing.subtitle")}
          </p>
        </header>

        {Object.entries(grouped).map(([species, list]) => (
          <section key={species} className="mb-10">
            <h2 className="font-serif text-2xl font-semibold text-foreground mb-4">
              {t(`breeds_listing.species.${species}`, { defaultValue: species })}
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {list.map((b) => {
                const slug = `${b.species.toLowerCase()}-${slugify(b.breed)}`;
                return (
                  <Link
                    key={slug}
                    to={`/races/${slug}`}
                    className="block px-4 py-3 rounded-lg border border-border hover:border-primary hover:bg-primary/5 transition"
                  >
                    <span className="capitalize text-foreground font-medium">{b.breed}</span>
                  </Link>
                );
              })}
            </div>
          </section>
        ))}
      </main>
    </>
  );
};

export default BreedsListing;
