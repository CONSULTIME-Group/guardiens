import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import PageMeta from "@/components/PageMeta";
import { supabase } from "@/integrations/supabase/client";
import { slugify } from "@/lib/normalize";

interface Breed {
  species: string;
  breed: string;
}

const CANONICAL = "https://guardiens.fr/races";

const BreedsListing = () => {
  const { t } = useTranslation();
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

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Accueil", item: "https://guardiens.fr/" },
      { "@type": "ListItem", position: 2, name: "Fiches de race", item: CANONICAL },
    ],
  };

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: TITLE,
    description: DESCRIPTION,
    url: CANONICAL,
    inLanguage: "fr",
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
      <PageMeta
        title={TITLE}
        description={DESCRIPTION}
        path="/races"
        canonical={CANONICAL}
        jsonLd={[jsonLd, breadcrumbJsonLd]}
        ready={breeds.length > 0}
      />

      <div className="min-w-0 max-w-5xl mx-auto px-4 py-8 md:py-12">
        <header className="mb-6 md:mb-10">
          <h1 className="font-serif text-2xl md:text-4xl font-bold text-foreground mb-3">
            {t("breeds_listing.h1")}
          </h1>
          <p className="text-muted-foreground text-lg max-w-2xl">
            {t("breeds_listing.subtitle")}
          </p>
        </header>

        {Object.entries(grouped).map(([species, list]) => (
          <section key={species} className="mb-6 md:mb-10">
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
      </div>
    </>
  );
};

export default BreedsListing;
