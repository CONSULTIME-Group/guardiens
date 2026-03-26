import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Calendar, MapPin, User } from "lucide-react";
import PageMeta from "@/components/PageMeta";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { marked } from "marked";

interface ArticleFull {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
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

export default function ArticleDetail() {
  const { slug } = useParams<{ slug: string }>();
  const [article, setArticle] = useState<ArticleFull | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!slug) return;
    const fetch = async () => {
      const { data } = await supabase
        .from("articles")
        .select("*")
        .eq("slug", slug)
        .eq("published", true)
        .maybeSingle();
      setArticle(data as ArticleFull | null);
      setLoading(false);
    };
    fetch();
  }, [slug]);

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full rounded-lg" />
        <Skeleton className="h-6 w-3/4" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-2/3" />
      </div>
    );
  }

  if (!article) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center">
        <h1 className="text-2xl font-heading font-bold text-foreground mb-4">Article introuvable</h1>
        <Link to="/actualites" className="text-primary hover:underline">
          ← Retour aux actualités
        </Link>
      </div>
    );
  }

  return (
    <>
      <PageMeta
        title={article.title}
        description={article.excerpt}
        path={`/actualites/${article.slug}`}
        image={article.cover_image_url || undefined}
        type="article"
        publishedAt={article.published_at || undefined}
        author={article.author_name}
      />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
        "@context": "https://schema.org",
        "@type": "BlogPosting",
        "headline": article.title,
        "description": article.excerpt,
        "author": { "@type": "Organization", "name": article.author_name },
        ...(article.cover_image_url && { "image": article.cover_image_url }),
        ...(article.published_at && { "datePublished": article.published_at }),
        "publisher": { "@type": "Organization", "name": "Guardiens", "url": "https://guardiens.lovable.app" },
        "mainEntityOfPage": `https://guardiens.lovable.app/actualites/${article.slug}`
      }) }} />
    <article className="max-w-3xl mx-auto px-4 py-8 animate-fade-in">
      <Link
        to="/actualites"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary transition-colors mb-6"
      >
        <ArrowLeft className="h-4 w-4" />
        Retour aux actualités
      </Link>

      <header className="mb-8">
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          <Badge variant="secondary">
            {CATEGORY_LABELS[article.category] || article.category}
          </Badge>
          {article.city && (
            <span className="flex items-center gap-1 text-sm text-muted-foreground">
              <MapPin className="h-3.5 w-3.5" />
              {article.city}{article.region ? `, ${article.region}` : ""}
            </span>
          )}
        </div>

        <h1 className="text-3xl md:text-4xl font-heading font-bold text-foreground mb-4 leading-tight">
          {article.title}
        </h1>

        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span className="flex items-center gap-1">
            <User className="h-3.5 w-3.5" />
            {article.author_name}
          </span>
          {article.published_at && (
            <span className="flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" />
              {format(new Date(article.published_at), "d MMMM yyyy", { locale: fr })}
            </span>
          )}
        </div>
      </header>

      {article.cover_image_url && (
        <div className="rounded-xl overflow-hidden mb-8">
          <img
            src={article.cover_image_url}
            alt={article.title}
            className="w-full h-auto max-h-96 object-cover"
          />
        </div>
      )}

      <div
        className="prose prose-lg max-w-none text-foreground
          prose-headings:font-heading prose-headings:text-foreground
          prose-p:text-foreground/85 prose-p:leading-relaxed
          prose-a:text-primary prose-a:no-underline hover:prose-a:underline
          prose-strong:text-foreground
          prose-li:text-foreground/85"
        dangerouslySetInnerHTML={{ __html: marked.parse(article.content, { async: false }) as string }}
      />

      {article.tags.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-10 pt-6 border-t border-border">
          {article.tags.map((tag) => (
            <Badge key={tag} variant="outline" className="text-xs">
              #{tag}
            </Badge>
          ))}
        </div>
      )}
    </article>
    </>
  );
}
