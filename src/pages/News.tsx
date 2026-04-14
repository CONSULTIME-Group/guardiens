import { useEffect, useState } from "react";
import { useSearchParams, Link, useNavigate } from "react-router-dom";
import PageMeta from "@/components/PageMeta";
import PublicHeader from "@/components/layout/PublicHeader";
import PublicFooter from "@/components/layout/PublicFooter";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar, MapPin, ArrowRight, ArrowLeft, ChevronLeft, ChevronRight, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
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
  guide_race: "Races",
  guide_lieu: "Guide lieu",
  conseil_gardien: "Conseils gardiens",
  conseil_proprio: "Conseils propriétaires",
  conseil: "Conseils",
  temoignage: "Témoignage",
  actualite: "Actualité",
  ville: "Villes",
  thematique: "House-sitting",
  guide_local: "Guides locaux",
  saisonnier: "Saisonniers",
  guide_pratique: "Guides pratiques",
  vie_locale: "Vie locale & Entraide",
};

const CATEGORY_COLORS: Record<string, string> = {
  guide_race: "bg-[hsl(141,50%,90%)] text-[hsl(153,50%,25%)]",
  guide_lieu: "bg-[hsl(214,80%,92%)] text-[hsl(214,50%,30%)]",
  conseil_gardien: "bg-[hsl(45,90%,90%)] text-[hsl(37,60%,30%)]",
  conseil_proprio: "bg-[hsl(45,90%,90%)] text-[hsl(37,60%,30%)]",
  conseil: "bg-[hsl(45,90%,90%)] text-[hsl(37,60%,30%)]",
  temoignage: "bg-[hsl(330,80%,94%)] text-[hsl(330,50%,30%)]",
  actualite: "bg-muted text-muted-foreground",
  ville: "bg-[hsl(214,80%,92%)] text-[hsl(214,50%,30%)]",
  thematique: "bg-[hsl(270,60%,92%)] text-[hsl(270,40%,30%)]",
  guide_local: "bg-[hsl(270,60%,92%)] text-[hsl(270,40%,30%)]",
  saisonnier: "bg-[hsl(20,80%,92%)] text-[hsl(20,50%,30%)]",
  guide_pratique: "bg-[hsl(170,50%,90%)] text-[hsl(170,40%,25%)]",
  vie_locale: "bg-[hsl(30,80%,92%)] text-[hsl(30,50%,25%)]",
};

const PAGE_SIZE = 9;

