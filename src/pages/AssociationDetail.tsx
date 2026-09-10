import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import PageMeta from "@/components/PageMeta";
import NotFound from "@/pages/NotFound";
import { SITE_URL } from "@/lib/seo";
import { DEFAULT_OG_IMAGE } from "@/data/siteRoutes";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { isAssociationIndexable } from "@/lib/associationIndexability";
import {
  associationInitials,
  associationNeedCtaLabel,
  associationNeedDetailLabel,
  associationNeedLabel,
  associationSpeciesLabel,
  associationTypeLabel,
} from "@/lib/associationLabels";
import { AssociationFaq } from "@/components/associations/AssociationFaq";
import { faqPageJsonLd, type AssociationFaqItem } from "@/lib/associationFaq";
import {
  PUBLIC_ASSOCIATION_COLUMNS,
  normalizeJsonArray,
  normalizePhotos,
  type AssociationKeyFigure,
  type AssociationNeedDetail,
  type AssociationPressItem,
  type PublicAssociation,
} from "@/components/associations/types";

const MAX_PHOTOS = 5;
const MAX_KEY_FIGURES = 3;

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

/** SIREN lisible, par groupes de 3 chiffres. */
export const formatSiren = (siren: string): string =>
  siren.replace(/\D/g, "").replace(/(\d{3})(?=\d)/g, "$1 ").trim();

/** Questions fréquentes construites depuis les données de la fiche. */
export const buildAssociationFaq = (
  association: Pick<
    PublicAssociation,
    "name" | "city" | "departement_name" | "species" | "needs" | "donation_url"
  > & { needs_details?: AssociationNeedDetail[] },
): AssociationFaqItem[] => {
  const items: AssociationFaqItem[] = [];
  const details = (association.needs_details ?? []).filter((d) => d && d.need);

  let helpAnswer = "";
  if (details.length > 0) {
    helpAnswer = details
      .map((d) => {
        const label = associationNeedDetailLabel(String(d.need));
        return d.detail ? `${label} : ${d.detail}` : label;
      })
      .join(" ");
  } else if (association.needs.length > 0) {
    const labels = association.needs.map((n) => associationNeedLabel(n).toLowerCase()).join(", ");
    helpAnswer = `${association.name} recherche aujourd'hui : ${labels}.`;
    if (association.donation_url) {
      helpAnswer += " Le don se fait directement sur sa propre page.";
    }
  }
  if (helpAnswer) {
    items.push({ question: `Comment aider ${association.name} ?`, answer: helpAnswer });
  }

  items.push({
    question: `Où se trouve ${association.name} ?`,
    answer: `${association.name} est basée à ${association.city}, dans le département ${association.departement_name}.`,
  });

  if (association.species.length > 0) {
    items.push({
      question: `Quels animaux accueille ${association.name} ?`,
      answer: `${association.name} accueille : ${association.species
        .map((s) => associationSpeciesLabel(s).toLowerCase())
        .join(", ")}.`,
    });
  }

  return items;
};

