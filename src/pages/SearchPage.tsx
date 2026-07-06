import { Suspense } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Helmet } from "react-helmet-async";
import { lazyWithRetry } from "@/lib/lazyWithRetry";
import { Button } from "@/components/ui/button";
import SearchSeoIntro from "@/components/search/SearchSeoIntro";
import SearchSeoFooter, { SEARCH_FAQ } from "@/components/search/SearchSeoFooter";
import SearchHowItWorksAnon from "@/components/search/SearchHowItWorksAnon";
import { useAlmaCulturalFact } from "@/hooks/useAlmaCulturalFact";

const SearchSitter = lazyWithRetry(
  () => import("@/components/search/SearchSitter"),
  "SearchSitter",
);
const SearchOwner = lazyWithRetry(
  () => import("@/components/search/SearchOwner"),
  "SearchOwner",
);

const CANONICAL = "https://guardiens.fr/annonces";
const TITLE = "Annonces de garde d'animaux à domicile en France · Guardiens";
const DESCRIPTION =
  "Découvrez toutes les annonces de garde de chats, chiens et NAC à domicile, partout en France. Consultation libre, inscription gratuite pour postuler.";

const SearchPage = () => {
  const { user, activeRole } = useAuth();

  // Anonymous visitors and sitter role: show sitter search (browse listings).
  const showSitterView = !user || activeRole === "sitter";

  // JSON-LD : WebPage + BreadcrumbList + FAQPage. L'ItemList n'est pas
  // matérialisé ici car les annonces sont chargées côté client (Googlebot
  // les voit après hydratation, le maillage interne via /sits/:id suffit).
  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "WebPage",
      name: TITLE,
      description: DESCRIPTION,
      url: CANONICAL,
      inLanguage: "fr-FR",
      isPartOf: { "@type": "WebSite", name: "Guardiens", url: "https://guardiens.fr" },
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Accueil", item: "https://guardiens.fr/" },
        { "@type": "ListItem", position: 2, name: "Annonces de garde", item: CANONICAL },
      ],
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: SEARCH_FAQ.map((f) => ({
        "@type": "Question",
        name: f.q,
        acceptedAnswer: { "@type": "Answer", text: f.a },
      })),
    },
  ];

  return (
    <>
      <Helmet>
        <title>{TITLE}</title>
        <meta name="description" content={DESCRIPTION} />
        <meta name="robots" content="index,follow" />
        <link rel="canonical" href={CANONICAL} />
        <meta property="og:title" content={TITLE} />
        <meta property="og:description" content={DESCRIPTION} />
        <meta property="og:url" content={CANONICAL} />
        <meta property="og:type" content="website" />
        <meta property="og:locale" content="fr_FR" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={TITLE} />
        <meta name="twitter:description" content={DESCRIPTION} />
        <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
      </Helmet>

      {/* H1 SEO invisible, contextualisé selon la vue (gardiens vs annonces).
          Les h2 visibles des vues SearchOwner/SearchSitter restent la seule
          titraille visuelle du hero pour éviter le doublon d'eyebrow. */}
      <SearchSeoIntro variant={showSitterView ? "listings" : "sitters"} />

      {/* Bandeau visiteur, discret, non sticky pour préserver le viewport mobile.
          Hiérarchie : libellé "Consultation libre" + bénéfice clair + CTA primaire. */}
      {!user && (
        <div className="bg-primary/5 border-b border-primary/20">
          <div className="container max-w-6xl mx-auto px-4 py-2.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-x-4 gap-y-2 text-sm">
            <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-2 min-w-0">
              <span className="inline-flex items-center rounded-full bg-primary/15 text-primary px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide self-start shrink-0">
                Consultation libre
              </span>
              <p className="text-foreground/90 sm:truncate">
                Inscrivez-vous pour postuler, échanger et sauvegarder vos favoris.
              </p>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <Button asChild size="sm" className="h-8">
                <Link to="/inscription">Inscription gratuite</Link>
              </Button>
              <Button asChild size="sm" variant="ghost" className="h-8">
                <Link to="/login">Se connecter</Link>
              </Button>
            </div>
          </div>
        </div>
      )}

      <Suspense fallback={null}>
        {showSitterView ? <SearchSitter /> : <SearchOwner />}
      </Suspense>

      {/* Pédagogie + rassurance + CTA (anon uniquement) puis maillage interne + FAQ.
          Les membres connectés voient la page outil épurée. */}
      {!user && (
        <>
          <SearchHowItWorksAnon />
          <SearchSeoFooter />
        </>
      )}
    </>
  );
};

export default SearchPage;