export default function News() {
  const navigate = useNavigate();
  const [articles, setArticles] = useState<Article[]>([]);
  const [vieLocaleArticles, setVieLocaleArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [searchParams, setSearchParams] = useSearchParams();
  const activeCategory = searchParams.get("categorie") || searchParams.get("cat") || "all";
  const currentPage = Math.max(1, parseInt(searchParams.get("page") || "1", 10));

  useEffect(() => {
    const fetchArticles = async () => {
      setLoading(true);
      const from = (currentPage - 1) * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      let query = supabase
        .from("articles")
        .select("id, title, slug, excerpt, cover_image_url, category, tags, city, region, author_name, published_at", { count: "exact" })
        .eq("published", true)
        .order("published_at", { ascending: false })
        .range(from, to);

      if (activeCategory !== "all") {
        query = query.eq("category", activeCategory);
      }

      const { data, count } = await query;
      setArticles((data as Article[]) || []);
      setTotalCount(count || 0);
      setLoading(false);
    };

    const fetchVieLocale = async () => {
      const { data } = await supabase
        .from("articles")
        .select("id, title, slug, excerpt, cover_image_url, category, tags, city, region, author_name, published_at")
        .eq("published", true)
        .eq("category", "vie_locale")
        .order("published_at", { ascending: false })
        .limit(3);
      setVieLocaleArticles((data as Article[]) || []);
    };

    fetchArticles();
    if (activeCategory === "all") fetchVieLocale();
  }, [activeCategory, currentPage]);

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  const goToPage = (page: number) => {
    if (page <= 1) searchParams.delete("page");
    else searchParams.set("page", String(page));
    setSearchParams(searchParams);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const categories = [
    { key: "all", label: "Tous" },
    { key: "thematique", label: "House-sitting" },
    { key: "vie_locale", label: "Vie locale & Entraide" },
    { key: "conseil_gardien", label: "Conseils gardiens" },
    { key: "conseil_proprio", label: "Conseils propriétaires" },
    { key: "guide_race", label: "Races" },
    { key: "ville", label: "Villes" },
    { key: "guide_local", label: "Guides locaux" },
    { key: "guide_pratique", label: "Guides pratiques" },
    { key: "saisonnier", label: "Saisonniers" },
  ];

  return (
    <>
      <PageMeta
        title="Guides & Conseils — House-sitting & guides locaux"
        description="Articles, témoignages et guides pratiques pour le house-sitting en Auvergne-Rhône-Alpes. Conseils pour gardiens et propriétaires."
        path="/actualites"
      />
    <PublicHeader />
    <div className="max-w-4xl mx-auto px-4 py-8 animate-fade-in">
      {/* Breadcrumb */}
      <nav aria-label="Fil d'Ariane" className="flex items-center gap-1 text-xs text-muted-foreground mb-4">
        <Link to="/" className="hover:text-foreground transition-colors shrink-0" aria-label="Accueil">
          <Home className="h-3.5 w-3.5" />
        </Link>
        <ChevronRight className="h-3 w-3" />
        <span className="text-foreground font-medium">Guides & Conseils</span>
      </nav>

      {/* Back button */}
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
      >
        <ArrowLeft className="h-4 w-4" />
        Retour
      </button>

      <header className="mb-8">
        <h1 className="text-3xl md:text-4xl font-heading font-bold text-foreground mb-2">
          Guides & Conseils
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
              if (cat.key === "all") {
                searchParams.delete("categorie");
                searchParams.delete("cat");
              } else {
                searchParams.set("categorie", cat.key);
                searchParams.delete("cat");
              }
              searchParams.delete("page");
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

      {/* Featured "Vie locale & Entraide" section when "Tous" is active */}
      {activeCategory === "all" && vieLocaleArticles.length > 0 && !loading && (
        <div className="mb-10 p-6 rounded-xl" style={{ backgroundColor: "#F9F6F1" }}>
          <h2 className="font-heading text-xl font-bold mb-1">Vie locale & Entraide</h2>
          <p className="text-muted-foreground text-sm mb-5">
            Des échanges sans argent, des voisins qui se rendent service, une autre façon de vivre ensemble.
          </p>
          <div className="grid sm:grid-cols-3 gap-4 mb-4">
            {vieLocaleArticles.map((a) => (
              <Link key={a.id} to={`/actualites/${a.slug}`} className="group flex gap-3 bg-background rounded-lg p-3 hover:shadow-md transition-shadow">
                {a.cover_image_url && (
                  <img src={a.cover_image_url} alt={a.title} className="w-20 h-20 rounded-lg object-cover flex-shrink-0" loading="lazy" />
                )}
                <div className="min-w-0">
                  <h3 className="font-heading text-sm font-semibold line-clamp-2 group-hover:text-primary transition-colors">{a.title}</h3>
                  <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{a.excerpt}</p>
                </div>
              </Link>
            ))}
          </div>
          <button
            onClick={() => {
              searchParams.set("categorie", "vie_locale");
              searchParams.delete("page");
              setSearchParams(searchParams);
            }}
            className="text-primary text-sm font-medium hover:underline inline-flex items-center gap-1"
          >
            Voir tous les articles <ArrowRight className="h-3 w-3" />
          </button>
        </div>
      )}

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
        <>
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

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-10">
            <Button
              variant="outline"
              size="icon"
              disabled={currentPage <= 1}
              onClick={() => goToPage(currentPage - 1)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <Button
                key={page}
                variant={page === currentPage ? "default" : "outline"}
                size="sm"
                onClick={() => goToPage(page)}
                className="min-w-[36px]"
              >
                {page}
              </Button>
            ))}
            <Button
              variant="outline"
              size="icon"
              disabled={currentPage >= totalPages}
              onClick={() => goToPage(currentPage + 1)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
        </>
      )}
    </div>
    <PublicFooter />
    </>
  );
}
