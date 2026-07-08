/**
 * /conseils — Hub public "Les conseils d'Alma".
 *
 * Alimenté par la vue `public.alma_public_tips` (filtre strict côté SQL des
 * types de contenu diffusables). Les autres types (usage_nudge, social_stat,
 * founder_anecdote, animal_humor, city_did_you_know) restent réservés aux
 * whispers Alma et ne sont pas exposés ici.
 *
 * Chrome de la page en vouvoiement (voix d'Alma), dérogation assumée à la
 * règle de tutoiement du contenu public.
 */
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import PageMeta from "@/components/PageMeta";
import PublicHeader from "@/components/layout/PublicHeader";
import PublicFooter from "@/components/layout/PublicFooter";
import PageBreadcrumb from "@/components/seo/PageBreadcrumb";
import { supabase } from "@/integrations/supabase/client";
import { AlmaAvatar } from "@/components/ai/alma/AlmaAvatar";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, ExternalLink, ArrowRight } from "lucide-react";
import { slugify } from "@/lib/normalize";

type FactType =
  | "pet_care_tip"
  | "dog_behavior_tip"
  | "cat_behavior_tip"
  | "home_care_tip"
  | "seasonal_advice"
  | "breed_did_you_know"
  | "mutual_aid_tip";

interface Tip {
  id: string;
  fact_type: FactType;
  content: string;
  source_url: string | null;
  needs_pro_referral: boolean;
  seasonal_start_month: number | null;
  seasonal_end_month: number | null;
  context_filter: Record<string, unknown> | null;
}

type Category = "all" | "care" | "dog" | "cat" | "home" | "season" | "breed" | "aid";

const CATEGORY_META: Record<Exclude<Category, "all">, { label: string; types: FactType[] }> = {
  care: { label: "Soins", types: ["pet_care_tip"] },
  dog: { label: "Chien", types: ["dog_behavior_tip"] },
  cat: { label: "Chat", types: ["cat_behavior_tip"] },
  home: { label: "Maison", types: ["home_care_tip"] },
  season: { label: "Saison", types: ["seasonal_advice"] },
  breed: { label: "Races", types: ["breed_did_you_know"] },
  aid: { label: "Entraide", types: ["mutual_aid_tip"] },
};

const CATEGORIES: { key: Category; label: string }[] = [
  { key: "all", label: "Tout" },
  { key: "care", label: "Soins" },
  { key: "dog", label: "Chien" },
  { key: "cat", label: "Chat" },
  { key: "home", label: "Maison" },
  { key: "season", label: "Saison" },
  { key: "breed", label: "Races" },
  { key: "aid", label: "Entraide" },
];

const TYPE_LABEL: Record<FactType, string> = {
  pet_care_tip: "Soins",
  dog_behavior_tip: "Chien",
  cat_behavior_tip: "Chat",
  home_care_tip: "Maison",
  seasonal_advice: "Saison",
  breed_did_you_know: "Races",
  mutual_aid_tip: "Entraide",
};

const DISCLAIMER =
  "Les conseils d'Alma sont donnés à titre informatif et ne remplacent pas l'avis d'un vétérinaire ou d'un professionnel qualifié. En cas de doute sur la santé ou le comportement de votre animal, consultez un professionnel.";

// Plage saisonnière : gère le cas où la fenêtre passe par décembre/janvier.
function isInSeason(start: number | null, end: number | null, month: number): boolean {
  if (!start || !end) return false;
  if (start <= end) return month >= start && month <= end;
  return month >= start || month <= end;
}

// Tirage déterministe (conseil du jour) à partir d'une date ISO.
function pickDaily<T>(items: T[]): T | null {
  if (!items.length) return null;
  const today = new Date().toISOString().slice(0, 10);
  let hash = 0;
  for (let i = 0; i < today.length; i++) hash = (hash * 31 + today.charCodeAt(i)) >>> 0;
  return items[hash % items.length];
}

function extractDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

function extractBreed(cf: Tip["context_filter"]): { breed: string; species: string } | null {
  if (!cf || typeof cf !== "object") return null;
  const anyCf = cf as Record<string, unknown>;
  const breed = typeof anyCf.breed === "string" ? anyCf.breed : null;
  const species = typeof anyCf.animal_species === "string" ? anyCf.animal_species : "dog";
  if (!breed) return null;
  return { breed, species };
}

