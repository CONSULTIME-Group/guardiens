import { Suspense } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Helmet } from "react-helmet-async";
import { lazyWithRetry } from "@/lib/lazyWithRetry";
import { Button } from "@/components/ui/button";

const SearchSitter = lazyWithRetry(
  () => import("@/components/search/SearchSitter"),
  "SearchSitter",
);
const SearchOwner = lazyWithRetry(
  () => import("@/components/search/SearchOwner"),
  "SearchOwner",
);

const SearchPage = () => {
  const { user, activeRole } = useAuth();

  // Anonymous visitors: show sitter search (browse listings) — SEO + signup conversion
  const showSitterView = !user || activeRole === "sitter";

  return (
    <>
      <Helmet>
        <title>Annonces de garde d'animaux à domicile · Guardiens</title>
        <meta
          name="description"
          content="Découvrez les gardes d'animaux à domicile près de chez vous : chats, chiens, NAC. Inscription gratuite pour postuler."
        />
        <link rel="canonical" href="/search" />
      </Helmet>

      {!user && (
        <div className="sticky top-0 z-40 bg-primary text-primary-foreground border-b border-primary/30">
          <div className="container max-w-6xl mx-auto px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 text-sm">
            <p className="font-medium">
              Vous consultez les annonces en mode visiteur. Inscrivez-vous gratuitement pour postuler, contacter les propriétaires et ajouter aux favoris.
            </p>
            <div className="flex gap-2">
              <Button asChild size="sm" variant="secondary">
                <Link to="/inscription">Inscription gratuite</Link>
              </Button>
              <Button asChild size="sm" variant="ghost" className="text-primary-foreground hover:bg-primary-foreground/10">
                <Link to="/login">Se connecter</Link>
              </Button>
            </div>
          </div>
        </div>
      )}

      <Suspense fallback={null}>
        {showSitterView ? <SearchSitter /> : <SearchOwner />}
      </Suspense>
    </>
  );
};

export default SearchPage;
