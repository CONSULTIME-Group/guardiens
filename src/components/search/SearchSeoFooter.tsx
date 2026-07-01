/**
 * Section éditoriale SEO bas de /recherche : maillage interne vers les hubs
 * villes/départements + FAQ structurée.
 *
 * Affichée uniquement aux visiteurs anonymes (conversion + SEO). Les
 * utilisateurs connectés voient une page outil épurée. Le JSON-LD FAQPage
 * est porté par SearchPage (Helmet) pour rester rendu côté serveur.
 *
 * Lien interne : on pointe vers les 3 hubs SEO réels (Lyon / Annecy /
 * Grenoble), pas de mention régionale (proscrit AURA).
 */
import { Link } from "react-router-dom";

const HUB_CITIES = [
  { slug: "lyon", name: "Lyon" },
  { slug: "annecy", name: "Annecy" },
  { slug: "grenoble", name: "Grenoble" },
  { slug: "chambery", name: "Chambéry" },
];

export const SEARCH_FAQ = [
  {
    q: "Comment fonctionne la garde d'animaux à domicile sur Guardiens ?",
    a: "Les propriétaires publient une annonce avec leurs dates et leurs animaux. Les gardiens consultent les annonces librement, postulent, échangent par messagerie, puis se rencontrent avant de confirmer la garde d'un commun accord.",
  },
  {
    q: "Combien coûte la consultation des annonces ?",
    a: "La consultation est libre et gratuite, même sans compte. L'inscription est gratuite pour postuler à une annonce. L'espace propriétaire reste gratuit. L'espace gardien est gratuit jusqu'au 30 septembre 2026, puis 6,99 € par mois sans engagement.",
  },
  {
    q: "Quels animaux peut-on faire garder ?",
    a: "Chats, chiens, NAC (rongeurs, oiseaux, reptiles), poissons, poules et animaux de basse-cour. Le propriétaire précise les espèces et le nombre dans son annonce.",
  },
  {
    q: "Le gardien dort-il chez le propriétaire ?",
    a: "Oui. La garde à domicile signifie que le gardien s'installe chez le propriétaire pendant son absence, prend soin des animaux dans leur environnement habituel et veille sur la maison.",
  },
  {
    q: "Comment être sûr que le gardien est fiable ?",
    a: "Chaque profil affiche un score de confiance, les avis vérifiés des gardes précédentes, les badges obtenus, l'ancienneté et l'expérience animale. Une vérification d'identité est proposée à tous les membres.",
  },
];

const SearchSeoFooter = () => (
  <section
    aria-labelledby="search-seo-heading"
    className="border-t border-border bg-muted/30"
  >
    <div className="container max-w-6xl mx-auto px-4 py-12 md:py-16 space-y-12">
      <div>
        <h2
          id="search-seo-heading"
          className="font-display text-2xl md:text-3xl font-semibold text-foreground mb-3"
        >
          Garde d'animaux à domicile, ville par ville
        </h2>
        <p className="text-sm md:text-base text-muted-foreground mb-6 max-w-3xl">
          Découvrez les annonces et les gardiens disponibles dans les villes
          les plus actives de la communauté. La plateforme couvre toute la
          France.
        </p>
        <ul className="flex flex-wrap gap-2">
          {HUB_CITIES.map((c) => (
            <li key={c.slug}>
              <Link
                to={`/house-sitting/${c.slug}`}
                className="inline-flex items-center rounded-full border border-border bg-background px-4 py-2 text-sm text-foreground hover:border-primary/40 hover:text-primary transition-colors"
              >
                Garde d'animaux à {c.name}
              </Link>
            </li>
          ))}
        </ul>
      </div>

      <div>
        <h2 className="font-display text-2xl md:text-3xl font-semibold text-foreground mb-6">
          Questions fréquentes
        </h2>
        <div className="space-y-5 max-w-3xl">
          {SEARCH_FAQ.map((item) => (
            <details
              key={item.q}
              className="group rounded-xl border border-border bg-background p-4 md:p-5 open:shadow-sm"
            >
              <summary className="cursor-pointer list-none font-medium text-foreground flex items-center justify-between gap-3">
                <span>{item.q}</span>
                <span
                  className="text-muted-foreground text-xl leading-none transition-transform group-open:rotate-45"
                  aria-hidden="true"
                >
                  +
                </span>
              </summary>
              <p className="mt-3 text-sm md:text-base text-muted-foreground leading-relaxed">
                {item.a}
              </p>
            </details>
          ))}
        </div>
      </div>
    </div>
  </section>
);

export default SearchSeoFooter;
