import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import PageMeta from "@/components/PageMeta";
import NotFound from "@/pages/NotFound";
import { SITE_URL } from "@/lib/seo";
import { DEFAULT_OG_IMAGE } from "@/data/siteRoutes";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { isAssociationIndexable } from "@/lib/associationIndexability";
import {
  associationNeedLabel,
  associationSpeciesLabel,
  associationTypeLabel,
} from "@/lib/associationLabels";
import {
  PUBLIC_ASSOCIATION_COLUMNS,
  normalizePhotos,
  type PublicAssociation,
} from "@/components/associations/types";

const MAX_PHOTOS = 5;

const truncate = (text: string, max: number): string => {
  const clean = text.trim().replace(/\s+/g, " ");
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max);
  const lastSpace = cut.lastIndexOf(" ");
  return `${(lastSpace > 40 ? cut.slice(0, lastSpace) : cut).replace(/[,;:.]$/, "")}…`;
};

const longFrenchDate = (value: string): string => {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(d);
};

export default function AssociationDetail() {
  const { slug } = useParams<{ slug: string }>();
  const [failedPhotos, setFailedPhotos] = useState<Record<number, boolean>>({});

  const { data, isLoading } = useQuery<PublicAssociation | null>({
    queryKey: ["public-association", slug],
    enabled: !!slug,
    queryFn: async () => {
      const { data } = await supabase
        .from("public_animal_associations" as any)
        .select(PUBLIC_ASSOCIATION_COLUMNS)
        .eq("slug", slug!)
        .maybeSingle();
      return (data as any) ?? null;
    },
  });

  const photos = useMemo(() => normalizePhotos(data?.photos).slice(0, MAX_PHOTOS), [data?.photos]);
  const visiblePhotos = photos.filter((_, i) => !failedPhotos[i]);
  const allStored = photos.length > 0 && photos.every((p) => p.hosting === "storage");

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-10 max-w-4xl min-w-0">
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (!data) return <NotFound />;

  const typeLabel = associationTypeLabel(data.association_type);
  const canonical = `${SITE_URL}/associations/${data.slug}`;
  const indexable = isAssociationIndexable(data);
  const ogImage = allStored ? photos[0].url : DEFAULT_OG_IMAGE;
  const sameAs = [data.facebook_url, data.instagram_url].filter(Boolean) as string[];
  const storedImages = photos.filter((p) => p.hosting === "storage").map((p) => p.url);

  const ngoJsonLd: Record<string, any> = {
    "@context": "https://schema.org",
    "@type": "NGO",
    name: data.name,
    description: data.description,
    ...(data.website_url ? { url: data.website_url } : {}),
    ...(sameAs.length > 0 ? { sameAs } : {}),
    address: {
      "@type": "PostalAddress",
      addressLocality: data.city,
      ...(data.postal_code ? { postalCode: data.postal_code } : {}),
      addressCountry: "FR",
    },
    ...(storedImages.length > 0 ? { image: storedImages } : {}),
  };

  const breadcrumbJsonLd = {
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
      { "@type": "ListItem", position: 3, name: data.name, item: canonical },
    ],
  };

  const firstSourcePage = photos.find((p) => p.source_page_url)?.source_page_url ?? null;

  return (
    <div className="min-h-screen bg-background pb-16">
      <PageMeta
        title={`${data.name}, ${typeLabel.toLowerCase()} à ${data.city} | Guardiens`}
        description={truncate(data.description, 155)}
        path={`/associations/${data.slug}`}
        canonical={canonical}
        image={ogImage}
        noindex={!indexable}
        jsonLd={[ngoJsonLd, breadcrumbJsonLd]}
        ready={!isLoading}
      />

      <div className="container mx-auto px-4 py-6 md:py-10 max-w-4xl min-w-0">
        <header className="mb-6">
          <h1 className="text-2xl md:text-4xl font-display font-bold">{data.name}</h1>
          <p className="mt-2 text-muted-foreground">
            {typeLabel} · {data.city}, {data.departement_name}
          </p>
        </header>

        {visiblePhotos.length > 0 && (
          <section className="mb-4">
            <div className="grid gap-2 sm:grid-cols-2">
              {photos.map((photo, i) =>
                failedPhotos[i] ? null : (
                  <div
                    key={`${photo.url}-${i}`}
                    className={`aspect-[16/10] w-full overflow-hidden rounded-xl bg-muted ${i === 0 ? "sm:col-span-2" : ""}`}
                  >
                    <img
                      src={photo.url}
                      alt={photo.alt || `${data.name}, ${data.city}`}
                      loading={i === 0 ? undefined : "lazy"}
                      decoding="async"
                      referrerPolicy="no-referrer"
                      onError={() => setFailedPhotos((prev) => ({ ...prev, [i]: true }))}
                      className="h-full w-full object-cover"
                    />
                  </div>
                ),
              )}
            </div>
            {data.photo_credit && (
              <p className="mt-2 text-xs text-muted-foreground">
                {data.photos_authorized ? (
                  <>Photos : {data.photo_credit}, avec l'accord de l'association.</>
                ) : (
                  <>
                    Photos : {data.photo_credit},{" "}
                    {firstSourcePage ? (
                      <a
                        href={firstSourcePage}
                        target="_blank"
                        rel="noopener"
                        className="underline"
                      >
                        publiées par l'association
                      </a>
                    ) : (
                      <>publiées par l'association</>
                    )}
                    .
                  </>
                )}
              </p>
            )}
          </section>
        )}

        <section className="mt-8">
          <h2 className="font-heading text-xl font-semibold text-foreground">L'association</h2>
          <p className="mt-2 whitespace-pre-line leading-relaxed text-foreground">
            {data.description}
          </p>
        </section>

        {data.species.length > 0 && (
          <section className="mt-8">
            <h2 className="font-heading text-xl font-semibold text-foreground">Animaux accueillis</h2>
            <ul className="mt-2 list-disc pl-5 text-foreground">
              {data.species.map((s) => (
                <li key={s}>{associationSpeciesLabel(s)}</li>
              ))}
            </ul>
          </section>
        )}

        {data.needs.length > 0 && (
          <section className="mt-8">
            <h2 className="font-heading text-xl font-semibold text-foreground">
              Ses besoins du moment
            </h2>
            <ul className="mt-2 list-disc pl-5 text-foreground">
              {data.needs.map((n) => (
                <li key={n}>{associationNeedLabel(n)}</li>
              ))}
            </ul>
          </section>
        )}

        <section className="mt-8 rounded-2xl border border-border bg-card p-5 md:p-6">
          <h2 className="font-heading text-xl font-semibold text-foreground">
            Soutenir {data.name}
          </h2>
          <div className="mt-4 flex flex-wrap gap-2">
            {data.donation_url && (
              <Button asChild size="sm">
                <a href={data.donation_url} target="_blank" rel="noopener">
                  Faire un don
                </a>
              </Button>
            )}
            {data.volunteer_url && (
              <Button asChild size="sm" variant="outline">
                <a href={data.volunteer_url} target="_blank" rel="noopener">
                  Devenir bénévole
                </a>
              </Button>
            )}
            {data.adoption_url && (
              <Button asChild size="sm" variant="outline">
                <a href={data.adoption_url} target="_blank" rel="noopener">
                  Voir les animaux à adopter
                </a>
              </Button>
            )}
          </div>
          <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-sm">
            {data.website_url && (
              <a href={data.website_url} target="_blank" rel="noopener" className="text-primary underline">
                Site de l'association
              </a>
            )}
            {data.facebook_url && (
              <a href={data.facebook_url} target="_blank" rel="noopener" className="text-primary underline">
                Facebook
              </a>
            )}
            {data.instagram_url && (
              <a href={data.instagram_url} target="_blank" rel="noopener" className="text-primary underline">
                Instagram
              </a>
            )}
          </div>
          <p className="mt-4 text-xs text-muted-foreground">
            Le don se fait directement auprès de l'association, sur sa propre page.
          </p>
        </section>

        {data.departement_slug && (
          <section className="mt-8 rounded-2xl border border-border bg-muted/40 p-5 md:p-6">
            <h2 className="font-heading text-xl font-semibold text-foreground">
              Partir en laissant vos animaux entre de bonnes mains
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Bénévoles et familles d'accueil partent aussi en vacances. Sur Guardiens, un gardien du
              coin veille sur votre maison et vos animaux pendant votre absence.
            </p>
            <Button asChild size="sm" className="mt-4">
              <Link to={`/departement/${data.departement_slug}`}>
                Trouver un gardien : {data.departement_name}
              </Link>
            </Button>
          </section>
        )}

        <p className="mt-8 text-xs text-muted-foreground">
          Fiche rédigée par Guardiens à partir des informations publiées par l'association,
          vérifiées le {longFrenchDate(data.verified_at)}. Une information à corriger :{" "}
          <Link to="/contact" className="underline">
            écrivez-nous
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
