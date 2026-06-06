import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";

const STORAGE = "https://erhccyqevdyevpyctsjj.supabase.co/storage/v1/object/public/property-photos/articles";

const ARTICLES = [
  {
    slug: "petites-missions-entraide-guardiens",
    eyebrow: "Le mode d'emploi",
    title: "Comment fonctionnent les petites missions",
    excerpt: "4 catégories, une règle d'or : l'échange en nature, jamais d'argent.",
    image: `${STORAGE}/cover-petites-missions-entraide-guardiens.webp`,
  },
  {
    slug: "house-sitting-cadre-juridique-france",
    eyebrow: "Le cadre légal",
    title: "Pourquoi sans argent, le commodat expliqué",
    excerpt: "L'échange entre particuliers, sans paiement, est encadré par l'article 1875 du Code civil.",
    image: `${STORAGE}/cover-juridique-brush.png`,
  },
  {
    slug: "creer-profil-gardien-attractif",
    eyebrow: "Pour aider",
    title: "Bien se présenter pour qu'on vous sollicite",
    excerpt: "Photo, bio, expériences : ce qui donne confiance et déclenche les premières demandes.",
    image: `${STORAGE}/cover-creer-profil-gardien-attractif.webp`,
  },
];

const MissionsArticlesStrip = () => (
  <section aria-labelledby="missions-articles-heading" className="space-y-3">
    <div className="flex items-baseline justify-between">
      <h2 id="missions-articles-heading" className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        Pour aller plus loin
      </h2>
      <Link
        to="/actualites"
        className="text-xs text-primary font-medium hover:underline whitespace-nowrap"
      >
        Tout le journal →
      </Link>
    </div>
    <div className="-mx-4 px-4 overflow-x-auto sm:overflow-visible sm:mx-0 sm:px-0">
      <ul className="flex sm:grid sm:grid-cols-3 gap-4 w-max sm:w-auto">
        {ARTICLES.map((a) => (
          <li key={a.slug} className="w-[280px] sm:w-auto">
            <Link
              to={`/actualites/${a.slug}`}
              className="group flex flex-col h-full rounded-xl border border-border bg-card hover:border-primary/40 hover:shadow-md transition-all overflow-hidden"
            >
              <div className="aspect-[16/9] w-full overflow-hidden bg-muted">
                <img
                  src={a.image}
                  alt=""
                  loading="lazy"
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
              </div>
              <div className="flex flex-col flex-1 p-4 space-y-2">
                <p className="text-xs font-medium uppercase tracking-wide text-primary/80">
                  {a.eyebrow}
                </p>
                <p className="font-heading text-sm font-semibold text-foreground leading-snug group-hover:text-primary transition-colors">
                  {a.title}
                </p>
                <p className="text-xs text-muted-foreground line-clamp-2">
                  {a.excerpt}
                </p>
                <span className="inline-flex items-center gap-1 text-xs text-primary font-medium pt-1 mt-auto">
                  Lire l'article
                  <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
                </span>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  </section>
);

export default MissionsArticlesStrip;