export default function AssociationDetail() {
  const { slug } = useParams<{ slug: string }>();
  const [failedPhotos, setFailedPhotos] = useState<Record<number, boolean>>({});
  const [logoFailed, setLogoFailed] = useState(false);

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

  const keyFigures = normalizeJsonArray<AssociationKeyFigure>(data.key_figures).slice(
    0,
    MAX_KEY_FIGURES,
  );
  const press = normalizeJsonArray<AssociationPressItem>(data.press);
  const needsDetails = normalizeJsonArray<AssociationNeedDetail>(data.needs_details).filter(
    (d) => d && d.need,
  );

  const faqItems = buildAssociationFaq({ ...data, needs_details: needsDetails });

  const needsSummary = data.needs.map((n) => associationNeedLabel(n).toLowerCase()).join(", ");
  const baseDescription = data.tagline?.trim() || data.description;
  const metaDescription = truncate(
    needsSummary ? `${baseDescription} Besoins : ${needsSummary}.` : baseDescription,
    155,
  );

  const ngoJsonLd: Record<string, any> = {
    "@context": "https://schema.org",
    "@type": "NGO",
    name: data.name,
    description: data.description,
    ...(data.website_url ? { url: data.website_url } : {}),
    ...(sameAs.length > 0 ? { sameAs } : {}),
    ...(data.logo_url ? { logo: data.logo_url } : {}),
    ...(data.founded_year ? { foundingDate: String(data.founded_year) } : {}),
    ...(data.siren
      ? {
          identifier: {
            "@type": "PropertyValue",
            propertyID: "SIREN",
            value: data.siren,
          },
        }
      : {}),
    areaServed: { "@type": "AdministrativeArea", name: data.departement_name },
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

  const shareText = `${data.name}, ${typeLabel.toLowerCase()} à ${data.city}`;
  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(canonical);
      toast.success("Lien copié");
    } catch {
      toast.error("Copie impossible");
    }
  };

  return (
    <div className="min-h-screen bg-background pb-16">
      <PageMeta
        title={`${data.name} : ${typeLabel.toLowerCase()} à ${data.city} (${data.departement_name}) | Guardiens`}
        description={metaDescription}
        path={`/associations/${data.slug}`}
        canonical={canonical}
        image={ogImage}
        noindex={!indexable}
        jsonLd={[ngoJsonLd, breadcrumbJsonLd, faqPageJsonLd(faqItems)]}
        ready={!isLoading}
      />

      <div className="container mx-auto px-4 py-6 md:py-10 max-w-4xl min-w-0">
        {/* 1. En tête */}
        <header className="mb-6 flex items-start gap-4">
          <span className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white shadow-sm">
            {data.logo_url && !logoFailed ? (
              <img
                src={data.logo_url}
                alt={`Logo de ${data.name}`}
                width={64}
                height={64}
                decoding="async"
                referrerPolicy="no-referrer"
                onError={() => setLogoFailed(true)}
                className="h-full w-full object-contain"
              />
            ) : (
              <span className="text-sm font-semibold text-muted-foreground">
                {associationInitials(data.name)}
              </span>
            )}
          </span>
          <div className="min-w-0">
            <h1 className="text-2xl md:text-4xl font-display font-bold">{data.name}</h1>
            {data.tagline && (
              <p className="mt-1 text-base text-foreground/80">{data.tagline}</p>
            )}
            <p className="mt-2 text-muted-foreground">
              {typeLabel} · {data.city}, {data.departement_name}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {data.siren && (
                <a
                  href={`https://annuaire-entreprises.data.gouv.fr/entreprise/${data.siren}`}
                  target="_blank"
                  rel="noopener"
                  title={`SIREN ${formatSiren(data.siren)}`}
                  className="inline-flex rounded-full border border-border bg-muted/40 px-3 py-1 text-xs text-muted-foreground hover:bg-muted"
                >
                  Association déclarée
                </a>
              )}
              {data.photos_authorized && (
                <span className="inline-flex rounded-full border border-border bg-muted/40 px-3 py-1 text-xs text-muted-foreground">
                  Fiche validée par l'association
                </span>
              )}
            </div>
          </div>
        </header>

        {/* 2. Chiffres clés */}
        {keyFigures.length > 0 && (
          <section className="mb-6 grid gap-3 sm:grid-cols-3">
            {keyFigures.map((figure, i) => (
              <div
                key={`${figure.label ?? "figure"}-${i}`}
                className="rounded-xl border border-border bg-card p-4"
              >
                <p className="font-display text-2xl font-bold text-foreground">{figure.value}</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {figure.label}
                  {figure.year ? ` (${figure.year})` : ""}
                </p>
                {figure.source_url && (
                  <a
                    href={figure.source_url}
                    target="_blank"
                    rel="noopener"
                    className="mt-1 inline-block text-xs text-primary underline underline-offset-4"
                  >
                    source
                  </a>
                )}
              </div>
            ))}
          </section>
        )}

        {/* 3. Galerie */}
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

        {/* 4. Leur histoire */}
        <section className="mt-8">
          <h2 className="font-heading text-xl font-semibold text-foreground">Leur histoire</h2>
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

        {/* 5. Ce dont elle a besoin */}
        {needsDetails.length > 0 ? (
          <section className="mt-8">
            <h2 className="font-heading text-xl font-semibold text-foreground">
              Ce dont elle a besoin
            </h2>
            <div className="mt-3 space-y-3">
              {needsDetails.map((need, i) => (
                <div
                  key={`${need.need}-${i}`}
                  className="rounded-xl border border-border bg-card p-4"
                >
                  <p className="text-sm font-semibold text-foreground">
                    {associationNeedDetailLabel(String(need.need))}
                  </p>
                  {need.detail && (
                    <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                      {need.detail}
                    </p>
                  )}
                  {need.url && (
                    <Button asChild size="sm" variant="outline" className="mt-3">
                      <a href={need.url} target="_blank" rel="noopener">
                        {associationNeedCtaLabel(String(need.need))}
                      </a>
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </section>
        ) : (
          data.needs.length > 0 && (
            <section className="mt-8">
              <h2 className="font-heading text-xl font-semibold text-foreground">
                Ce dont elle a besoin
              </h2>
              <ul className="mt-2 list-disc pl-5 text-foreground">
                {data.needs.map((n) => (
                  <li key={n}>{associationNeedLabel(n)}</li>
                ))}
              </ul>
            </section>
          )
        )}

        {/* 6. Ils en parlent */}
        {press.length > 0 && (
          <section className="mt-8">
            <h2 className="font-heading text-xl font-semibold text-foreground">Ils en parlent</h2>
            <ul className="mt-3 space-y-3">
              {press.map((article, i) => (
                <li key={`${article.url ?? article.title}-${i}`}>
                  <p className="text-xs text-muted-foreground">
                    {article.media}
                    {article.date ? ` · ${longFrenchDate(article.date)}` : ""}
                  </p>
                  {article.url ? (
                    <a
                      href={article.url}
                      target="_blank"
                      rel="noopener"
                      className="text-sm text-primary underline underline-offset-4"
                    >
                      {article.title}
                    </a>
                  ) : (
                    <p className="text-sm text-foreground">{article.title}</p>
                  )}
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* 7. Soutenir */}
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

          <div className="mt-5 border-t border-border pt-4">
            <p className="text-sm text-muted-foreground">
              Partager cette fiche aide l'association à se faire connaître.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button asChild size="sm" variant="outline">
                <a
                  href={`https://wa.me/?text=${encodeURIComponent(`${shareText} ${canonical}`)}`}
                  target="_blank"
                  rel="noopener"
                >
                  Partager sur WhatsApp
                </a>
              </Button>
              <Button asChild size="sm" variant="outline">
                <a
                  href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(canonical)}`}
                  target="_blank"
                  rel="noopener"
                >
                  Partager sur Facebook
                </a>
              </Button>
              <Button size="sm" variant="outline" onClick={copyLink}>
                Copier le lien
              </Button>
            </div>
          </div>
        </section>

        {/* 8. Maillage gardiens */}
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

        {/* 9. Questions fréquentes */}
        <AssociationFaq items={faqItems} />

        {/* 10. Pied de fiche */}
        <p className="mt-8 text-xs text-muted-foreground">
          Fiche rédigée par Guardiens à partir des informations publiées par l'association,
          vérifiées le {longFrenchDate(data.verified_at)}. Une information à corriger :{" "}
          <Link to="/contact" className="underline">
            écrivez-nous
          </Link>
          .
        </p>
        <p className="mt-2 text-xs text-muted-foreground">
          <Link to={`/contact?sujet=association&association=${data.slug}`} className="underline">
            Vous êtes cette association ? Mettez à jour votre fiche
          </Link>
        </p>
      </div>
    </div>
  );
}
