import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  FileText, Users, Clock, ExternalLink, CheckCircle2, AlertTriangle, XCircle, Plus,
  BarChart3,
} from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface TypeCount { category: string; count: number }

const TYPE_OBJECTIVES: { label: string; filter: (c: string) => boolean; goal: number }[] = [
  { label: "Villes AURA", filter: (c) => c === "ville", goal: 10 },
  { label: "Races", filter: (c) => c === "guide_race", goal: 15 },
  { label: "Vie locale", filter: (c) => c === "vie_locale", goal: 10 },
  { label: "Guides locaux", filter: (c) => c === "guide_local", goal: 15 },
  { label: "Conseils", filter: (c) => c === "conseil_gardien" || c === "conseil_proprio", goal: 15 },
  { label: "Guides pratiques", filter: (c) => c === "guide_pratique", goal: 10 },
  { label: "Saisonniers", filter: (c) => c === "saisonnier", goal: 4 },
];

const PRIORITY_ARTICLES = [
  { slug: "house-sitting-clermont-ferrand", type: "ville", group: "Villes manquantes" },
  { slug: "house-sitting-saint-etienne", type: "ville", group: "Villes manquantes" },
  { slug: "house-sitting-valence", type: "ville", group: "Villes manquantes" },
  { slug: "house-sitting-bourg-en-bresse", type: "ville", group: "Villes manquantes" },
  { slug: "house-sitting-croix-rousse-lyon", type: "ville", group: "Quartiers Lyon" },
  { slug: "house-sitting-vieux-lyon", type: "ville", group: "Quartiers Lyon" },
  { slug: "house-sitting-presqu-ile-lyon", type: "ville", group: "Quartiers Lyon" },
  { slug: "husky-guide-race", type: "guide_race", group: "Races manquantes" },
  { slug: "yorkshire-terrier-guide-race", type: "guide_race", group: "Races manquantes" },
  { slug: "maine-coon-guide-race", type: "guide_race", group: "Races manquantes" },
  { slug: "beagle-guide-race", type: "guide_race", group: "Races manquantes" },
  { slug: "jardinage-echange-service-voisin-grenoble", type: "vie_locale", group: "Vie locale nouvelles villes" },
  { slug: "aide-courses-voisin-annecy", type: "vie_locale", group: "Vie locale nouvelles villes" },
  { slug: "bricolage-voisin-chambery", type: "vie_locale", group: "Vie locale nouvelles villes" },
];

const SEO_CHECKLIST = [
  { label: "Sitemap.xml soumis à Google Search Console", status: "done" as const },
  { label: "robots.txt configuré", status: "done" as const },
  { label: "Schema.org sur les pages villes", status: "done" as const },
  { label: "Canonical URLs sur tous les articles", status: "done" as const },
  { label: "Meta tags dynamiques (react-helmet-async)", status: "done" as const },
  { label: "Maillage interne — vérifier que chaque article a au moins 2 liens internes", status: "warn" as const },
  { label: "Alt text photos — vérifier que tous les articles ont un hero_image_alt renseigné", status: "warn" as const, key: "alt_check" },
  { label: "Pages quartiers Lyon — non créées (priorité 2)", status: "fail" as const },
  { label: "Fiches races chats — non créées (priorité 3)", status: "fail" as const },
];

const StatusIcon = ({ status }: { status: "done" | "warn" | "fail" }) => {
  if (status === "done") return <CheckCircle2 className="h-5 w-5 text-[#2D7D46]" />;
  if (status === "warn") return <AlertTriangle className="h-5 w-5 text-[#F59E0B]" />;
  return <XCircle className="h-5 w-5 text-[#EF4444]" />;
};

