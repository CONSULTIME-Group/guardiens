import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import PageMeta from "@/components/PageMeta";
import { SECTION_OG_IMAGES } from "@/data/siteConstants";
import { SITE_URL } from "@/lib/seo";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ASSOCIATION_NEEDS_VALUES,
  ASSOCIATION_SPECIES_VALUES,
  ASSOCIATION_TYPE_VALUES,
  associationInitials,
  associationNeedChipLabel,
  associationNeedLabel,
  associationPlaceLabel,
  associationSpeciesLabel,
  associationTypeLabel,
} from "@/lib/associationLabels";
import { ASSOCIATIONS_FAQ, faqPageJsonLd } from "@/lib/associationFaq";
import { AssociationFaq } from "@/components/associations/AssociationFaq";
import VolunteerInviteBlock from "@/components/associations/VolunteerInviteBlock";
import { isAssociationIndexable } from "@/lib/associationIndexability";
import {
  PUBLIC_ASSOCIATION_COLUMNS,
  type PublicAssociation,
} from "@/components/associations/types";
import { associationMedia } from "@/lib/associationMedia";

const META_TITLE = "Associations et refuges pour animaux en France | Guardiens";
const META_DESCRIPTION =
  "Refuges, sanctuaires, familles d'accueil et centres de soins pour la faune sauvage : découvrez des associations de protection animale, leurs besoins et les moyens de les soutenir.";

const NEED_CHIP_CLASS: Record<string, string> = {
  benevoles: "bg-pastel-peach text-pastel-peach-ink",
  familles_accueil: "bg-pastel-sage text-pastel-sage-ink",
  dons: "bg-pastel-honey text-pastel-honey-ink",
};

/** Rang d'affichage : besoin de bénévoles d'abord, puis le type de structure, puis le nom. */
const TYPE_RANK: Record<string, number> = {
  faune_sauvage: 0,
  refuge: 1,
  sanctuaire: 2,
  familles_accueil: 3,
  autre: 4,
};

const sortAssociations = (a: PublicAssociation, b: PublicAssociation) => {
  const needA = a.needs?.includes("benevoles") ? 0 : 1;
  const needB = b.needs?.includes("benevoles") ? 0 : 1;
  if (needA !== needB) return needA - needB;
  const typeA = TYPE_RANK[a.association_type] ?? 4;
  const typeB = TYPE_RANK[b.association_type] ?? 4;
  if (typeA !== typeB) return typeA - typeB;
  return a.name.localeCompare(b.name, "fr");
};

const AssociationCard = ({ association }: { association: PublicAssociation }) => {
  const [logoFailed, setLogoFailed] = useState(false);
  // Lot ASSO-1 : logo servi tant que l'association n'a pas refusé.
  const media = associationMedia(association);
  const firstNeed = association.needs?.[0];
  const needChip = firstNeed ? associationNeedChipLabel(firstNeed) : "";
  const summary = association.tagline || association.description;

  return (
    <Link to={`/associations/${association.slug}`} className="group block">
      <Card className="flex h-full flex-col gap-3 rounded-2xl p-5 transition-shadow group-hover:shadow-md">
        <div className="flex items-center gap-3.5">
          <span className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-border bg-white">
            {media.logoUrl && !logoFailed ? (
              <img
                src={media.logoUrl}
                alt={`Logo de ${association.name}`}
                width={64}
                height={64}
                loading="lazy"
                decoding="async"
                onError={() => setLogoFailed(true)}
                className="h-full w-full object-contain p-1.5"
              />
            ) : (
              <span className="font-heading text-xl font-bold text-pastel-sage-ink">
                {associationInitials(association.name)}
              </span>
            )}
          </span>
          <div className="min-w-0">
            <h2 className="font-heading text-lg font-semibold leading-tight text-foreground">
              {association.name}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {associationPlaceLabel(association.city, association.departement_name)}
            </p>
          </div>
        </div>
        {summary && (
          <p className="line-clamp-3 text-[15px] leading-relaxed text-foreground">{summary}</p>
        )}
        <div className="mt-auto flex flex-wrap gap-2">
          {needChip && (
            <span
              className={`rounded-full px-2.5 py-1 text-[13px] font-medium ${
                NEED_CHIP_CLASS[firstNeed] ?? "bg-muted text-muted-foreground"
              }`}
            >
              {needChip}
            </span>
          )}
          <span className="rounded-full bg-muted px-2.5 py-1 text-[13px] text-muted-foreground">
            {associationTypeLabel(association.association_type)}
          </span>
        </div>
        {association.species.length > 0 && (
          <p className="text-[13px] text-muted-foreground">
            {association.species.map((sp) => associationSpeciesLabel(sp)).join(" · ")}
          </p>
        )}
      </Card>
    </Link>
  );
};

