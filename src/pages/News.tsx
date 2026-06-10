import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { getOptimizedImageUrl } from "@/lib/imageOptim";
import { useSearchParams, Link } from "react-router-dom";
import PageMeta from "@/components/PageMeta";
import PageBreadcrumb from "@/components/seo/PageBreadcrumb";
import PublicHeader from "@/components/layout/PublicHeader";
import PublicFooter from "@/components/layout/PublicFooter";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Calendar, MapPin, ArrowRight, ChevronLeft, ChevronRight, Search, AlertCircle, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { fr, enUS, es, it as itLocale, de as deLocale } from "date-fns/locale";

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

const CATEGORY_KEYS = [
  "guide_central","guide_race","guide_lieu","guide_ville","conseil_gardien","conseil_proprio",
  "conseil","temoignage","actualite","ville","thematique","guide_local","saisonnier","guide_pratique","vie_locale",
];

const CATEGORY_COLORS: Record<string, string> = {
  guide_central: "bg-primary/10 text-primary",
  guide_race: "bg-success-soft text-success",
  guide_lieu: "bg-info-soft text-info",
  guide_ville: "bg-info-soft text-info",
  conseil_gardien: "bg-warning-soft text-warning",
  conseil_proprio: "bg-warning-soft text-warning",
  conseil: "bg-warning-soft text-warning",
  temoignage: "bg-accent text-accent-foreground",
  actualite: "bg-muted text-muted-foreground",
  ville: "bg-info-soft text-info",
  thematique: "bg-secondary text-secondary-foreground",
  guide_local: "bg-secondary text-secondary-foreground",
  saisonnier: "bg-warning-soft text-warning",
  guide_pratique: "bg-success-soft text-success",
  vie_locale: "bg-warning-soft text-warning",
};

const PAGE_SIZE = 9;

const VALID_CATEGORIES = new Set(CATEGORY_KEYS);

function buildPageList(current: number, total: number): (number | "…")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages: (number | "…")[] = [1];
  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);
  if (start > 2) pages.push("…");
  for (let p = start; p <= end; p++) pages.push(p);
  if (end < total - 1) pages.push("…");
  pages.push(total);
  return pages;
}

function isNew(publishedAt: string | null): boolean {
  if (!publishedAt) return false;
  const diff = Date.now() - new Date(publishedAt).getTime();
  return diff >= 0 && diff < 7 * 24 * 60 * 60 * 1000;
}

