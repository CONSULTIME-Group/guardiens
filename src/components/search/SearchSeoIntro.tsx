/**
 * Bloc éditorial SEO en tête de /recherche.
 *
 * Visible pour tous les visiteurs (anonymes ET connectés), léger, n'écrase
 * pas l'ergonomie outil. Sert deux objectifs :
 *  - SEO : porter le H1 unique de la page + un paragraphe descriptif riche
 *    en mots-clés (« annonces de garde d'animaux à domicile en France »).
 *  - UX : poser le contexte avant la barre de recherche, surtout pour les
 *    visiteurs anonymes qui arrivent via Google.
 *
 * Le H1 est dans le DOM dès le premier paint (pas de rendu conditionnel
 * sur user / activeRole), ce qui garantit que Googlebot le voit.
 */
const SearchSeoIntro = ({ resultsCount }: { resultsCount?: number }) => {
  return (
    <header className="border-b border-border bg-background">
      <div className="container max-w-6xl mx-auto px-4 py-6 md:py-8">
        <h1 className="font-display text-2xl md:text-3xl font-semibold text-foreground leading-tight">
          Annonces de garde d'animaux à domicile en France
        </h1>
        <p className="mt-2 text-sm md:text-base text-muted-foreground max-w-3xl">
          {typeof resultsCount === "number" && resultsCount > 0 ? (
            <>
              <span className="font-medium text-foreground">{resultsCount} annonce{resultsCount > 1 ? "s" : ""}</span>{" "}
              de garde de chats, chiens et NAC à domicile, partout en France.
              Consultation libre, inscription gratuite pour postuler.
            </>
          ) : (
            <>
              Trouvez une garde de chats, chiens ou NAC à domicile partout en France.
              Consultation libre, inscription gratuite pour postuler.
            </>
          )}
        </p>
      </div>
    </header>
  );
};

export default SearchSeoIntro;
