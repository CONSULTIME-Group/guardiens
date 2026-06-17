// Page publique éditoriale, toutes les annonces de garde ouvertes.
// Réutilise le moteur de recherche complet (SearchSitter), filtres,
// département/ville/critères + carte live, mais dans un shell public
// (header + footer), sans la sidebar dashboard.
import { Suspense, useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import PublicHeader from "@/components/layout/PublicHeader";
import PublicFooter from "@/components/layout/PublicFooter";
import { lazyWithRetry } from "@/lib/lazyWithRetry";
import { supabase } from "@/integrations/supabase/client";
import InternationalShowcase from "@/components/listings/InternationalShowcase";

const SearchSitter = lazyWithRetry(
  () => import("@/components/search/SearchSitter"),
  "SearchSitter",
);

const CANONICAL = "https://guardiens.fr/annonces";

export default function PublicListings() {
  const { t, i18n } = useTranslation();
  const [itemListLd, setItemListLd] = useState<any | null>(null);
  const [intlCount, setIntlCount] = useState<number>(0);
  const [openCount, setOpenCount] = useState<number>(0);
  const [citiesCount, setCitiesCount] = useState<number>(0);

  const TITLE = t("public_listings.meta_title");
  const DESCRIPTION = t("public_listings.meta_description");
  const BREADCRUMB_HOME = t("breadcrumb.home", { defaultValue: "Accueil" });
  const BREADCRUMB_LISTINGS = t("nav.listings", { defaultValue: "Annonces de garde" });

  const BASE_JSONLD = [
    {
      "@context": "https://schema.org",
      "@type": "WebPage",
      name: TITLE,
      description: DESCRIPTION,
      url: CANONICAL,
      inLanguage: i18n.language,
      isPartOf: { "@type": "WebSite", name: "Guardiens", url: "https://guardiens.fr" },
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: BREADCRUMB_HOME, item: "https://guardiens.fr/" },
        { "@type": "ListItem", position: 2, name: BREADCRUMB_LISTINGS, item: CANONICAL },
      ],
    },
  ];

  // Compte les annonces hors France pour piloter l'indicateur "radar".
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { count } = await supabase
        .from("sits")
        .select("id", { count: "exact", head: true })
        .eq("status", "published")
        .not("country", "is", null)
        .neq("country", "FR");
      if (!cancelled) setIntlCount(count || 0);
    })();
    return () => { cancelled = true; };
  }, []);

  // Proof number hero : nombre d'annonces ouvertes + nombre de villes distinctes.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data, count } = await supabase
        .from("sits")
        .select("city", { count: "exact" })
        .eq("status", "published")
        .eq("accepting_applications", true);
      if (cancelled) return;
      setOpenCount(count || 0);
      const cities = new Set(
        (data || [])
          .map((r: any) => (r.city || "").trim().toLowerCase())
          .filter(Boolean),
      );
      setCitiesCount(cities.size);
    })();
    return () => { cancelled = true; };
  }, []);

  // ItemList JSON-LD pour Google
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("sits")
        .select("id, title")
        .eq("status", "published")
        .order("created_at", { ascending: false })
        .limit(20);
      if (cancelled || !data || data.length === 0) return;
      setItemListLd({
        "@context": "https://schema.org",
        "@type": "ItemList",
        name: TITLE,
        url: CANONICAL,
        numberOfItems: data.length,
        itemListElement: data.map((s: any, i: number) => ({
          "@type": "ListItem",
          position: i + 1,
          url: `https://guardiens.fr/annonces/${s.id}`,
          name: s.title || BREADCRUMB_LISTINGS,
        })),
      });
    })();
    return () => { cancelled = true; };
  }, [TITLE, BREADCRUMB_LISTINGS]);

  const jsonld = itemListLd ? [...BASE_JSONLD, itemListLd] : BASE_JSONLD;
  const intlLabel = t("public_listings.intl_count", { count: intlCount, defaultValue: `${intlCount} listings outside France` });
  const eyebrowDynamic = openCount > 0 && citiesCount > 0
    ? t("public_listings.eyebrow_stats", { count: openCount, cities: citiesCount, defaultValue: `${openCount} annonces ouvertes · ${citiesCount} villes` })
    : t("public_listings.eyebrow");

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <Helmet>
        <title>{TITLE}</title>
        <meta name="description" content={DESCRIPTION} />
        <meta name="robots" content="index,follow" />
        <link rel="canonical" href={CANONICAL} />
        <meta property="og:type" content="website" />
        <meta property="og:url" content={CANONICAL} />
        <meta property="og:title" content={TITLE} />
        <meta property="og:description" content={DESCRIPTION} />
        <meta property="og:site_name" content="Guardiens" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={TITLE} />
        <meta name="twitter:description" content={DESCRIPTION} />
        <script type="application/ld+json">{JSON.stringify(jsonld)}</script>
      </Helmet>

      <PublicHeader />

      <main id="main-content" className="flex-1 min-w-0" role="main">
        <section className="max-w-6xl mx-auto px-4 md:px-6 pt-5 md:pt-10 pb-3 md:pb-6">
          <p className="hidden md:block text-[11px] uppercase tracking-[0.22em] text-muted-foreground mb-3">
            {t("public_listings.eyebrow")}
          </p>
          <h1 className="font-heading text-3xl md:text-4xl lg:text-5xl font-medium leading-tight text-foreground tracking-tight max-w-3xl">
            {t("public_listings.h1")}
          </h1>
          <p className="mt-4 text-base md:text-lg text-muted-foreground max-w-2xl leading-relaxed">
            {t("public_listings.subtitle")}
          </p>
          <nav aria-label={t("public_listings.see_also_missions")} className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
            <Link
              to="/petites-missions"
              className="inline-flex items-center gap-1.5 text-primary font-semibold hover:underline underline-offset-4"
            >
              {t("public_listings.see_also_missions")} <span aria-hidden>→</span>
            </Link>
            <Link
              to="/guides-locaux"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              {t("public_listings.local_guides")}
            </Link>
            <Link
              to="/tarifs"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              {t("public_listings.pricing")}
            </Link>
          </nav>

          {intlCount > 0 && (
            <Link
              to="/annonces/international"
              className="mt-5 inline-flex items-center gap-2.5 rounded-full bg-accent/40 hover:bg-accent/60 border border-border px-4 py-2 text-sm transition-colors group"
              aria-label={intlLabel}
            >
              <span className="relative flex h-2.5 w-2.5 shrink-0" aria-hidden="true">
                <span className="absolute inline-flex h-full w-full rounded-full bg-primary opacity-60 animate-ping" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-primary" />
              </span>
              <span className="text-foreground">{intlLabel}</span>
              <span className="text-muted-foreground group-hover:text-foreground transition-colors" aria-hidden>→</span>
            </Link>
          )}
        </section>

        <InternationalShowcase />

        <Suspense
          fallback={
            <div className="max-w-6xl mx-auto px-4 py-12 animate-pulse space-y-6">
              <div className="h-12 rounded-2xl bg-muted w-2/3" />
              <div className="h-64 rounded-3xl bg-muted" />
            </div>
          }
        >
          <SearchSitter />
        </Suspense>

        <section className="border-t border-border/60 mt-8 md:mt-12">
          <div className="max-w-6xl mx-auto px-4 md:px-6 py-5 md:py-10">
            <h2 className="font-heading text-xl font-medium text-foreground mb-4">
              {t("public_listings.explore_title")}
            </h2>
            <ul className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-sm">
              <li>
                <Link to="/petites-missions" className="group inline-flex items-baseline gap-2 text-foreground hover:text-primary transition-colors">
                  <span className="font-medium">{t("public_listings.explore_missions")}</span>
                  <span className="text-muted-foreground">{t("public_listings.explore_missions_desc")}</span>
                </Link>
              </li>
              <li>
                <Link to="/guides-locaux" className="group inline-flex items-baseline gap-2 text-foreground hover:text-primary transition-colors">
                  <span className="font-medium">{t("public_listings.local_guides")}</span>
                  <span className="text-muted-foreground">{t("public_listings.explore_guides_desc")}</span>
                </Link>
              </li>
              <li>
                <Link to="/tarifs" className="group inline-flex items-baseline gap-2 text-foreground hover:text-primary transition-colors">
                  <span className="font-medium">{t("public_listings.explore_pricing")}</span>
                  <span className="text-muted-foreground">{t("public_listings.explore_pricing_desc")}</span>
                </Link>
              </li>
              <li>
                <Link to="/annonces/international" className="group inline-flex items-baseline gap-2 text-foreground hover:text-primary transition-colors">
                  <span className="font-medium">{t("public_listings.explore_intl")}</span>
                  <span className="text-muted-foreground">{t("public_listings.explore_intl_desc")}</span>
                </Link>
              </li>
            </ul>
          </div>
        </section>
      </main>

      <PublicFooter />
    </div>
  );
}
