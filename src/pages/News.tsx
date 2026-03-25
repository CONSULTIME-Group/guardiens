import { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar, MapPin, ArrowRight } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface Article {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  cover_image_url: string | null;
  category: string;
  tags: string[];
  city: string | null;
  region: string | null;
  author_name: string;
  published_at: string | null;
}

const CATEGORY_LABELS: Record<string, string> = {
  conseil: "Conseil",
  guide_ville: "Guide ville",
  race: "Races & espèces",
  temoignage: "Témoignage",
  astuce: "Astuce",
};

const CATEGORY_COLORS: Record<string, string> = {
  conseil: "bg-primary/10 text-primary",
  guide_ville: "bg-secondary/10 text-secondary",
  race: "bg-accent text-accent-foreground",
  temoignage: "bg-muted text-muted-foreground",
  astuce: "bg-primary/10 text-primary",
};

export default function News() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchParams, setSearchParams] = useSearchParams();
  const activeCategory = searchParams.get("cat") || "all";

  useEffect(() => {
    const fetchArticles = async () => {
      setLoading(true);
      let query = supabase
        .from("articles")
        .select("id, title, slug, excerpt, cover_image_url, category, tags, city, region, author_name, published_at")
        .eq("published", true)
        .order("published_at", { ascending: false });

      if (activeCategory !== "all") {
        query = query.eq("category", activeCategory);
      }

      const { data } = await query;
      setArticles((data as Article[]) || []);
      setLoading(false);
    };
    fetchArticles();
  }, [activeCategory]);

  const categories = [
    { key: "all", label: "Tout" },
    ...Object.entries(CATEGORY_LABELS).map(([key, label]) => ({ key, label })),
  ];

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 animate-fade-in">
      <header className="mb-8">
        <h1 className="text-3xl md:text-4xl font-heading font-bold text-foreground mb-2">
          Actualités
        </h1>
        <p className="text-muted-foreground text-lg">
          Conseils, guides et astuces pour les propriétaires et gardiens d'animaux.
        </p>
      </header>

      {/* Category filter */}
      <div className="flex flex-wrap gap-2 mb-8">
        {categories.map((cat) => (
          <button
            key={cat.key}
            onClick={() => {
              if (cat.key === "all") searchParams.delete("cat");
              else searchParams.set("cat", cat.key);
              setSearchParams(searchParams);
            }}
            className={`px-4 py-2 rounded-pill text-sm font-medium transition-colors ${
              activeCategory === cat.key
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Articles grid */}
      {loading ? (
        <div className="grid gap-6 md:grid-cols-2">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="overflow-hidden">
              <Skeleton className="h-48 w-full" />
              <CardContent className="p-5 space-y-3">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-2/3" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : articles.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-muted-foreground text-lg">
            Aucun article pour le moment. Revenez bientôt !
          </p>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          {articles.map((article) => (
            <Link
              key={article.id}
              to={`/actualites/${article.slug}`}
              className="group"
            >
              <Card className="overflow-hidden h-full transition-shadow hover:shadow-lg border-border">
                {article.cover_image_url && (
                  <div className="h-48 overflow-hidden bg-muted">
                    <img
                      src={article.cover_image_url}
                      alt={article.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      loading="lazy"
                    />
                  </div>
                )}
                <CardContent className="p-5 space-y-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge
                      variant="secondary"
                      className={CATEGORY_COLORS[article.category] || ""}
                    >
                      {CATEGORY_LABELS[article.category] || article.category}
                    </Badge>
                    {article.city && (
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <MapPin className="h-3 w-3" />
                        {article.city}
                      </span>
                    )}
                  </div>
                  <h2 className="font-heading text-lg font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-2">
                    {article.title}
                  </h2>
                  <p className="text-muted-foreground text-sm line-clamp-3">
                    {article.excerpt}
                  </p>
                  <div className="flex items-center justify-between pt-2">
                    {article.published_at && (
                      <span className="flex items-center gap-1 text-xs text-hint">
                        <Calendar className="h-3 w-3" />
                        {format(new Date(article.published_at), "d MMM yyyy", { locale: fr })}
                      </span>
                    )}
                    <span className="flex items-center gap-1 text-xs font-medium text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                      Lire <ArrowRight className="h-3 w-3" />
                    </span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
