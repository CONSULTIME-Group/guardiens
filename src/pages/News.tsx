import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { getOptimizedImageUrl } from "@/lib/imageOptim";
import { useSearchParams, Link, useParams, useNavigate, Navigate } from "react-router-dom";
import NotFound from "@/pages/NotFound";
import {
  parseNewsPageParam,
  newsPageHref,
  newsCanonicalPath,
  isNewsPageOutOfRange,
  needsNewsPageNormalization,
  NEWS_BASE_PATH,
} from "@/lib/newsPagination";
import PageMeta from "@/components/PageMeta";
import ArticleCoverFallback from "@/components/news/ArticleCoverFallback";
import PageBreadcrumb from "@/components/seo/PageBreadcrumb";
import inventoryCover from "@/assets/inventaire-guardiens-france.jpg";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Calendar, MapPin, ArrowRight, ChevronLeft, ChevronRight, Search, AlertCircle, RotateCcw } from "lucide-react";
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
  // Résultat étiqueté par la clé de lecture (page, catégorie, recherche) :
  // une réponse ancienne ne s'affiche jamais sous une autre page.
  const [result, setResult] = useState<{ key: string; articles: Article[]; total: number; error: boolean } | null>(null);
  // Vitrine « Vie locale » : null tant qu'elle n'est pas lue (lue une fois,
  // indépendante du numéro de page).
  const [vieLocaleLoaded, setVieLocaleLoaded] = useState<Article[] | null>(null);
  const [categoryCounts, setCategoryCounts] = useState<Record<string, number>>({});
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { page: pageParam } = useParams<{ page?: string }>();
  const parsedPage = parseNewsPageParam(pageParam);

  const rawCategory = searchParams.get("categorie") || searchParams.get("cat") || "all";
  const activeCategory = rawCategory === "all" || VALID_CATEGORIES.has(rawCategory) ? rawCategory : "all";
  const currentPage = parsedPage ?? 1;
  const urlSearch = searchParams.get("q") || "";
  const fetchKey = `${currentPage}|${activeCategory}|${urlSearch.trim()}`;
  const [retryTick, setRetryTick] = useState(0);
  const current = result && result.key === fetchKey ? result : null;
  const loading = current === null;
  const error = current?.error ? t("news.error") : null;
  const articles = current?.articles ?? [];
  const totalCount = current?.total ?? 0;
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
      navigate(newsPageHref(1, next), { replace: true });
    }, 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchInput]);

  useEffect(() => {
    let cancelled = false;
    const key = fetchKey;
    const fetchArticles = async () => {
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
        // Clé unique en second : ordre stable entre pages à date égale.
        .order("id", { ascending: false })
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
        setResult({ key, articles: [], total: 0, error: true });
      } else {
        setResult({ key, articles: (data as Article[]) || [], total: count || 0, error: false });
      }
    };

    if (parsedPage === null) return () => { cancelled = true; };
    fetchArticles();

    return () => {
      cancelled = true;
    };
  }, [activeCategory, currentPage, urlSearch, parsedPage, retryTick]);

  const showVieLocale = activeCategory === "all" && !urlSearch.trim();
  const vieLoaded = vieLocaleLoaded !== null;
  useEffect(() => {
    if (!showVieLocale || vieLoaded) return;
    let cancelled = false;
    (async () => {
      const nowIso = new Date().toISOString();
      const { data, error: vError } = await supabase
        .from("articles")
        .select("id, title, slug, excerpt, cover_image_url, category, tags, city, region, author_name, published_at")
        .eq("published", true)
        .eq("category", "vie_locale")
        .lte("published_at", nowIso)
        .or("noindex.is.null,noindex.eq.false")
        .order("published_at", { ascending: false })
        .order("id", { ascending: false })
        .limit(3);
      if (cancelled) return;
      // Vitrine facultative : une panne la masque sans bloquer la page.
      setVieLocaleLoaded(vError ? [] : ((data as Article[]) || []));
    })();
    return () => {
      cancelled = true;
    };
  }, [showVieLocale, vieLoaded]);
  const vieLocaleArticles = showVieLocale ? vieLocaleLoaded ?? [] : [];

  // Retour en haut à chaque changement de page.
  useEffect(() => {
    if (typeof window !== "undefined") window.scrollTo({ top: 0 });
  }, [currentPage]);

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

  // Changement de filtre : retour à la première page, filtres en query.
  const updateParams = (mutate: (p: URLSearchParams) => void, replace = false) => {
    const next = new URLSearchParams(searchParams);
    mutate(next);
    navigate(newsPageHref(1, next), { replace });
  };

  const featuredIds = useMemo(() => new Set(vieLocaleArticles.map((a) => a.id)), [vieLocaleArticles]);
  const visibleArticles = useMemo(() => {
    if (activeCategory === "all" && !urlSearch.trim()) {
      return articles.filter((a) => !featuredIds.has(a.id));
    }
    return articles;
  }, [articles, featuredIds, activeCategory, urlSearch]);

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
  const isFiltered = activeCategory !== "all" || urlSearch.trim() !== "";
  const metaPath = newsCanonicalPath(currentPage, isFiltered);
  const pageTitleSuffix = currentPage > 1 ? `, page ${currentPage}` : "";

  const hasActiveFilters = urlSearch.trim() !== "" || activeCategory !== "all" || currentPage > 1;

  // Réinitialisation : page 1 sans filtres, langue conservée, entrée
  // d'historique ajoutée (retour arrière vers la vue filtrée possible).
  const resetFilters = () => {
    setSearchInput("");
    const keep = new URLSearchParams();
    const lang = searchParams.get("lang");
    if (lang) keep.set("lang", lang);
    navigate(newsPageHref(1, keep));
  };

  // Ancienne pagination `?page=N` : redirection vers le chemin équivalent.
  const legacyPage = searchParams.get("page");
  if (legacyPage !== null) {
    const n = parseNewsPageParam(legacyPage);
    return <Navigate to={newsPageHref(n && !pageParam ? n : currentPage, searchParams)} replace />;
  }
  // `/actualites/page/1` n'existe pas : la page 1 est `/actualites`.
  // Zéros initiaux (« 02 ») : forme canonique « 2 ».
  if (needsNewsPageNormalization(pageParam, parsedPage)) {
    return <Navigate to={newsPageHref(parsedPage as number, searchParams)} replace />;
  }
  // Valeur invalide, ou page au-delà de la dernière une fois le total connu.
  if (parsedPage === null) return <NotFound />;
  if (current && !current.error && isNewsPageOutOfRange(currentPage, totalCount, PAGE_SIZE)) {
    return <NotFound />;
  }

  // Prêt seulement quand la liste de CETTE requête est affichée, et la
  // vitrine lue si elle s'affiche. Panne de lecture : 503 déclaré, noindex,
  // sans canonical (jamais une fausse 404 ni une page indexable vide).
  const ready = !loading && (!showVieLocale || vieLoaded || Boolean(current?.error));

  return (
    <>
      {current?.error ? (
        <PageMeta
          title={`${metaTitle}${pageTitleSuffix}`}
          description={t("news.meta_description")}
          path={metaPath}
          noindex
          statusCode={503}
          noCanonical
        />
      ) : (
        <PageMeta
          title={`${metaTitle}${pageTitleSuffix}`}
          description={t("news.meta_description")}
          path={metaPath}
          ready={ready}
        />
      )}
      <div className="max-w-4xl mx-auto px-4 py-4 md:py-8 animate-fade-in">
        <PageBreadcrumb items={[{ label: t("news.breadcrumb") }]} />

        <header className="mb-4 md:mb-8">
          <h1 className="text-2xl md:text-4xl font-heading font-bold text-foreground mb-2">
            {t("news.title")}
          </h1>
          <p className="text-muted-foreground text-base md:text-lg">
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

        {/* Épinglé : inventaire vivant */}
        {activeCategory === "all" && !urlSearch.trim() && currentPage === 1 && (
          <article className="mb-8 md:mb-10 rounded-xl border border-primary/20 bg-primary/5 overflow-hidden transition-colors hover:bg-primary/[0.07]">
            <div className="flex flex-col md:flex-row">
              <div className="md:w-[45%] lg:w-[40%] aspect-[16/9] md:aspect-auto relative overflow-hidden">
                <img
                  src={inventoryCover}
                  alt="Inventaire vivant de Guardiens, couverture"
                  className="w-full h-full object-cover"
                  loading="eager"
                  width={800}
                  height={450}
                />
              </div>
              <div className="flex-1 p-5 md:p-8 flex flex-col justify-center gap-3">
                <Badge className="w-fit bg-primary text-primary-foreground">Épinglé</Badge>
                <h2 className="font-heading text-xl md:text-2xl font-bold text-foreground leading-tight">
                  L'inventaire vivant de Guardiens
                </h2>
                <p className="text-muted-foreground text-sm md:text-base leading-relaxed">
                  Villes couvertes, races documentées, lieux dog-friendly, professionnels : tous nos chiffres mis à jour en direct.
                </p>
                <Button asChild className="w-fit gap-2 mt-1">
                  <Link to="/actualites/inventaire-guardiens-france">
                    Voir l'inventaire
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </Link>
                </Button>
              </div>
            </div>
          </article>
        )}

        {/* Featured "Vie locale & Entraide" section */}
        {showVieLocale && vieLocaleArticles.length > 0 && !loading && !error && (
          <div className="mb-6 md:mb-10 p-4 md:p-6 rounded-xl bg-warning-soft/40">
            <h2 className="font-heading text-lg md:text-xl font-bold mb-1">{t("news.vie_locale_title")}</h2>
            <p className="text-muted-foreground text-sm mb-5">
              {t("news.vie_locale_subtitle")}
            </p>
            <div className="grid sm:grid-cols-3 gap-4 mb-4">
              {vieLocaleArticles.map((a) => (
                <Link key={a.id} to={`/actualites/${a.slug}`} className="group flex gap-3 bg-background rounded-lg p-3 hover:shadow-md transition-shadow">
                  {a.cover_image_url ? (
                    <img src={getOptimizedImageUrl(a.cover_image_url, 200, 75)} alt={a.title} className="w-20 h-20 rounded-lg object-cover flex-shrink-0" loading="lazy" width={80} height={80} />
                  ) : (
                    <ArticleCoverFallback title={a.title} compact className="w-20 h-20 rounded-lg flex-shrink-0" />
                  )}
                  <div className="min-w-0">
                    <h3 className="font-heading text-sm font-semibold line-clamp-2 group-hover:text-primary transition-colors">{a.title}</h3>
                    <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{a.excerpt}</p>
                  </div>
                </Link>
              ))}
            </div>
            <Link
              to={newsPageHref(1, (() => { const p = new URLSearchParams(searchParams); p.set("categorie", "vie_locale"); p.delete("cat"); return p; })())}
              className="text-primary text-sm font-medium hover:underline inline-flex items-center gap-1"
            >
              {t("news.see_all")} <ArrowRight className="h-3 w-3" />
            </Link>
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
            <Button variant="outline" onClick={() => setRetryTick((n) => n + 1)}>{t("news.retry")}</Button>
          </div>
        ) : visibleArticles.length === 0 ? (
          <div className="text-center py-16 space-y-3">
            <p className="text-muted-foreground text-base md:text-lg">
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
                      {article.cover_image_url ? (
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
                      ) : (
                        <ArticleCoverFallback title={article.title} className="aspect-[16/9]" />
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
                              {format(new Date(article.published_at), "d MMM yyyy", { locale: fr })}
                            </time>
                          )}
                          <span className="flex items-center gap-1 text-xs font-medium text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                            {t("news.read")} <ArrowRight className="h-3 w-3" aria-hidden="true" />
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
              <nav className="flex items-center justify-center gap-2 mt-10" aria-label={t("news.pagination_aria")}>
                {currentPage > 1 ? (
                  <Button asChild variant="outline" size="icon">
                    <Link to={newsPageHref(currentPage - 1, searchParams)} rel="prev" aria-label={t("news.prev_page")}>
                      <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                    </Link>
                  </Button>
                ) : (
                  <Button variant="outline" size="icon" disabled aria-label={t("news.prev_page")}>
                    <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                  </Button>
                )}
                {pageList.map((p, idx) =>
                  p === "…" ? (
                    <span key={`gap-${idx}`} className="px-2 text-muted-foreground" aria-hidden="true">…</span>
                  ) : (
                    <Button
                      key={p}
                      asChild
                      variant={p === currentPage ? "default" : "outline"}
                      size="sm"
                      className="min-w-[36px]"
                    >
                      <Link
                        to={newsPageHref(p, searchParams)}
                        aria-current={p === currentPage ? "page" : undefined}
                        aria-label={t("news.page_aria", { n: p })}
                      >
                        {p}
                      </Link>
                    </Button>
                  )
                )}
                {currentPage < totalPages ? (
                  <Button asChild variant="outline" size="icon">
                    <Link to={newsPageHref(currentPage + 1, searchParams)} rel="next" aria-label={t("news.next_page")}>
                      <ChevronRight className="h-4 w-4" aria-hidden="true" />
                    </Link>
                  </Button>
                ) : (
                  <Button variant="outline" size="icon" disabled aria-label={t("news.next_page")}>
                    <ChevronRight className="h-4 w-4" aria-hidden="true" />
                  </Button>
                )}
              </nav>
            )}
          </>
        )}
      </div>
    </>
  );
}
