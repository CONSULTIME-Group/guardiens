// Page publique éditoriale — toutes les annonces de garde ouvertes.
// Réutilise le moteur de recherche complet (SearchSitter) — filtres,
// département/ville/critères + carte live — mais dans un shell public
// (header + footer), sans la sidebar dashboard.
import { Suspense } from "react";
import { Helmet } from "react-helmet-async";
import PublicHeader from "@/components/layout/PublicHeader";
import PublicFooter from "@/components/layout/PublicFooter";
import { lazyWithRetry } from "@/lib/lazyWithRetry";

const SearchSitter = lazyWithRetry(
  () => import("@/components/search/SearchSitter"),
  "SearchSitter",
);

const CANONICAL = "https://guardiens.fr/annonces";
const TITLE = "Annonces de garde d'animaux à domicile en France | Guardiens";
const DESCRIPTION =
  "Toutes les annonces de garde de chats, chiens et NAC à domicile, partout en France. Filtres par ville, département et critères, carte en direct. Consultation libre, inscription gratuite pour postuler.";

const JSONLD = [
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
];

export default function PublicListings() {
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
        <meta property="og:locale" content="fr_FR" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={TITLE} />
        <meta name="twitter:description" content={DESCRIPTION} />
        <script type="application/ld+json">{JSON.stringify(JSONLD)}</script>
      </Helmet>

      <PublicHeader />

      <main id="main-content" className="flex-1 min-w-0" role="main">
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
      </main>

      <PublicFooter />
    </div>
  );
}
