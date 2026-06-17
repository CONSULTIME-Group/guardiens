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
        <section className="max-w-6xl mx-auto px-4 md:px-6 pt-3 md:pt-5 pb-2 md:pb-3">
          <p className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground mb-1.5 md:mb-2">
            {eyebrowDynamic}
          </p>
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3 md:gap-6">
            <h1 className="font-heading text-2xl md:text-3xl lg:text-4xl font-medium leading-tight text-foreground tracking-tight max-w-3xl">
              {t("public_listings.h1")}
            </h1>
            <nav aria-label="Liens annexes" className="hidden md:flex flex-wrap items-center gap-x-4 gap-y-1 text-sm shrink-0">
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
          <p className="hidden md:block mt-2 text-sm text-muted-foreground max-w-2xl leading-relaxed">
            {t("public_listings.subtitle_short")}
          </p>
          {intlCount > 0 && (
            <Link
              to="/annonces/international"
              className="md:hidden mt-3 inline-flex items-center gap-2 rounded-full bg-accent/40 hover:bg-accent/60 border border-border px-3 py-1.5 text-xs transition-colors"
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
          <div className="rounded-2xl border border-border bg-accent/30 px-5 py-5 md:px-7 md:py-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="min-w-0">
              <h2 id="become-sitter-title" className="font-heading text-lg md:text-xl font-medium text-foreground">
                {t("public_listings.become_sitter_title")}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {t("public_listings.become_sitter_body")}
              </p>
            </div>
            <Link
              to="/devenir-home-sitter"
              className="shrink-0 inline-flex items-center justify-center gap-1.5 rounded-full bg-primary text-primary-foreground px-5 py-2.5 text-sm font-semibold hover:opacity-90 transition-opacity"
            >
              {t("public_listings.become_sitter_cta")} <span aria-hidden>→</span>
            </Link>
          </div>
        </section>

        <section aria-labelledby="explore-title" className="border-t border-border/60 mt-8 md:mt-12">
          <div className="max-w-6xl mx-auto px-4 md:px-6 py-6 md:py-10">
            <h2 id="explore-title" className="font-heading text-xl font-medium text-foreground mb-5">
              Explorer les annonces autrement
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8 text-sm">
              <div>
                <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground mb-3">Par ville</p>
                <ul className="space-y-1.5">
                  <li><Link to="/house-sitting/lyon" className="text-foreground hover:text-primary transition-colors">House-sitting à Lyon</Link></li>
                  <li><Link to="/house-sitting/annecy" className="text-foreground hover:text-primary transition-colors">House-sitting à Annecy</Link></li>
                  <li><Link to="/house-sitting/grenoble" className="text-foreground hover:text-primary transition-colors">House-sitting à Grenoble</Link></li>
                  <li><Link to="/house-sitting/chambery" className="text-foreground hover:text-primary transition-colors">House-sitting à Chambéry</Link></li>
                  <li><Link to="/annonces/international" className="text-muted-foreground hover:text-foreground transition-colors">Annonces hors France →</Link></li>
                </ul>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground mb-3">À découvrir</p>
                <ul className="space-y-1.5">
                  <li>
                    <Link to="/petites-missions" className="text-foreground hover:text-primary transition-colors">
                      {t("public_listings.explore_missions")}
                    </Link>
                    <span className="text-muted-foreground">{t("public_listings.explore_missions_desc")}</span>
                  </li>
                  <li>
                    <Link to="/guides-locaux" className="text-foreground hover:text-primary transition-colors">
                      {t("public_listings.local_guides")}
                    </Link>
                    <span className="text-muted-foreground">{t("public_listings.explore_guides_desc")}</span>
                  </li>
                  <li>
                    <Link to="/tarifs" className="text-foreground hover:text-primary transition-colors">
                      {t("public_listings.explore_pricing")}
                    </Link>
                    <span className="text-muted-foreground">, gratuit jusqu'au 14 juillet 2026</span>
                  </li>
                </ul>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground mb-3">Côté gardien</p>
                <ul className="space-y-1.5">
                  <li><Link to="/devenir-home-sitter" className="text-foreground hover:text-primary transition-colors">Devenir gardien</Link></li>
                  <li><Link to="/c-est-quoi-le-house-sitting" className="text-foreground hover:text-primary transition-colors">C'est quoi le house-sitting ?</Link></li>
                  <li><Link to="/articles" className="text-foreground hover:text-primary transition-colors">Le journal</Link></li>
                </ul>
              </div>
            </div>
          </div>
        </section>
      </main>

      <PublicFooter />
    </div>
  );
}
