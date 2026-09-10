import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import PageMeta from "@/components/PageMeta";
import { SITE_URL } from "@/lib/seo";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ASSOCIATION_SPECIES_VALUES,
  ASSOCIATION_TYPE_VALUES,
  associationInitials,
  associationSpeciesLabel,
  associationTypeLabel,
} from "@/lib/associationLabels";
import { isAssociationIndexable } from "@/lib/associationIndexability";
import {
  PUBLIC_ASSOCIATION_COLUMNS,
  normalizePhotos,
  type PublicAssociation,
} from "@/components/associations/types";

const META_TITLE = "Associations et refuges pour animaux en France | Guardiens";
const META_DESCRIPTION =
  "Refuges, sanctuaires, familles d'accueil et centres de soins pour la faune sauvage : découvrez des associations de protection animale, leurs besoins et les moyens de les soutenir.";

const AssociationCard = ({ association }: { association: PublicAssociation }) => {
  const [photoFailed, setPhotoFailed] = useState(false);
  const photos = normalizePhotos(association.photos);
  const cover = photos[0];

  return (
    <Link to={`/associations/${association.slug}`} className="block group">
      <Card className="h-full overflow-hidden transition-shadow group-hover:shadow-md">
        <div className="aspect-[16/9] w-full bg-muted overflow-hidden flex items-center justify-center">
          {cover && !photoFailed ? (
            <img
              src={cover.url}
              alt={cover.alt || association.name}
              loading="lazy"
              decoding="async"
              referrerPolicy="no-referrer"
              onError={() => setPhotoFailed(true)}
              className="h-full w-full object-cover"
            />
          ) : (
            <span className="font-display text-2xl font-bold text-muted-foreground">
              {associationInitials(association.name)}
            </span>
          )}
        </div>
        <CardContent className="p-4">
          <h2 className="font-heading text-base font-semibold text-foreground">{association.name}</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {associationTypeLabel(association.association_type)}
          </p>
          <p className="text-sm text-muted-foreground">
            {association.city}, {association.departement_name}
          </p>
          {association.species.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {association.species.map((s) => (
                <Badge key={s} variant="secondary" className="text-xs">
                  {associationSpeciesLabel(s)}
                </Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  );
};

export default function AssociationsListing() {
  const [departement, setDepartement] = useState<string>("all");
  const [type, setType] = useState<string>("all");
  const [species, setSpecies] = useState<string>("all");

  const { data: associations = [], isLoading } = useQuery<PublicAssociation[]>({
    queryKey: ["public-associations"],
    staleTime: 10 * 60 * 1000,
    queryFn: async () => {
      const { data } = await supabase
        .from("public_animal_associations" as any)
        .select(PUBLIC_ASSOCIATION_COLUMNS)
        .order("name");
      return ((data as any) ?? []) as PublicAssociation[];
    },
  });

  const departements = useMemo(() => {
    const map = new Map<string, string>();
    associations.forEach((a) => map.set(a.departement_code, a.departement_name));
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0], "fr"));
  }, [associations]);

  const filtered = useMemo(
    () =>
      associations.filter((a) => {
        if (departement !== "all" && a.departement_code !== departement) return false;
        if (type !== "all" && a.association_type !== type) return false;
        if (species !== "all" && !a.species.includes(species)) return false;
        return true;
      }),
    [associations, departement, type, species],
  );

  const indexable = associations.filter((a) => isAssociationIndexable(a));

  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      name: "Associations et refuges pour animaux",
      description: META_DESCRIPTION,
      url: `${SITE_URL}/associations`,
      inLanguage: "fr",
      mainEntity: {
        "@type": "ItemList",
        name: "Associations de protection animale présentées par Guardiens",
        numberOfItems: indexable.length,
        itemListOrder: "https://schema.org/ItemListOrderAscending",
        itemListElement: indexable.slice(0, 100).map((a, i) => ({
          "@type": "ListItem",
          position: i + 1,
          url: `${SITE_URL}/associations/${a.slug}`,
          name: a.name,
        })),
      },
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Accueil", item: `${SITE_URL}/` },
        {
          "@type": "ListItem",
          position: 2,
          name: "Associations et refuges",
          item: `${SITE_URL}/associations`,
        },
      ],
    },
  ];

  const selectClass =
    "h-10 rounded-md border border-input bg-background px-3 text-sm md:max-w-[240px]";

  return (
    <div className="bg-background">
      <PageMeta
        title={META_TITLE}
        description={META_DESCRIPTION}
        path="/associations"
        canonical={`${SITE_URL}/associations`}
        jsonLd={jsonLd}
        ready={!isLoading}
      />

      <div className="container mx-auto px-4 py-6 md:py-10 max-w-6xl min-w-0">
        <header className="mb-6 md:mb-8">
          <h1 className="text-2xl md:text-4xl font-display font-bold">
            Associations et refuges pour animaux
          </h1>
          <p className="mt-3 text-base md:text-lg text-muted-foreground max-w-3xl">
            Partout en France, des bénévoles recueillent, soignent et accompagnent des animaux toute
            l'année. Cette page présente leur travail, leurs besoins du moment et les moyens de les
            aider : un don, du temps, une place en famille d'accueil.
          </p>
        </header>

        <div className="mb-6 flex flex-col gap-2 md:flex-row">
          <select
            value={departement}
            onChange={(e) => setDepartement(e.target.value)}
            className={selectClass}
            aria-label="Département"
          >
            <option value="all">Tous les départements</option>
            {departements.map(([code, nom]) => (
              <option key={code} value={code}>
                {code} {nom}
              </option>
            ))}
          </select>
          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            className={selectClass}
            aria-label="Type d'association"
          >
            <option value="all">Tous les types</option>
            {ASSOCIATION_TYPE_VALUES.map((v) => (
              <option key={v} value={v}>
                {associationTypeLabel(v)}
              </option>
            ))}
          </select>
          <select
            value={species}
            onChange={(e) => setSpecies(e.target.value)}
            className={selectClass}
            aria-label="Espèce accueillie"
          >
            <option value="all">Toutes les espèces</option>
            {ASSOCIATION_SPECIES_VALUES.map((v) => (
              <option key={v} value={v}>
                {associationSpeciesLabel(v)}
              </option>
            ))}
          </select>
        </div>

        {isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-64 rounded-xl" />
            ))}
          </div>
        ) : filtered.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((a) => (
              <AssociationCard key={a.id} association={a} />
            ))}
          </div>
        ) : (
          <p className="rounded-xl border border-border bg-card p-6 text-sm text-muted-foreground">
            Les premières fiches arrivent. Revenez bientôt pour découvrir les associations
            présentées ici.
          </p>
        )}

        <section className="mt-10 rounded-2xl border border-border bg-card p-5 md:p-6">
          <h2 className="font-heading text-lg md:text-xl font-semibold text-foreground">
            Vous connaissez une association à présenter ?
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Écrivez-nous : nous prenons contact avec elle et rédigeons sa fiche.
          </p>
          <Button asChild size="sm" className="mt-4">
            <Link to="/contact">Nous la signaler</Link>
          </Button>
        </section>
      </div>
    </div>
  );
}