export default function AlmaTips() {
  const [tips, setTips] = useState<Tip[]>([]);
  const [breedArticles, setBreedArticles] = useState<Map<string, string>>(new Map());
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState<Category>("all");
  const [query, setQuery] = useState("");
  const [visibleCount, setVisibleCount] = useState(24);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("alma_public_tips" as any)
        .select("id, fact_type, content, source_url, needs_pro_referral, seasonal_start_month, seasonal_end_month, context_filter")
        .limit(500);
      if (cancelled) return;
      const rows = ((data as unknown as Tip[]) || []).filter(Boolean);
      setTips(rows);

      // Précharge les slugs d'articles guide_race pour les tips "breed_did_you_know".
      const breeds = new Set<string>();
      for (const t of rows) {
        if (t.fact_type === "breed_did_you_know") {
          const b = extractBreed(t.context_filter);
          if (b) breeds.add(b.breed);
        }
      }
      if (breeds.size > 0) {
        const { data: articles } = await supabase
          .from("articles")
          .select("slug, title")
          .eq("category", "guide_race")
          .eq("published", true)
          .limit(500);
        if (!cancelled && articles) {
          const map = new Map<string, string>();
          for (const breed of breeds) {
            const needle = slugify(breed);
            const match = articles.find((a: any) => {
              const slug = String(a.slug || "").toLowerCase();
              return slug.includes(needle);
            });
            if (match) map.set(breed, (match as any).slug as string);
          }
          setBreedArticles(map);
        }
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const now = new Date();
  const currentMonth = now.getMonth() + 1;

  const seasonal = useMemo(
    () =>
      tips.filter(
        (t) =>
          t.fact_type === "seasonal_advice" &&
          isInSeason(t.seasonal_start_month, t.seasonal_end_month, currentMonth),
      ),
    [tips, currentMonth],
  );

  const dailyPick = useMemo(() => {
    const seasonalIds = new Set(seasonal.map((s) => s.id));
    const pool = tips.filter((t) => !seasonalIds.has(t.id));
    return pickDaily(pool.length > 0 ? pool : tips);
  }, [tips, seasonal]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return tips.filter((t) => {
      if (category !== "all") {
        const types = CATEGORY_META[category].types;
        if (!types.includes(t.fact_type)) return false;
      }
      if (q) {
        const hay: string[] = [t.content, TYPE_LABEL[t.fact_type] || ""];
        const breed = extractBreed(t.context_filter)?.breed;
        if (breed) hay.push(breed);
        if (!hay.join(" \u0001 ").toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [tips, category, query]);

  useEffect(() => {
    setVisibleCount(24);
  }, [category, query]);

  const renderTip = (t: Tip) => {
    const breed = t.fact_type === "breed_did_you_know" ? extractBreed(t.context_filter) : null;
    const raceSlug = breed ? breedArticles.get(breed.breed) : undefined;
    return (
      <Card key={t.id} className="h-full">
        <CardContent className="p-5 flex flex-col gap-3 h-full">
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-[10px] uppercase tracking-wider">
              {TYPE_LABEL[t.fact_type]}
            </Badge>
            {breed && (
              <span className="text-xs text-muted-foreground capitalize">{breed.breed}</span>
            )}
          </div>
          <p className="text-sm text-foreground/90 leading-relaxed whitespace-pre-line flex-1">
            {t.content}
          </p>
          {t.needs_pro_referral && (
            <p className="text-xs text-muted-foreground italic">
              En cas de doute, consultez un professionnel.
            </p>
          )}
          <div className="flex flex-col gap-1.5 pt-1">
            {t.source_url && (
              <a
                href={t.source_url}
                target="_blank"
                rel="noopener"
                className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
              >
                <ExternalLink className="h-3 w-3" />
                Source : {extractDomain(t.source_url)}
              </a>
            )}
            {raceSlug && (
              <Link
                to={`/actualites/${raceSlug}`}
                className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
              >
                Pour aller plus loin
                <ArrowRight className="h-3 w-3" />
              </Link>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Les conseils d'Alma",
    description:
      "Conseils pratiques pour la garde d'animaux, le comportement, la maison et l'entraide entre gens du coin.",
    url: "https://guardiens.fr/conseils",
    isPartOf: {
      "@type": "WebSite",
      name: "Guardiens",
      url: "https://guardiens.fr",
    },
  };

  return (
    <>
      <PageMeta
        title="Les conseils d'Alma"
        description="Les conseils d'Alma : soins, comportement chien et chat, maison, saison, races et entraide. Une bibliothèque de repères concis pour bien accueillir les animaux."
        path="/conseils"
        canonical="/conseils"
      />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <div className="min-h-screen bg-background flex flex-col">
        <PublicHeader />

        <main className="flex-1 min-w-0 px-[5%] md:px-[8%] py-8 md:py-12">
          <PageBreadcrumb items={[{ label: "Les conseils d'Alma" }]} />

          {/* Header */}
          <header className="flex flex-col md:flex-row items-start md:items-center gap-4 md:gap-6 mt-4 mb-6">
            <AlmaAvatar size={72} animateIn breathe />
            <div className="min-w-0">
              <h1 className="font-heading text-3xl md:text-4xl font-bold tracking-tight">
                Les conseils d'Alma
              </h1>
              <p className="text-muted-foreground mt-1 max-w-2xl">
                Je vous partage ici mes repères favoris pour bien accueillir un animal,
                choisir vos gestes du quotidien et vivre l'entraide entre gens du coin en confiance.
              </p>
            </div>
          </header>

          {/* Disclaimer */}
          <div className="mb-8 p-4 rounded-lg border border-warning/30 bg-warning/5 text-sm text-foreground/85">
            {DISCLAIMER}
          </div>

          {/* Conseils de saison */}
          {seasonal.length > 0 && (
            <section className="mb-10">
              <h2 className="font-heading text-xl md:text-2xl font-semibold mb-4">
                Conseils de saison
              </h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {seasonal.map(renderTip)}
              </div>
            </section>
          )}

          {/* Conseil du jour */}
          {dailyPick && (
            <section className="mb-10">
              <h2 className="font-heading text-xl md:text-2xl font-semibold mb-4">
                Le conseil du jour
              </h2>
              <div className="max-w-2xl">{renderTip(dailyPick)}</div>
            </section>
          )}

          {/* Filtres + recherche */}
          <section className="mb-6 space-y-4">
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map((c) => (
                <Button
                  key={c.key}
                  variant={category === c.key ? "default" : "outline"}
                  size="sm"
                  onClick={() => setCategory(c.key)}
                >
                  {c.label}
                </Button>
              ))}
            </div>
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Rechercher un conseil"
                className="pl-9"
              />
            </div>
          </section>

          {/* Liste complète */}
          <section>
            {loading ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="h-40 w-full" />
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                Aucun conseil ne correspond à votre recherche pour l'instant.
              </p>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {filtered.map(renderTip)}
              </div>
            )}
          </section>

          {/* Lien vers le hub Guides & Conseils */}
          <div className="mt-12 text-center">
            <Link
              to="/actualites"
              className="inline-flex items-center gap-2 text-primary hover:underline font-medium"
            >
              Explorer le hub Guides &amp; Conseils
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          {/* CTA proprio */}
          <aside className="mt-10 p-6 md:p-8 rounded-xl border border-border bg-card">
            <h2 className="font-heading text-xl md:text-2xl font-semibold mb-2">
              Confier votre animal ou votre maison en toute confiance
            </h2>
            <p className="text-muted-foreground mb-4 max-w-2xl">
              Guardiens reste gratuit tant que nous ne sommes pas satisfaits du service
              que nous vous offrons. Rejoignez les propriétaires qui trouvent leur gardien
              parmi les gens du coin.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button asChild>
                <Link to="/inscription?role=owner">Créer mon espace propriétaire</Link>
              </Button>
              <Button variant="outline" asChild>
                <Link to="/annonces">Voir les gardiens disponibles</Link>
              </Button>
            </div>
          </aside>
        </main>

        <PublicFooter />
      </div>
    </>
  );
}