export default function News() {
  const { t, i18n } = useTranslation();
  const tCat = (key: string) => t(`news.categories.${key}`, { defaultValue: key });
  const dateLocale = (({ fr, en: enUS, es, it: itLocale, de: deLocale } as any)[i18n.language?.split("-")[0]] || fr);
  const [articles, setArticles] = useState<Article[]>([]);
  const [vieLocaleArticles, setVieLocaleArticles] = useState<Article[]>([]);
  const [categoryCounts, setCategoryCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  const [searchParams, setSearchParams] = useSearchParams();

  const rawCategory = searchParams.get("categorie") || searchParams.get("cat") || "all";
  const activeCategory = rawCategory === "all" || VALID_CATEGORIES.has(rawCategory) ? rawCategory : "all";
  const currentPage = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
  const urlSearch = searchParams.get("q") || "";
  const [searchInput, setSearchInput] = useState(urlSearch);

  // Sync input when URL changes (back/forward navigation)
  useEffect(() => {
    setSearchInput(urlSearch);
  }, [urlSearch]);

  // Debounce search input → URL
  useEffect(() => {
    const trimmed = searchInput.trim();
    if (trimmed === urlSearch) return;
    const t = setTimeout(() => {
      const next = new URLSearchParams(searchParams);
      if (trimmed) next.set("q", trimmed);
      else next.delete("q");
      next.delete("page");
      setSearchParams(next, { replace: true });
    }, 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchInput]);

  useEffect(() => {
    let cancelled = false;
    const lang = (i18n.language || "fr").split("-")[0].toLowerCase();
    const overlayTranslations = async (list: Article[], lg: string): Promise<Article[]> => {
      if (!["en", "es", "it", "de"].includes(lg) || list.length === 0) return list;
      const { data: trs } = await supabase
        .from("article_translations")
        .select("article_id, title, excerpt")
        .eq("lang", lg)
        .in("article_id", list.map((a) => a.id));
      const map = new Map<string, { title?: string; excerpt?: string }>();
      (trs || []).forEach((tr: any) => map.set(tr.article_id, { title: tr.title, excerpt: tr.excerpt }));
      return list.map((a) => {
        const tr = map.get(a.id);
        if (!tr) return a;
        return { ...a, title: tr.title || a.title, excerpt: tr.excerpt || a.excerpt };
      });
    };
    const fetchArticles = async () => {
      setLoading(true);
      setError(null);
      const from = (currentPage - 1) * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;
      const nowIso = new Date().toISOString();

      let query = supabase
        .from("articles")
        .select("id, title, slug, excerpt, cover_image_url, category, tags, city, region, author_name, published_at", { count: "exact" })
        .eq("published", true)
        .lte("published_at", nowIso)
        .or("noindex.is.null,noindex.eq.false")
        .order("published_at", { ascending: false })
        .range(from, to);

      if (activeCategory !== "all") {
        query = query.eq("category", activeCategory);
      }

      if (urlSearch.trim()) {
        const escaped = urlSearch.trim().replace(/[%_]/g, "\\$&");
        query = query.or(`title.ilike.%${escaped}%,excerpt.ilike.%${escaped}%`);
      }

      const { data, count, error: qError } = await query;
      if (cancelled) return;
      if (qError) {
        setError(t("news.error"));
        setArticles([]);
        setTotalCount(0);
      } else {
        const list = (data as Article[]) || [];
        const overlaid = await overlayTranslations(list, lang);
        if (cancelled) return;
        setArticles(overlaid);
        setTotalCount(count || 0);
      }
      setLoading(false);
    };

    const fetchVieLocale = async () => {
      const nowIso = new Date().toISOString();
      const { data } = await supabase
        .from("articles")
        .select("id, title, slug, excerpt, cover_image_url, category, tags, city, region, author_name, published_at")
        .eq("published", true)
        .eq("category", "vie_locale")
        .lte("published_at", nowIso)
        .or("noindex.is.null,noindex.eq.false")
        .order("published_at", { ascending: false })
        .limit(3);
      const list = (data as Article[]) || [];
      const overlaid = await overlayTranslations(list, lang);
      if (!cancelled) setVieLocaleArticles(overlaid);
    };

    fetchArticles();
    if (activeCategory === "all" && !urlSearch.trim()) fetchVieLocale();
    else setVieLocaleArticles([]);

    return () => {
      cancelled = true;
    };
  }, [activeCategory, currentPage, urlSearch, i18n.language]);

  // Fetch category counts once (only categories that have at least one article are shown)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const nowIso = new Date().toISOString();
      const { data } = await supabase
        .from("articles")
        .select("category")
        .eq("published", true)
        .lte("published_at", nowIso)
        .or("noindex.is.null,noindex.eq.false");
      if (cancelled || !data) return;
      const counts: Record<string, number> = {};
      (data as { category: string }[]).forEach((row) => {
        if (!row.category) return;
        counts[row.category] = (counts[row.category] || 0) + 1;
      });
      setCategoryCounts(counts);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);
  const pageList = useMemo(() => buildPageList(currentPage, totalPages), [currentPage, totalPages]);

  const updateParams = (mutate: (p: URLSearchParams) => void, replace = false) => {
    const next = new URLSearchParams(searchParams);
    mutate(next);
    setSearchParams(next, { replace });
  };

  const goToPage = (page: number) => {
    updateParams((p) => {
      if (page <= 1) p.delete("page");
      else p.set("page", String(page));
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const featuredIds = useMemo(() => new Set(vieLocaleArticles.map((a) => a.id)), [vieLocaleArticles]);
  const visibleArticles = useMemo(
    () => (activeCategory === "all" && !urlSearch.trim() ? articles.filter((a) => !featuredIds.has(a.id)) : articles),
    [articles, featuredIds, activeCategory, urlSearch]
  );

  // Preferred display order (categories not listed here go to the end alphabetically by label)
  const CATEGORY_ORDER = [
    "guide_central",
    "thematique",
    "vie_locale",
    "conseil_gardien",
    "conseil_proprio",
    "conseil",
    "guide_race",
    "guide_local",
    "guide_pratique",
    "guide_lieu",
    "saisonnier",
    "actualite",
  ];

  const totalArticles = useMemo(
    () => Object.values(categoryCounts).reduce((sum, n) => sum + n, 0),
    [categoryCounts]
  );

  const categories = useMemo(() => {
    const present = Object.keys(categoryCounts).filter((k) => categoryCounts[k] > 0);
    const ordered = [
      ...CATEGORY_ORDER.filter((k) => present.includes(k)),
      ...present.filter((k) => !CATEGORY_ORDER.includes(k)).sort(),
    ];
    return [
      { key: "all", label: t("news.all", "Tous"), count: totalArticles },
      ...ordered.map((k) => ({
        key: k,
        label: tCat(k),
        count: categoryCounts[k],
      })),
    ];
  }, [categoryCounts, totalArticles, i18n.language]);

  const metaTitle =
    activeCategory !== "all"
      ? t("news.meta_title_category", { cat: tCat(activeCategory) })
      : t("news.meta_title_default");
  const metaPath =
    activeCategory !== "all"
      ? `/actualites?categorie=${activeCategory}${currentPage > 1 ? `&page=${currentPage}` : ""}`
      : `/actualites${currentPage > 1 ? `?page=${currentPage}` : ""}`;

  const hasActiveFilters = urlSearch.trim() !== "" || activeCategory !== "all" || currentPage > 1;

  const resetFilters = () => {
    setSearchInput("");
    const next = new URLSearchParams();
    setSearchParams(next, { replace: true });
  };

  return (
    <>
      <PageMeta
        title={metaTitle}
        description={t("news.meta_description")}
        path={metaPath}
      />
      <PublicHeader />
      <div className="max-w-4xl mx-auto px-4 py-8 animate-fade-in">
        <PageBreadcrumb items={[{ label: t("news.breadcrumb") }]} />

        <header className="mb-8">
          <h1 className="text-3xl md:text-4xl font-heading font-bold text-foreground mb-2">
            {t("news.title")}
          </h1>
          <p className="text-muted-foreground text-lg">
            {t("news.subtitle")}
          </p>
        </header>

        {/* Search bar */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" aria-hidden="true" />
            <Input
              type="search"
              placeholder={t("news.search_placeholder")}
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="pl-10"
              aria-label={t("news.search_aria")}
            />
          </div>
          {hasActiveFilters && (
            <Button variant="outline" onClick={resetFilters} className="shrink-0 gap-2">
              <RotateCcw className="h-4 w-4" aria-hidden="true" />
              {t("news.reset_filters")}
            </Button>
          )}
        </div>

        {/* Category filter */}
        <div className="flex flex-wrap gap-2 mb-8">
          {categories.map((cat) => (
            <button
              key={cat.key}
              onClick={() =>
                updateParams((p) => {
                  if (cat.key === "all") {
                    p.delete("categorie");
                    p.delete("cat");
                  } else {
                    p.set("categorie", cat.key);
                    p.delete("cat");
                  }
                  p.delete("page");
                })
              }
              aria-pressed={activeCategory === cat.key}
              className={`px-4 py-2 rounded-pill text-sm font-medium transition-colors ${
                activeCategory === cat.key
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              }`}
            >
              {cat.label}
              {typeof cat.count === "number" && (
                <span className="ml-1.5 text-xs opacity-70">({cat.count})</span>
              )}
            </button>
          ))}
        </div>

        {/* Featured "Vie locale & Entraide" section */}
        {activeCategory === "all" && !urlSearch.trim() && vieLocaleArticles.length > 0 && !loading && (
          <div className="mb-10 p-6 rounded-xl bg-warning-soft/40">
            <h2 className="font-heading text-xl font-bold mb-1">{t("news.vie_locale_title")}</h2>
            <p className="text-muted-foreground text-sm mb-5">
              {t("news.vie_locale_subtitle")}
            </p>
            <div className="grid sm:grid-cols-3 gap-4 mb-4">
              {vieLocaleArticles.map((a) => (
                <Link key={a.id} to={`/actualites/${a.slug}`} className="group flex gap-3 bg-background rounded-lg p-3 hover:shadow-md transition-shadow">
                  {a.cover_image_url && (
                    <img src={getOptimizedImageUrl(a.cover_image_url, 200, 75)} alt={a.title} className="w-20 h-20 rounded-lg object-cover flex-shrink-0" loading="lazy" width={80} height={80} />
                  )}
                  <div className="min-w-0">
                    <h3 className="font-heading text-sm font-semibold line-clamp-2 group-hover:text-primary transition-colors">{a.title}</h3>
                    <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{a.excerpt}</p>
                  </div>
                </Link>
              ))}
            </div>
            <button
              onClick={() =>
                updateParams((p) => {
                  p.set("categorie", "vie_locale");
                  p.delete("page");
                })
              }
              className="text-primary text-sm font-medium hover:underline inline-flex items-center gap-1"
            >
              {t("news.see_all")} <ArrowRight className="h-3 w-3" />
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
        ) : error ? (
          <div className="text-center py-16 space-y-4">
            <AlertCircle className="h-10 w-10 text-destructive mx-auto" aria-hidden="true" />
            <p className="text-destructive">{error}</p>
            <Button variant="outline" onClick={() => updateParams(() => {}, true)}>{t("news.retry")}</Button>
          </div>
        ) : visibleArticles.length === 0 ? (
          <div className="text-center py-16 space-y-3">
            <p className="text-muted-foreground text-lg">
              {urlSearch.trim()
                ? t("news.empty_search", { q: urlSearch.trim() })
                : t("news.empty_default")}
            </p>
            {hasActiveFilters && (
              <Button variant="outline" onClick={resetFilters} className="gap-2">
                <RotateCcw className="h-4 w-4" aria-hidden="true" />
                {t("news.reset_filters")}
              </Button>
            )}
          </div>
        ) : (
          <>
            <div className="grid gap-6 md:grid-cols-2">
              {visibleArticles.map((article) => (
                <Link key={article.id} to={`/actualites/${article.slug}`} className="group">
                  <article>
                    <Card className="overflow-hidden h-full transition-shadow hover:shadow-lg border-border">
                      {article.cover_image_url && (
                        <div className="aspect-[16/9] overflow-hidden bg-muted">
                          <img
                            src={getOptimizedImageUrl(article.cover_image_url, 480, 75)}
                            alt={article.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            loading="lazy"
                            width={480}
                            height={270}
                          />
                        </div>
                      )}
                      <CardContent className="p-5 space-y-3">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant="secondary" className={CATEGORY_COLORS[article.category] || ""}>
                            {tCat(article.category)}
                          </Badge>
                          {isNew(article.published_at) && (
                            <Badge className="bg-primary text-primary-foreground">{t("news.new_badge")}</Badge>
                          )}
                          {article.city && (
                            <span className="flex items-center gap-1 text-xs text-muted-foreground">
                              <MapPin className="h-3 w-3" aria-hidden="true" />
                              {article.city}
                            </span>
                          )}
                        </div>
                        <h2 className="font-heading text-lg font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-2">
                          {article.title}
                        </h2>
                        <p className="text-muted-foreground text-sm line-clamp-3">{article.excerpt}</p>
                        <div className="flex items-center justify-between pt-2">
                          {article.published_at && (
                            <time
                              dateTime={article.published_at}
                              className="flex items-center gap-1 text-xs text-muted-foreground"
                            >
                              <Calendar className="h-3 w-3" aria-hidden="true" />
                              {format(new Date(article.published_at), "d MMM yyyy", { locale: dateLocale })}
                            </time>
                          )}
                          <span className="flex items-center gap-1 text-xs font-medium text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                            Lire <ArrowRight className="h-3 w-3" aria-hidden="true" />
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  </article>
                </Link>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <nav className="flex items-center justify-center gap-2 mt-10" aria-label="Pagination">
                <Button
                  variant="outline"
                  size="icon"
                  disabled={currentPage <= 1}
                  onClick={() => goToPage(currentPage - 1)}
                  aria-label="Page précédente"
                >
                  <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                </Button>
                {pageList.map((p, idx) =>
                  p === "…" ? (
                    <span key={`gap-${idx}`} className="px-2 text-muted-foreground" aria-hidden="true">…</span>
                  ) : (
                    <Button
                      key={p}
                      variant={p === currentPage ? "default" : "outline"}
                      size="sm"
                      onClick={() => goToPage(p)}
                      aria-current={p === currentPage ? "page" : undefined}
                      aria-label={`Page ${p}`}
                      className="min-w-[36px]"
                    >
                      {p}
                    </Button>
                  )
                )}
                <Button
                  variant="outline"
                  size="icon"
                  disabled={currentPage >= totalPages}
                  onClick={() => goToPage(currentPage + 1)}
                  aria-label="Page suivante"
                >
                  <ChevronRight className="h-4 w-4" aria-hidden="true" />
                </Button>
              </nav>
            )}
          </>
        )}
      </div>
      <PublicFooter />
    </>
  );
}
