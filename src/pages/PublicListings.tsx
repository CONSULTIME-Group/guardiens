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

  // Proof number hero : nombre d'annonces RÉELLEMENT ouvertes (publiées,
  // acceptant des candidatures, non expirées) + nombre de villes distinctes.
  // Doit rester aligné avec ce que voit le visiteur dans la liste.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const todayIso = new Date().toISOString().slice(0, 10);
      const { data, count } = await supabase
        .from("sits")
        .select("city", { count: "exact" })
        .eq("status", "published")
        .eq("accepting_applications", true)
        .gte("end_date", todayIso);
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
  // Eyebrow : on n'affiche le compteur de villes que s'il a un signal réel
  // (>= 2). « 1 ville » est un faux signal qui décrédibilise la promesse.
  const eyebrowDynamic = openCount > 0
    ? citiesCount >= 2
      ? `${openCount} annonces ouvertes · ${citiesCount} villes · mise à jour quotidienne`
      : `${openCount} annonce${openCount > 1 ? "s" : ""} ouverte${openCount > 1 ? "s" : ""} · mise à jour quotidienne`
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
        <section className="max-w-6xl mx-auto px-4 md:px-6 pt-8 md:pt-14 pb-5 md:pb-8">
          <p className="text-xs font-body font-semibold tracking-widest uppercase text-primary/60 mb-4 md:mb-5">
            {eyebrowDynamic}
          </p>
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 md:gap-8">
            <h1 className="font-heading text-3xl md:text-4xl lg:text-5xl font-bold leading-tight text-foreground tracking-tight max-w-3xl">
              {t("public_listings.h1")}
            </h1>
            <nav aria-label="Liens annexes" className="hidden md:flex flex-wrap items-center gap-x-5 gap-y-1 text-sm shrink-0">
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
              {intlCount > 0 && (
                <Link
                  to="/annonces/international"
                  className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors"
                  aria-label={intlLabel}
                >
                  <span className="relative flex h-2 w-2 shrink-0" aria-hidden="true">
                    {intlCount >= 3 && (
                      <span className="absolute inline-flex h-full w-full rounded-full bg-primary opacity-60 animate-ping" />
                    )}
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
                  </span>
                  {intlLabel}
                </Link>
              )}
            </nav>
          </div>
          <p className="mt-4 md:mt-5 text-sm md:text-base text-muted-foreground max-w-2xl leading-relaxed">
            {t("public_listings.subtitle_short")}
          </p>
          {intlCount > 0 && (
            <Link
              to="/annonces/international"
              className="md:hidden mt-4 inline-flex items-center gap-2 rounded-full bg-accent/40 hover:bg-accent/60 border border-border px-3.5 py-2 text-xs transition-colors"
              aria-label={intlLabel}
            >
              <span className="relative flex h-2 w-2 shrink-0" aria-hidden="true">
                {intlCount >= 3 && (
                  <span className="absolute inline-flex h-full w-full rounded-full bg-primary opacity-60 animate-ping" />
                )}
                <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
              </span>
              <span className="text-foreground">{intlLabel}</span>
              <span className="text-muted-foreground" aria-hidden>→</span>
            </Link>
          )}
          <div className="mt-7 md:mt-10 h-px bg-border/60" aria-hidden />
        </section>

        <Suspense
          fallback={
            <div className="max-w-6xl mx-auto px-4 py-12 animate-pulse space-y-6">
              <div className="h-12 rounded-2xl bg-muted w-2/3" />
              <div className="h-64 rounded-3xl bg-muted" />
            </div>
          }
        >
          <SearchSitter mode="public" />
        </Suspense>

        <InternationalShowcase />

        <section aria-labelledby="become-sitter-title" className="max-w-6xl mx-auto px-4 md:px-6 mt-6 md:mt-10">
        <section aria-labelledby="become-sitter-title" className="max-w-6xl mx-auto px-4 md:px-6 mt-10 md:mt-16 mb-10 md:mb-16">
          <div className="rounded-3xl border border-border bg-accent/30 px-6 py-8 md:px-10 md:py-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div className="min-w-0 max-w-xl">
              <p className="text-xs font-body font-semibold tracking-widest uppercase text-primary/60 mb-3">
                {t("public_listings.become_sitter_eyebrow", { defaultValue: "Devenir gardien" })}
              </p>
              <h2 id="become-sitter-title" className="font-heading text-2xl md:text-3xl font-semibold leading-snug text-foreground">
                {t("public_listings.become_sitter_title")}
              </h2>
              <p className="mt-3 text-sm md:text-base text-muted-foreground leading-relaxed">
                {t("public_listings.become_sitter_body")}
              </p>
            </div>
            <Link
              to="/devenir-home-sitter"
              className="shrink-0 inline-flex items-center justify-center gap-1.5 rounded-full bg-primary text-primary-foreground px-8 py-3.5 text-sm font-semibold tracking-wide hover:bg-primary/90 transition-all"
            >
              {t("public_listings.become_sitter_cta")} <span aria-hidden>→</span>
            </Link>
          </div>
        </section>

        {/* Section « Explorer » supprimée : ses 3 colonnes étaient l'exact
            doublon du footer (House-sitting par ville, Ressources, Guides).
            Le footer fait déjà tout le maillage SEO. */}

      </main>

      <PublicFooter />
    </div>
  );
}
