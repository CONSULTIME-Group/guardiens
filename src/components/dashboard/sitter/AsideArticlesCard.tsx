import { Link } from "react-router-dom";
import { getOptimizedImageUrl } from "@/lib/imageOptim";
import { Newspaper, ArrowRight } from "lucide-react";

interface Article {
  id: string;
  slug: string;
  title: string;
  excerpt?: string | null;
  cover_image_url?: string | null;
}

interface AsideArticlesCardProps {
  articles: Article[];
}

/**
 * Carte aside (≥ xl) : conseils éditoriaux verticaux.
 * Comble la colonne droite (~400px vide sous Urgence) et expose les
 * articles SEO à un public déjà engagé (sitter sur dashboard).
 */
const AsideArticlesCard = ({ articles }: AsideArticlesCardProps) => {
  if (!articles || articles.length === 0) return null;

  const top = articles.slice(0, 3);

  return (
    <div className="bg-card border border-border rounded-2xl p-4 sm:p-5">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs uppercase tracking-widest text-muted-foreground font-sans">
          Conseils
        </p>
        <Link
          to="/actualites"
          className="text-xs text-muted-foreground hover:text-primary inline-flex items-center gap-1"
        >
          Tout voir <ArrowRight className="h-3 w-3" aria-hidden="true" />
        </Link>
      </div>

      <ul className="space-y-3">
        {top.map((a) => (
          <li key={a.id}>
            <Link
              to={`/actualites/${a.slug}`}
              className="group flex gap-3 -mx-2 px-2 py-2 rounded-lg hover:bg-muted/40 transition-colors"
            >
              {a.cover_image_url ? (
                <div className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0">
                  <img
                    src={getOptimizedImageUrl(a.cover_image_url, 160, 75)}
                    alt={a.title || "Article"}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    width={64}
                    height={64}
                    loading="lazy"
                  />
                </div>
              ) : (
                <div className="w-16 h-16 rounded-lg bg-accent flex items-center justify-center flex-shrink-0">
                  <Newspaper className="h-5 w-5 text-muted-foreground/40" aria-hidden="true" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-semibold leading-snug line-clamp-2 transition-colors group-hover:text-primary">
                  {a.title}
                </h4>
                {a.excerpt && (
                  <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                    {a.excerpt}
                  </p>
                )}
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default AsideArticlesCard;
