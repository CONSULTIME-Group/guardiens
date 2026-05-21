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

export default function PublicListings() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <Helmet>
        <title>Annonces de garde en cours — Guardiens</title>
        <meta
          name="description"
          content="Découvrez les annonces de garde en cours partout en France. Filtres par ville, département, critères, et carte en direct. Consultation libre, inscription gratuite pour postuler."
        />
        <link rel="canonical" href="https://guardiens.fr/annonces" />
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