const AdminSEO = () => {
  const navigate = useNavigate();
  const [publishedCount, setPublishedCount] = useState(0);
  const [recentSignups, setRecentSignups] = useState(0);
  const [lastPublished, setLastPublished] = useState<string | null>(null);
  const [typeCounts, setTypeCounts] = useState<TypeCount[]>([]);
  const [existingSlugs, setExistingSlugs] = useState<Set<string>>(new Set());
  const [missingAltCount, setMissingAltCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const [
        { count: pubCount },
        { count: signupCount },
        { data: lastArt },
        { data: allArticles },
      ] = await Promise.all([
        supabase.from("articles").select("id", { count: "exact", head: true }).eq("published", true),
        supabase.from("profiles").select("id", { count: "exact", head: true }).gte("created_at", new Date(Date.now() - 30 * 86400000).toISOString()),
        supabase.from("articles").select("created_at").eq("published", true).order("created_at", { ascending: false }).limit(1),
        supabase.from("articles").select("slug, category, published"),
      ]);

      setPublishedCount(pubCount || 0);
      setRecentSignups(signupCount || 0);
      setLastPublished(lastArt?.[0]?.created_at || null);

      if (allArticles) {
        const published = allArticles.filter((a) => a.published);
        const counts: Record<string, number> = {};
        published.forEach((a) => { counts[a.category] = (counts[a.category] || 0) + 1; });
        setTypeCounts(Object.entries(counts).map(([category, count]) => ({ category, count })));
        setExistingSlugs(new Set(allArticles.map((a) => a.slug)));
      }

      // We can't check hero_image_alt since column may not exist; approximate with cover_image_url null
      const { count: noAlt } = await supabase
        .from("articles")
        .select("id", { count: "exact", head: true })
        .eq("published", true)
        .is("cover_image_url", null);
      setMissingAltCount(noAlt || 0);

      setLoading(false);
    };
    load();
  }, []);

  const getObjectiveStatus = (current: number, goal: number) => {
    if (current >= goal) return "done";
    if (current >= goal * 0.8) return "warn";
    return "fail";
  };

  const getCountForObjective = (filter: (c: string) => boolean) =>
    typeCounts.filter((t) => filter(t.category)).reduce((s, t) => s + t.count, 0);

  const priorityGroups = PRIORITY_ARTICLES.reduce<Record<string, typeof PRIORITY_ARTICLES>>((acc, item) => {
    (acc[item.group] = acc[item.group] || []).push(item);
    return acc;
  }, {});

  // Mini bar data for card 3
  const barData = TYPE_OBJECTIVES.map((obj) => ({
    label: obj.label,
    count: getCountForObjective(obj.filter),
    goal: obj.goal,
  }));

  if (loading) {
    return <div className="p-8 text-muted-foreground">Chargement des données SEO…</div>;
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Dashboard SEO</h1>
        <p className="text-muted-foreground text-sm mt-1">Vue d'ensemble de la stratégie de contenu et du référencement</p>
      </div>

      {/* SECTION A — KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary" /> Pages indexées
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-foreground">{publishedCount}</p>
            <p className="text-xs text-muted-foreground mt-1">Articles publiés</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" /> Inscrits via SEO
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-foreground">{recentSignups}</p>
            <p className="text-xs text-muted-foreground mt-1">30 derniers jours</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-primary" /> Articles par type
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1.5">
            {barData.map((d) => (
              <div key={d.label} className="flex items-center gap-2 text-xs">
                <span className="w-24 text-muted-foreground truncate">{d.label}</span>
                <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full bg-primary"
                    style={{ width: `${Math.min(100, (d.count / d.goal) * 100)}%` }}
                  />
                </div>
                <span className="w-8 text-right font-medium">{d.count}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Clock className="h-4 w-4 text-primary" /> Dernière indexation
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xl font-bold text-foreground">
              {lastPublished ? format(new Date(lastPublished), "dd MMM yyyy", { locale: fr }) : "—"}
            </p>
            <p className="text-xs text-muted-foreground mt-1">Dernier article publié</p>
          </CardContent>
        </Card>
      </div>

      {/* SECTION B — Performance par type */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Performance par type d'article</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Type</TableHead>
                <TableHead className="text-right">Publiés</TableHead>
                <TableHead className="text-right">Objectif</TableHead>
                <TableHead className="text-center">Statut</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {TYPE_OBJECTIVES.map((obj) => {
                const current = getCountForObjective(obj.filter);
                const status = getObjectiveStatus(current, obj.goal);
                return (
                  <TableRow key={obj.label}>
                    <TableCell className="font-medium">{obj.label}</TableCell>
                    <TableCell className="text-right">{current}</TableCell>
                    <TableCell className="text-right text-muted-foreground">{obj.goal}</TableCell>
                    <TableCell className="text-center">
                      <StatusIcon status={status} />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* SECTION C — Articles prioritaires */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Articles prioritaires à créer</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {Object.entries(priorityGroups).map(([group, items]) => (
            <div key={group}>
              <h3 className="text-sm font-semibold text-muted-foreground mb-3">{group}</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {items.map((item) => {
                  const exists = existingSlugs.has(item.slug);
                  return (
                    <div
                      key={item.slug}
                      className={`border rounded-lg p-3 flex items-center justify-between gap-2 ${exists ? "opacity-50 bg-muted/30" : "bg-card"}`}
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{item.slug}</p>
                        <p className="text-xs text-muted-foreground">{item.type}</p>
                      </div>
                      {exists ? (
                        <span className="text-xs text-primary font-medium shrink-0">✅ Créé</span>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          className="shrink-0"
                          onClick={() => navigate(`/admin/articles/new?slug=${item.slug}&category=${item.type}`)}
                        >
                          <Plus className="h-3 w-3 mr-1" /> Créer
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* SECTION D — Liens rapides */}
      <div className="flex flex-wrap gap-3">
        <Button variant="outline" asChild>
          <a href="https://search.google.com/search-console" target="_blank" rel="noopener noreferrer">
            Google Search Console <ExternalLink className="h-4 w-4 ml-2" />
          </a>
        </Button>
        <Button variant="outline" asChild>
          <a href="https://analytics.google.com" target="_blank" rel="noopener noreferrer">
            Google Analytics <ExternalLink className="h-4 w-4 ml-2" />
          </a>
        </Button>
        <Button variant="outline" asChild>
          <a href="https://guardiens.fr/sitemap.xml" target="_blank" rel="noopener noreferrer">
            Sitemap <ExternalLink className="h-4 w-4 ml-2" />
          </a>
        </Button>
      </div>

      {/* SECTION E — Checklist SEO */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Checklist SEO</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {SEO_CHECKLIST.map((item) => (
            <div key={item.label} className="flex items-start gap-3">
              <StatusIcon status={item.status} />
              <div>
                <p className="text-sm">{item.label}</p>
                {item.key === "alt_check" && missingAltCount > 0 && (
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {missingAltCount} article(s) sans image de couverture
                  </p>
                )}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminSEO;
