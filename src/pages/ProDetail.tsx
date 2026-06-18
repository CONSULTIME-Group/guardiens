import { useEffect, useState } from "react";
import { useParams, Link, useSearchParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import { useAdmin } from "@/hooks/useAdmin";
import { getCategoryByValue, getProInitials } from "@/lib/proCategories";
import ObfuscatedEmail from "@/components/pros/ObfuscatedEmail";
import ProReviews from "@/components/pros/ProReviews";
import ProContactCTA from "@/components/pros/ProContactCTA";
import SimilarPros from "@/components/pros/SimilarPros";
import GoogleRatingInline from "@/components/pros/GoogleRatingInline";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

function formatPriceRange(min: number | null, max: number | null): string | null {
  if (min != null && max != null) return `${min} € à ${max} €`;
  if (min != null) return `À partir de ${min} €`;
  if (max != null) return `Jusqu'à ${max} €`;
  return null;
}

export default function ProDetail() {
  const { slug } = useParams<{ slug: string }>();
  const [searchParams] = useSearchParams();
  const { isAdmin } = useAdmin();
  const isPreview = searchParams.get("preview") === "1" && isAdmin;
  const [pro, setPro] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!slug) return;
    (async () => {
      setLoading(true);
      let req = supabase
        .from("pro_profiles")
        .select(
          "id, slug, raison_sociale, category, sub_categories, city, postal_code, description, phone, website, email_contact, urgences_24_7, siret_verified, logo_url, cover_url, tarif_min, tarif_max, tarif_note, horaires, diplomes, ordre_number, zone_radius_km, zone_cities, status, rating_avg, rating_count, google_place_id"
        )
        .eq("slug", slug);
      if (!isPreview) req = req.eq("status", "approved");
      const { data } = await req.maybeSingle();
      setPro(data);
      setLoading(false);
      if (data && (data as any).status === "approved" && !isPreview) {
        supabase.rpc("increment_pro_view" as any, { _slug: slug }).then(() => {});
      }
    })();
  }, [slug, isPreview, reloadKey]);

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-10 max-w-4xl min-w-0">
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (!pro) {
    return (
      <div className="container mx-auto px-4 py-20 max-w-2xl text-center min-w-0">
        <h1 className="text-2xl font-bold mb-3">Fiche introuvable</h1>
        <p className="text-muted-foreground mb-6">
          Cette fiche n'existe pas ou n'a pas encore été validée.
        </p>
        <Button asChild>
          <Link to="/pros">Voir l'annuaire</Link>
        </Button>
      </div>
    );
  }

  const cat = getCategoryByValue(pro.category);
  const title = `${pro.raison_sociale}, ${cat?.label}${pro.city ? `, ${pro.city}` : ""}`;
  const canonical = `https://guardiens.fr/pros/${pro.slug}`;
  const priceRangeDisplay = formatPriceRange(
    pro.tarif_min != null ? Number(pro.tarif_min) : null,
    pro.tarif_max != null ? Number(pro.tarif_max) : null,
  );

  const localBusinessJsonLd: any = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: pro.raison_sociale,
    description: pro.description ?? cat?.label,
    url: canonical,
    ...(pro.phone ? { telephone: pro.phone } : {}),
    ...(pro.email_contact ? { email: pro.email_contact } : {}),
    ...(pro.logo_url ? { image: pro.logo_url, logo: pro.logo_url } : {}),
    ...(pro.website ? { sameAs: [pro.website] } : {}),
    address: {
      "@type": "PostalAddress",
      ...(pro.city ? { addressLocality: pro.city } : {}),
      ...(pro.postal_code ? { postalCode: pro.postal_code } : {}),
      addressCountry: "FR",
    },
    ...(priceRangeDisplay ? { priceRange: priceRangeDisplay } : {}),
    ...(pro.horaires?.text ? { openingHours: pro.horaires.text } : {}),
    ...(pro.rating_count > 0 && pro.rating_avg
      ? {
          aggregateRating: {
            "@type": "AggregateRating",
            ratingValue: Number(pro.rating_avg).toFixed(1),
            reviewCount: pro.rating_count,
            bestRating: 5,
            worstRating: 1,
          },
        }
      : {}),
  };

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Accueil", item: "https://guardiens.fr/" },
      { "@type": "ListItem", position: 2, name: "Pros animaliers", item: "https://guardiens.fr/pros" },
      ...(cat?.slug
        ? [{ "@type": "ListItem", position: 3, name: cat.label, item: `https://guardiens.fr/pros/categorie/${cat.slug}` }]
        : []),
      { "@type": "ListItem", position: cat?.slug ? 4 : 3, name: pro.raison_sociale, item: canonical },
    ],
  };

  return (
    <div className="min-h-screen bg-background pb-24 md:pb-10">
      <Helmet>
        <title>{title} | Guardiens</title>
        <meta
          name="description"
          content={pro.description?.slice(0, 155) ?? `${cat?.label} ${pro.city ?? ""}`}
        />
        {isPreview || pro.status !== "approved" ? (
          <meta name="robots" content="noindex,nofollow" />
        ) : null}
        <link rel="canonical" href={canonical} />
        <meta property="og:title" content={title} />
        <meta property="og:url" content={canonical} />
        <meta property="og:type" content="profile" />
        {pro.logo_url && <meta property="og:image" content={pro.logo_url} />}
        {pro.status === "approved" && !isPreview && (
          <>
            <script type="application/ld+json">{JSON.stringify(localBusinessJsonLd)}</script>
            <script type="application/ld+json">{JSON.stringify(breadcrumbJsonLd)}</script>
          </>
        )}
      </Helmet>

      {isPreview && pro.status !== "approved" && (
        <div className="bg-amber-100 text-amber-900 text-sm py-2 px-4 text-center">
          Prévisualisation admin : fiche en statut <strong>{pro.status}</strong> (non publiée).
        </div>
      )}

      {pro.cover_url && (
        <div className="w-full h-48 md:h-64 bg-muted overflow-hidden">
          <img
            src={pro.cover_url}
            alt={`Couverture ${pro.raison_sociale}`}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        </div>
      )}

      <main className="container mx-auto px-4 py-6 md:py-10 max-w-4xl min-w-0">
        {/* Fil d'Ariane visible */}
        <nav aria-label="Fil d'Ariane" className="text-xs text-muted-foreground mb-4">
          <ol className="flex flex-wrap items-center gap-1">
            <li><Link to="/" className="hover:underline">Accueil</Link></li>
            <li aria-hidden>›</li>
            <li><Link to="/pros" className="hover:underline">Pros</Link></li>
            {cat?.slug && (
              <>
                <li aria-hidden>›</li>
                <li><Link to={`/pros/categorie/${cat.slug}`} className="hover:underline">{cat.label}</Link></li>
              </>
            )}
            <li aria-hidden>›</li>
            <li className="text-foreground truncate max-w-[200px]" aria-current="page">{pro.raison_sociale}</li>
          </ol>
        </nav>

        <div className="flex items-start gap-3 md:gap-5 mb-4">
          {pro.logo_url ? (
            <img
              src={pro.logo_url}
              alt={`Logo ${pro.raison_sociale}`}
              className="w-16 h-16 md:w-24 md:h-24 rounded-xl object-contain bg-muted"
            />
          ) : (
            <div
              className={`w-16 h-16 md:w-24 md:h-24 rounded-xl flex items-center justify-center font-semibold text-xl md:text-2xl ${cat?.placeholderClass ?? "bg-muted text-muted-foreground"}`}
              aria-hidden="true"
            >
              {getProInitials(pro.raison_sociale)}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl md:text-3xl font-display font-bold">{pro.raison_sociale}</h1>
            <p className="text-muted-foreground mt-1">
              {cat?.label}
              {pro.city ? ` · ${pro.city}` : ""}
            </p>
            <div className="flex flex-wrap items-center gap-2 mt-3">
              {pro.rating_count > 0 && (
                <a href="#pro-reviews-heading" className="inline-flex items-center gap-1 text-sm hover:underline">
                  <span className="text-amber-500" aria-hidden>★</span>
                  <span className="font-medium">{Number(pro.rating_avg ?? 0).toFixed(1)}</span>
                  <span className="text-muted-foreground">({pro.rating_count})</span>
                </a>
              )}
              {pro.google_place_id && (
                <GoogleRatingInline proId={pro.id} placeId={pro.google_place_id} />
              )}
              {pro.urgences_24_7 && <Badge variant="secondary">Urgences 24/7</Badge>}
              {pro.siret_verified && <Badge variant="secondary">SIRET vérifié</Badge>}
            </div>
            <ProContactCTA
              phone={pro.phone}
              email={pro.email_contact}
              website={pro.website}
              urgences24_7={pro.urgences_24_7}
            />
          </div>
        </div>

        {pro.description && (
          <Card className="mb-6">
            <CardContent className="p-6 whitespace-pre-line">{pro.description}</CardContent>
          </Card>
        )}

        <div className="grid md:grid-cols-2 gap-4">
          {(pro.phone || pro.website || pro.email_contact) && (
            <Card>
              <CardContent className="p-6 space-y-2">
                <h2 className="font-semibold mb-2">Contact</h2>
                {pro.phone && (
                  <p>
                    Téléphone :{" "}
                    <a href={`tel:${pro.phone.replace(/\s+/g, "")}`} className="underline">
                      {pro.phone}
                    </a>
                  </p>
                )}
                {pro.email_contact && <ObfuscatedEmail email={pro.email_contact} />}
                {pro.website && (
                  <p>
                    Site :{" "}
                    <a
                      href={pro.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline break-all"
                    >
                      {pro.website}
                    </a>
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          {(priceRangeDisplay || pro.tarif_note) && (
            <Card>
              <CardContent className="p-6 space-y-2">
                <h2 className="font-semibold mb-2">Tarifs indicatifs</h2>
                {priceRangeDisplay && <p>{priceRangeDisplay}</p>}
                {pro.tarif_note && (
                  <p className="text-sm text-muted-foreground">{pro.tarif_note}</p>
                )}
              </CardContent>
            </Card>
          )}

          {pro.horaires?.text && (
            <Card>
              <CardContent className="p-6 space-y-2">
                <h2 className="font-semibold mb-2">Horaires</h2>
                <p className="whitespace-pre-line text-sm">{pro.horaires.text}</p>
              </CardContent>
            </Card>
          )}

          {Array.isArray(pro.diplomes) && pro.diplomes.length > 0 && (
            <Card>
              <CardContent className="p-6 space-y-2">
                <h2 className="font-semibold mb-2">Diplômes et certifications</h2>
                <ul className="list-disc list-inside text-sm space-y-1">
                  {pro.diplomes.map((d: string, i: number) => <li key={i}>{d}</li>)}
                </ul>
              </CardContent>
            </Card>
          )}

          {(pro.ordre_number || pro.zone_radius_km) && (
            <Card>
              <CardContent className="p-6 space-y-2 text-sm">
                {pro.ordre_number && <p>N° Ordre : {pro.ordre_number}</p>}
                {pro.zone_radius_km && (
                  <p>Zone d'intervention : {pro.zone_radius_km} km autour de {pro.city ?? "la ville indiquée"}</p>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {pro.status === "approved" && pro.google_place_id && (
          <GoogleReviewsBlock proId={pro.id} placeId={pro.google_place_id} />
        )}

        {pro.status === "approved" && (
          <ProReviews
            proId={pro.id}
            proName={pro.raison_sociale}
            ratingAvg={pro.rating_avg}
            ratingCount={pro.rating_count ?? 0}
            onRefresh={() => setReloadKey((k) => k + 1)}
          />
        )}

        {pro.status === "approved" && (
          <SimilarPros currentId={pro.id} category={pro.category} city={pro.city} />
        )}
      </main>
    </div>
  );
}
