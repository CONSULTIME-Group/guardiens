/**
 * H1 SEO unique de /recherche, compact et sobre pour ne pas alourdir la
 * hiérarchie visuelle au-dessus de la barre de recherche.
 *
 * Le H1 reste dans le DOM au premier paint pour Googlebot, mais la copie
 * est resserrée : une ligne titre + une ligne descriptive courte.
 */
const SearchSeoIntro = ({ resultsCount }: { resultsCount?: number }) => {
  return (
    <header className="border-b border-border bg-background">
      <div className="container max-w-6xl mx-auto px-4 py-3 md:py-4">
        <h1 className="font-display text-lg md:text-xl font-semibold text-foreground leading-tight">
          Annonces de garde d'animaux à domicile en France
        </h1>
        <p className="mt-1 text-xs md:text-sm text-muted-foreground max-w-3xl">
          {typeof resultsCount === "number" && resultsCount > 0 ? (
            <>
              <span className="font-medium text-foreground">{resultsCount} annonce{resultsCount > 1 ? "s" : ""}</span>{" "}
              de garde de chats, chiens et NAC. Consultation libre.
            </>
          ) : (
            <>Chats, chiens, NAC. Consultation libre, inscription gratuite pour postuler.</>
          )}
        </p>
      </div>
    </header>
  );
};

export default SearchSeoIntro;
