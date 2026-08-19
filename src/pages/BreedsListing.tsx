import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import PageMeta from "@/components/PageMeta";
import BreedCardImage from "@/components/breeds/BreedCardImage";
import { supabase } from "@/integrations/supabase/client";
import { slugify } from "@/lib/normalize";
import {
  LEVEL_BADGE_CLASS,
  SPECIES_ORDER,
  extractDifficultyLevel,
  groupBreedsBySpecies,
  searchBreeds,
  visibleBreeds,
  type BreedListingEntry,
} from "@/lib/breedsListingModel";

const CANONICAL = "https://guardiens.fr/races";

const breedSlug = (b: Pick<BreedListingEntry, "species" | "breed">) =>
  `${b.species.toLowerCase()}-${slugify(b.breed)}`;

const BreedsListing = () => {
  const { t } = useTranslation();
  const [breeds, setBreeds] = useState<BreedListingEntry[]>([]);
  const [query, setQuery] = useState("");
  const [speciesFilter, setSpeciesFilter] = useState<string>("all");

  useEffect(() => {
    supabase
      .from("breed_profiles")
      .select("species, breed, image_url, image_alt, difficulty_level")
      .order("species")
      .order("breed")
      .then(({ data }) => setBreeds((data as BreedListingEntry[]) || []));
  }, []);

  // Doublons fusionnés exclus (gris du gabon, jack russel) : une seule
  // entrée visible par animal.
  const listed = useMemo(() => visibleBreeds(breeds), [breeds]);
  const searched = useMemo(() => searchBreeds(listed, query), [listed, query]);
  const sections = useMemo(() => {
    const grouped = groupBreedsBySpecies(searched);
    return speciesFilter === "all"
      ? grouped
      : grouped.filter((s) => s.species === speciesFilter);
  }, [searched, speciesFilter]);

  const countBySpecies = useMemo(() => {
    const map = new Map<string, number>();
    for (const b of listed) map.set(b.species, (map.get(b.species) ?? 0) + 1);
    return map;
  }, [listed]);

  const presentSpecies = useMemo(
    () =>
      [
        ...SPECIES_ORDER,
        ...[...countBySpecies.keys()].filter((s) => !SPECIES_ORDER.includes(s)).sort(),
      ].filter((s) => countBySpecies.has(s)),
    [countBySpecies],
  );

  const TITLE = t("breeds_listing.meta_title");
  const DESCRIPTION = t("breeds_listing.meta_description");

  const itemListElement = listed.map((b, i) => ({
    "@type": "ListItem",
    position: i + 1,
    url: `https://guardiens.fr/races/${breedSlug(b)}`,
    name: b.breed,
  }));

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
        <header className="mb-6 md:mb-8">
          <h1 className="font-serif text-2xl md:text-4xl font-bold text-foreground mb-3">
            {t("breeds_listing.h1")}
          </h1>
          <p className="text-muted-foreground text-lg max-w-2xl">
            {t("breeds_listing.subtitle")}
          </p>
        </header>

        <div className="mb-6 md:mb-10 space-y-3">
          <label htmlFor="breed-search" className="sr-only">
            {t("breeds_listing.search_label")}
          </label>
          <input
            id="breed-search"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("breeds_listing.search_placeholder")}
            className="w-full max-w-md rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          />
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              aria-pressed={speciesFilter === "all"}
              onClick={() => setSpeciesFilter("all")}
              className={
                speciesFilter === "all"
                  ? "rounded-full bg-primary text-primary-foreground px-3 py-1 text-sm font-medium"
                  : "rounded-full border border-border bg-card px-3 py-1 text-sm text-foreground hover:border-primary/60 transition"
              }
            >
              {t("breeds_listing.filter_all")} ({listed.length})
            </button>
            {presentSpecies.map((species) => (
              <button
                key={species}
                type="button"
                aria-pressed={speciesFilter === species}
                onClick={() => setSpeciesFilter(species)}
                className={
                  speciesFilter === species
                    ? "rounded-full bg-primary text-primary-foreground px-3 py-1 text-sm font-medium"
                    : "rounded-full border border-border bg-card px-3 py-1 text-sm text-foreground hover:border-primary/60 transition"
                }
              >
                {t(`breeds_listing.species.${species}`, { defaultValue: species })} (
                {countBySpecies.get(species)})
              </button>
            ))}
          </div>
        </div>

        {sections.length === 0 && (
          <p className="text-muted-foreground py-8">{t("breeds_listing.no_results")}</p>
        )}

        {sections.map(({ species, breeds: list }) => (
          <section key={species} className="mb-8 md:mb-12">
            <h2 className="font-serif text-2xl font-semibold text-foreground mb-4">
              {t(`breeds_listing.species.${species}`, { defaultValue: species })}{" "}
              <span className="text-base font-normal text-muted-foreground">
                ({list.length})
              </span>
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
              {list.map((b) => {
                const level = extractDifficultyLevel(b.difficulty_level);
                return (
                  <Link
                    key={breedSlug(b)}
                    to={`/races/${breedSlug(b)}`}
                    className="group block rounded-xl border border-border bg-card overflow-hidden hover:border-primary/60 transition"
                  >
                    <BreedCardImage
                      entry={b}
                      speciesLabel={t(`breeds_listing.species.${species}`, { defaultValue: species })}
                    />
                    <div className="p-3 flex items-start justify-between gap-2">
                      <span className="capitalize text-foreground font-medium leading-snug group-hover:text-primary transition-colors">
                        {b.breed}
                      </span>
                      {level && (
                        <span
                          className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ${LEVEL_BADGE_CLASS[level]}`}
                        >
                          {level}
                        </span>
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        ))}

        <section className="mt-4 pt-6 border-t border-border">
          <p className="text-muted-foreground">
            {t("breeds_listing.guides_note")}{" "}
            <Link to="/guides" className="text-primary font-medium hover:underline">
              {t("breeds_listing.guides_cta")}
            </Link>
          </p>
        </section>
      </div>
    </>
  );
};

export default BreedsListing;
