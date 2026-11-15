import PublicLoadError from "@/components/seo/ErrorPage";
import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import PageMeta from "@/components/PageMeta";
import { buildAssociationTitle } from "@/lib/seoTitle";
import NotFound from "@/pages/NotFound";
import { SITE_URL } from "@/lib/seo";
import { buildOgImageUrl } from "@/lib/ogImage";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Share2 } from "lucide-react";
import { associationNeedChipLabel, associationPlaceLabel } from "@/lib/associationLabels";
import { isAssociationIndexable } from "@/lib/associationIndexability";
import { associationLocalActions } from "@/lib/localUsefulActions";
import { formatDateRangeFr } from "@/lib/formatDateRangeFr";
import {
  associationInitials,
  associationNeedCtaLabel,
  associationNeedDetailLabel,
  associationNeedLabel,
  associationSpeciesLabel,
  associationTypeLabel,
} from "@/lib/associationLabels";
import { AssociationFaq } from "@/components/associations/AssociationFaq";
import VolunteerCountByDepartment from "@/components/associations/VolunteerCountByDepartment";
import { faqPageJsonLd, type AssociationFaqItem } from "@/lib/associationFaq";
import { associationMedia } from "@/lib/associationMedia";
import {
  PUBLIC_ASSOCIATION_COLUMNS,
  normalizeJsonArray,
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

const ShareMenu = ({
  onWhatsApp,
  onFacebook,
  onCopy,
}: {
  onWhatsApp: string;
  onFacebook: string;
  onCopy: () => void;
}) => (
  <DropdownMenu>
    <DropdownMenuTrigger asChild>
      <Button variant="outline" className="w-full gap-2">
        <Share2 className="h-4 w-4" aria-hidden="true" />
        Partager
      </Button>
    </DropdownMenuTrigger>
    <DropdownMenuContent align="end" className="w-56">
      <DropdownMenuItem asChild className="min-h-11">
        <a href={onWhatsApp} target="_blank" rel="noopener">
          WhatsApp
        </a>
      </DropdownMenuItem>
      <DropdownMenuItem asChild className="min-h-11">
        <a href={onFacebook} target="_blank" rel="noopener">
          Facebook
        </a>
      </DropdownMenuItem>
      <DropdownMenuItem className="min-h-11" onSelect={onCopy}>
        Copier le lien
      </DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>
);


export default function AssociationDetail() {
  const { slug } = useParams<{ slug: string }>();
  const { hash } = useLocation();
  const [failedPhotos, setFailedPhotos] = useState<Record<number, boolean>>({});
  const [logoFailed, setLogoFailed] = useState(false);

  const { data, isLoading, isError } = useQuery<PublicAssociation | null>({
    queryKey: ["public-association", slug],
    enabled: !!slug,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("public_animal_associations" as any)
        .select(PUBLIC_ASSOCIATION_COLUMNS)
        .eq("slug", slug!)
        .maybeSingle();
      if (error) throw error;
      return (data as any) ?? null;
    },
  });

  // Lot SEO1 : photos et logo seulement avec l'accord de l'association.
  const media = useMemo(() => associationMedia(data), [data]);
  const photos = useMemo(() => media.photos.slice(0, MAX_PHOTOS), [media]);
  const logoUrl = media.logoUrl;
  useEffect(() => {
    if (data && /^#besoin-\d+$/.test(hash)) {
      document.getElementById(hash.slice(1))?.scrollIntoView({ block: "start" });
    }
  }, [data, hash]);
  const visiblePhotos = photos.filter((_, i) => !failedPhotos[i]);
  const allStored = photos.length > 0 && photos.every((p) => p.hosting === "storage");

  if (isError) return <PublicLoadError />;

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
  // Photo seulement avec l'accord de l'association (allStored) ; sinon visuel généré avec son nom et sa ville.
  const ogImage = allStored
    ? photos[0].url
    : buildOgImageUrl({ title: data.name, subtitle: `${data.city}${data.departement_name ? ` (${data.departement_name})` : ""}`, kind: "association" });
  const sameAs = [data.facebook_url, data.instagram_url].filter(Boolean) as string[];
  const storedImages = photos.filter((p) => p.hosting === "storage").map((p) => p.url);

  const keyFigures = normalizeJsonArray<AssociationKeyFigure>(data.key_figures).slice(
    0,
    MAX_KEY_FIGURES,
  );
  const press = normalizeJsonArray<AssociationPressItem>(data.press);
  const needsDetails = normalizeJsonArray<AssociationNeedDetail>(data.needs_details).flatMap(
    (d, localIndex) => d && d.need ? [{ ...d, localIndex }] : [],
  );

  const faqItems = buildAssociationFaq({ ...data, needs_details: needsDetails });

  const needsSummary = data.needs.map((n) => associationNeedLabel(n).toLowerCase()).join(", ");
  const localActions = associationLocalActions(data);
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
    ...(logoUrl ? { logo: logoUrl } : {}),
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
      ...(data.address ? { streetAddress: data.address } : {}),
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
        title={buildAssociationTitle(data.name, typeLabel, data.city, data.departement_name)}
        description={metaDescription}
        path={`/associations/${data.slug}`}
        canonical={canonical}
        image={ogImage}
        noindex={!indexable}
        jsonLd={[ngoJsonLd, breadcrumbJsonLd, faqPageJsonLd(faqItems)]}
        ready={!isLoading}
      />

      <div className="container mx-auto px-4 py-6 md:py-10 max-w-6xl min-w-0">
        <nav aria-label="Fil d'Ariane" className="mb-4 text-sm text-muted-foreground">
          <Link to="/associations" className="hover:underline">
            Associations et refuges
          </Link>
          <span aria-hidden="true"> › </span>
          <span className="text-foreground">{data.name}</span>
        </nav>

        {/* 1. En tête */}
        <header className="mb-8 flex flex-col gap-6 rounded-3xl border border-border bg-card p-5 md:flex-row md:items-center md:p-8">
          <span className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-3xl border border-border bg-white md:h-28 md:w-28">
            {logoUrl && !logoFailed ? (
              <img
                src={logoUrl}
                alt={`Logo de ${data.name}`}
                width={112}
                height={112}
                decoding="async"
                onError={() => setLogoFailed(true)}
                className="h-full w-full object-contain p-2"
              />
            ) : (
              <span className="font-heading text-3xl font-bold text-pastel-sage-ink">
                {associationInitials(data.name)}
              </span>
            )}
          </span>
          <div className="min-w-0 flex-1">
            <div className="mb-3 flex flex-wrap gap-2">
              <span className="rounded-full bg-pastel-sage px-3 py-1 text-[13px] font-medium text-pastel-sage-ink">
                {typeLabel}
              </span>
              {data.siren && (
                <a
                  href={`https://annuaire-entreprises.data.gouv.fr/entreprise/${data.siren}`}
                  target="_blank"
                  rel="noopener"
                  title={`SIREN ${formatSiren(data.siren)}`}
                  className="rounded-full bg-muted px-3 py-1 text-[13px] text-muted-foreground hover:bg-muted/70"
                >
                  Association déclarée
                </a>
              )}
              {data.photos_authorized && (
                <span className="rounded-full bg-muted px-3 py-1 text-[13px] text-muted-foreground">
                  Fiche validée par l'association
                </span>
              )}
              {data.needs?.[0] && associationNeedChipLabel(data.needs[0]) && (
                <span className="rounded-full bg-pastel-peach px-3 py-1 text-[13px] font-medium text-pastel-peach-ink">
                  {associationNeedChipLabel(data.needs[0])}
                </span>
              )}
            </div>
            <h1 className="text-3xl md:text-4xl font-display font-bold leading-tight">{data.name}</h1>
            {data.tagline && (
              <p className="mt-2 text-lg leading-relaxed text-muted-foreground">{data.tagline}</p>
            )}
            <p className="mt-2 text-[15px] text-muted-foreground">
              {associationPlaceLabel(data.city, data.departement_name)}
            </p>
          </div>
          <div className="flex w-full flex-col gap-2.5 md:w-56">
            {data.donation_url && (
              <Button asChild>
                <a href={data.donation_url} target="_blank" rel="noopener">
                  Faire un don
                </a>
              </Button>
            )}
            <ShareMenu
              onWhatsApp={`https://wa.me/?text=${encodeURIComponent(`${shareText} ${canonical}`)}`}
              onFacebook={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(canonical)}`}
              onCopy={copyLink}
            />
          </div>
        </header>

        <div className="flex flex-col gap-8 lg:flex-row lg:items-start">
          <div className="min-w-0 flex-1">

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
                  id={`besoin-${need.localIndex}`}
                  className="scroll-mt-24 rounded-xl border border-border bg-card p-4"
                >
                  <p className="text-sm font-semibold text-foreground">
                    {associationNeedDetailLabel(String(need.need))}
                  </p>
                  {need.detail && (
                    <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                      {need.detail}
                    </p>
                  )}
                  {localActions.filter(a => a.id === `association:${data.slug}:${need.localIndex}`).map(action => (
                    <div key={action.id} className="mt-3 rounded-lg bg-muted/40 p-3 text-sm">
                      <p className="font-semibold">{action.title}</p>
                      <p className="mt-1 text-muted-foreground">{action.city} · {/^\d{4}-\d{2}-\d{2}$/.test(action.when) ? formatDateRangeFr(action.when, null) : action.when} · {action.duration}</p>
                    </div>
                  ))}
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

        {/* 6. Pour en savoir plus */}
        {press.length > 0 && (
          <section className="mt-8">
            <h2 className="font-heading text-xl font-semibold text-foreground">Pour en savoir plus</h2>
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

          </div>

          <aside className="w-full shrink-0 space-y-4 lg:sticky lg:top-24 lg:w-[340px]">
            {/* 7. Infos pratiques */}
            <section className="rounded-2xl border border-border bg-card p-5">
              <h2 className="font-heading text-xl font-semibold text-foreground">Infos pratiques</h2>
              <dl className="mt-3 space-y-3 text-[15px]">
                <div>
                  <dt className="text-xs text-muted-foreground">{data.address ? "Adresse" : "Où"}</dt>
                  <dd className="mt-0.5 text-foreground">
                    {data.address ? `${data.address}, ` : ""}
                    {data.postal_code ? `${data.postal_code} ` : ""}
                    {data.city}
                    {associationPlaceLabel(data.city, data.departement_name) !== data.city
                      ? `, ${data.departement_name}`
                      : ""}
                  </dd>
                </div>
                {(data.website_url || data.facebook_url || data.instagram_url) && (
                  <div>
                    <dt className="text-xs text-muted-foreground">Liens</dt>
                    <dd className="mt-0.5 flex flex-wrap gap-x-3 gap-y-1">
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
                    </dd>
                  </div>
                )}
                {data.siren && (
                  <div>
                    <dt className="text-xs text-muted-foreground">SIREN</dt>
                    <dd className="mt-0.5 text-foreground">{formatSiren(data.siren)}</dd>
                  </div>
                )}
              </dl>
              <p className="mt-4 text-xs text-muted-foreground">
                Informations vérifiées le {longFrenchDate(data.verified_at)}.
              </p>
            </section>

            {/* 8. Soutenir */}
            {(data.donation_url || data.volunteer_url || data.adoption_url) && (
              <section className="rounded-2xl border border-border bg-pastel-sage/60 p-5">
                <h2 className="font-heading text-xl font-semibold text-pastel-sage-ink">
                  Soutenir {data.name}
                </h2>
                <p className="mt-2 text-sm text-pastel-sage-ink">
                  Le don se fait directement auprès de l'association, sur sa propre page.
                </p>
                <div className="mt-4 flex flex-col gap-2">
                  {data.donation_url && (
                    <Button asChild>
                      <a href={data.donation_url} target="_blank" rel="noopener">
                        Faire un don
                      </a>
                    </Button>
                  )}
                  {data.volunteer_url && (
                    <Button asChild variant="outline" className="bg-background">
                      <a href={data.volunteer_url} target="_blank" rel="noopener">
                        Devenir bénévole
                      </a>
                    </Button>
                  )}
                  {data.adoption_url && (
                    <Button asChild variant="outline" className="bg-background">
                      <a href={data.adoption_url} target="_blank" rel="noopener">
                        Voir les animaux à adopter
                      </a>
                    </Button>
                  )}
                </div>
              </section>
            )}

        {/* 8. Maillage gardiens */}
        {data.departement_slug && (
          <section className="rounded-2xl border border-border bg-pastel-honey/60 p-5">
            <h2 className="font-heading text-xl font-semibold text-foreground">
              Partir en laissant vos animaux entre de bonnes mains
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Bénévoles et familles d'accueil partent aussi en vacances. Sur Guardiens, un gardien du
              coin veille sur votre maison et vos animaux pendant votre absence.
            </p>
            <VolunteerCountByDepartment
              departementCode={data.departement_code}
              className="mt-3"
            />
            <Button asChild size="sm" className="mt-4">
              <Link to={`/departement/${data.departement_slug}`}>
                Trouver un gardien : {data.departement_name}
              </Link>
            </Button>
          </section>
        )}
          </aside>
        </div>

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
