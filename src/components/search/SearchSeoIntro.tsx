/**
 * H1 SEO unique de la page de recherche.
 *
 * Volontairement invisible : les vues SearchOwner ("Trouver un gardien") et
 * SearchSitter ("Annonces de garde") ont chacune leur propre titre visible
 * (en h2 pour ne pas dupliquer le h1). L'eyebrow visuel précédent a été
 * retiré car il flottait au-dessus du hero sans structure claire, et son
 * libellé "Annonces de garde" contredisait la vue gardien.
 */
type Variant = "sitters" | "listings";

const TITLES: Record<Variant, (count?: number) => string> = {
  sitters: (c) =>
    `Trouver un gardien d'animaux à domicile en France${
      typeof c === "number" && c > 0 ? ` — ${c} gardien${c > 1 ? "s" : ""}` : ""
    }`,
  listings: (c) =>
    `Annonces de garde d'animaux à domicile en France${
      typeof c === "number" && c > 0 ? ` — ${c} annonce${c > 1 ? "s" : ""}` : ""
    }`,
};

const SearchSeoIntro = ({
  resultsCount,
  variant = "listings",
}: {
  resultsCount?: number;
  variant?: Variant;
}) => {
  return (
    <h1 className="sr-only">{TITLES[variant](resultsCount)}</h1>
  );
};

export default SearchSeoIntro;
