/**
 * H1 SEO unique de /recherche, réduit à un eyebrow d'une ligne pour se
 * fondre dans le hero de recherche juste en dessous (pas de bordure, pas
 * de bloc autonome). Le H1 reste dans le DOM pour Googlebot mais n'occupe
 * plus de hauteur visuelle significative.
 */
const SearchSeoIntro = ({ resultsCount }: { resultsCount?: number }) => {
  return (
    <header className="bg-background">
      <div className="container max-w-6xl mx-auto px-4 pt-3 md:pt-4 pb-1">
        <p className="text-[10px] md:text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          Recherche · Annonces de garde
        </p>
        <h1 className="sr-only">
          Annonces de garde d'animaux à domicile en France
          {typeof resultsCount === "number" && resultsCount > 0
            ? ` — ${resultsCount} annonce${resultsCount > 1 ? "s" : ""}`
            : ""}
        </h1>
      </div>
    </header>
  );
};

export default SearchSeoIntro;