export default function AssociationsListing() {
  const [departement, setDepartement] = useState<string>("all");
  const [type, setType] = useState<string>("all");
  const [species, setSpecies] = useState<string>("all");
  const [need, setNeed] = useState<string>("all");

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
        if (need !== "all" && !(a.needs ?? []).includes(need)) return false;
        return true;
      })
      .sort(sortAssociations),
    [associations, departement, type, species, need],
  );

  const indexable = associations.filter((a) => isAssociationIndexable(a));

  const departementCount = new Set(filtered.map((a) => a.departement_code)).size;

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
          item: {
            "@type": "NGO",
            name: a.name,
            url: `${SITE_URL}/associations/${a.slug}`,
            address: {
              "@type": "PostalAddress",
              addressLocality: a.city,
              ...(a.postal_code ? { postalCode: a.postal_code } : {}),
              addressCountry: "FR",
            },
          },
        })),
      },
    },
    faqPageJsonLd(ASSOCIATIONS_FAQ),
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
        image={SECTION_OG_IMAGES.associations.url}
        imageAlt={SECTION_OG_IMAGES.associations.alt}
        jsonLd={jsonLd}
        ready={!isLoading}
      />

      <div className="container mx-auto px-4 py-6 md:py-10 max-w-6xl min-w-0">
        <header className="mb-6 md:mb-8">
          <h1 className="text-2xl md:text-4xl font-display font-bold">
            Associations et refuges pour animaux
          </h1>
          <p className="mt-3 text-base md:text-lg text-muted-foreground max-w-3xl">
            Cet espace fait connaître des associations de protection animale auprès des membres de
            Guardiens. Pour chacune, vous trouvez son activité et ce dont elle a besoin
            aujourd'hui : des bénévoles, des dons, des familles d'accueil. Vous êtes une
            association ? Présentez la vôtre, l'espace est ouvert à toutes.
          </p>
          <Button asChild size="sm" className="mt-4">
            <Link to="/contact?sujet=association">Présenter mon association</Link>
          </Button>
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
          <select
            value={need}
            onChange={(e) => setNeed(e.target.value)}
            className={selectClass}
            aria-label="Besoin de l'association"
          >
            <option value="all">Tous les besoins</option>
            {ASSOCIATION_NEEDS_VALUES.map((v) => (
              <option key={v} value={v}>
                {associationNeedLabel(v)}
              </option>
            ))}
          </select>
        </div>

        <p className="mb-4 text-sm text-muted-foreground" aria-live="polite">
          {isLoading
            ? "Chargement des associations"
            : `${filtered.length} ${filtered.length > 1 ? "associations" : "association"}, ${departementCount} ${departementCount > 1 ? "départements" : "département"}`}
        </p>

        {isLoading ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-56 rounded-2xl" />
            ))}
          </div>
        ) : filtered.length > 0 ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((a) => (
              <AssociationCard key={a.id} association={a} />
            ))}
          </div>
        ) : (
          <p className="rounded-xl border border-border bg-card p-6 text-sm text-muted-foreground">
            Aucune association ne correspond à ces filtres. Les premières fiches arrivent, revenez
            bientôt pour découvrir les associations présentées ici.
          </p>
        )}

        <AssociationFaq items={ASSOCIATIONS_FAQ} />

        <VolunteerInviteBlock />

        <section className="mt-10 rounded-2xl border border-border bg-card p-5 md:p-6">
          <h2 className="font-heading text-lg md:text-xl font-semibold text-foreground">
            Vous connaissez une association à présenter ?
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Écrivez-nous : nous prenons contact avec elle et rédigeons sa fiche.
          </p>
          <Button asChild size="sm" className="mt-4">
            <Link to="/contact?sujet=association">Présenter mon association</Link>
          </Button>
        </section>
      </div>
    </div>
  );
}
