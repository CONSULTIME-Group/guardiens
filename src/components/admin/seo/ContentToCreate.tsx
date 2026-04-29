import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { CheckCircle2, AlertTriangle, XCircle, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface TypeCount { category: string; count: number }

const TYPE_OBJECTIVES = [
  { label: "Pages villes", filter: (c: string) => c === "ville", goal: 10, priority: "high" as const },
  { label: "Races", filter: (c: string) => c === "guide_race", goal: 15, priority: "medium" as const },
  { label: "Guides locaux", filter: (c: string) => c === "guide_local", goal: 15, priority: "medium" as const },
  { label: "Vie locale", filter: (c: string) => c === "vie_locale", goal: 10, priority: "low" as const },
  { label: "Conseils", filter: (c: string) => c === "conseil_gardien" || c === "conseil_proprio", goal: 15, priority: "low" as const },
  { label: "Guides pratiques", filter: (c: string) => c === "guide_pratique", goal: 10, priority: "low" as const },
  { label: "Saisonniers", filter: (c: string) => c === "saisonnier", goal: 4, priority: "low" as const },
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
  { slug: "jardinage-entraide-quartier-grenoble", type: "vie_locale", group: "Vie locale nouvelles villes" },
  { slug: "aide-courses-entraide-annecy", type: "vie_locale", group: "Vie locale nouvelles villes" },
  { slug: "bricolage-entraide-chambery", type: "vie_locale", group: "Vie locale nouvelles villes" },
];

const PRIORITY_BADGES = {
  high: { label: "🔴 Haute", className: "bg-red-100 text-red-700" },
  medium: { label: "🟠 Moyenne", className: "bg-orange-100 text-orange-700" },
  low: { label: "🟡 Basse", className: "bg-yellow-100 text-yellow-700" },
};

const SLUG_LABELS: Record<string, string> = {
  "house-sitting-clermont-ferrand": "Clermont-Ferrand",
  "house-sitting-saint-etienne": "Saint-Étienne",
  "house-sitting-valence": "Valence",
  "house-sitting-bourg-en-bresse": "Bourg-en-Bresse",
  "house-sitting-croix-rousse-lyon": "Croix-Rousse (Lyon)",
  "house-sitting-vieux-lyon": "Vieux-Lyon",
  "house-sitting-presqu-ile-lyon": "Presqu'île (Lyon)",
  "husky-guide-race": "Husky",
  "yorkshire-terrier-guide-race": "Yorkshire Terrier",
  "beagle-guide-race": "Beagle",
  "maine-coon-guide-race": "Maine Coon",
  "jardinage-entraide-quartier-grenoble": "Jardinage & échange — Grenoble",
  "aide-courses-entraide-annecy": "Aide courses — Annecy",
  "bricolage-entraide-chambery": "Bricolage — Chambéry",
};

function humanizeSlug(slug: string): string {
  if (SLUG_LABELS[slug]) return SLUG_LABELS[slug];
  return slug
    .replace(/-/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

const StatusIcon = ({ status }: { status: "done" | "warn" | "fail" }) => {
  if (status === "done") return <CheckCircle2 className="h-5 w-5 text-emerald-600" />;
  if (status === "warn") return <AlertTriangle className="h-5 w-5 text-orange-500" />;
  return <XCircle className="h-5 w-5 text-red-500" />;
};

const ContentToCreate = () => {
  const navigate = useNavigate();
  const [typeCounts, setTypeCounts] = useState<TypeCount[]>([]);
  const [existingSlugs, setExistingSlugs] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const { data: allArticles } = await supabase
        .from("articles")
        .select("slug, category, published");

      if (allArticles) {
        const published = allArticles.filter((a) => a.published);
        const counts: Record<string, number> = {};
        published.forEach((a) => { counts[a.category] = (counts[a.category] || 0) + 1; });
        setTypeCounts(Object.entries(counts).map(([category, count]) => ({ category, count })));
        setExistingSlugs(new Set(allArticles.map((a) => a.slug)));
      }
      setLoading(false);
    };
    load();
  }, []);

  const getObjectiveStatus = (current: number, goal: number) => {
    if (current >= goal) return "done" as const;
    if (current >= goal * 0.8) return "warn" as const;
    return "fail" as const;
  };

  const getCountForObjective = (filter: (c: string) => boolean) =>
    typeCounts.filter((t) => filter(t.category)).reduce((s, t) => s + t.count, 0);

  const priorityGroups = PRIORITY_ARTICLES.reduce<Record<string, typeof PRIORITY_ARTICLES>>((acc, item) => {
    (acc[item.group] = acc[item.group] || []).push(item);
    return acc;
  }, {});

  const missingCount = PRIORITY_ARTICLES.filter((a) => !existingSlugs.has(a.slug)).length;

  if (loading) return null;

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Objectifs par type d'article</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Type</TableHead>
                <TableHead className="text-right">Publiés</TableHead>
                <TableHead className="text-right">Objectif</TableHead>
                <TableHead className="text-right">Manquants</TableHead>
                <TableHead className="text-center">Priorité</TableHead>
                <TableHead className="text-center">Statut</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {TYPE_OBJECTIVES.map((obj) => {
                const current = getCountForObjective(obj.filter);
                const status = getObjectiveStatus(current, obj.goal);
                const missing = Math.max(0, obj.goal - current);
                const priorityBadge = PRIORITY_BADGES[obj.priority];
                return (
                  <TableRow key={obj.label}>
                    <TableCell className="font-medium">{obj.label}</TableCell>
                    <TableCell className="text-right">{current}</TableCell>
                    <TableCell className="text-right text-muted-foreground">{obj.goal}</TableCell>
                    <TableCell className="text-right">
                      {missing > 0 ? <span className="font-medium text-red-500">{missing}</span> : "—"}
                    </TableCell>
                    <TableCell className="text-center">
                      {status === "done" ? (
                        <Badge className="bg-emerald-100 text-emerald-700 text-[10px]">
                          ✅ Atteint
                        </Badge>
                      ) : (
                        <Badge className={`text-[10px] ${priorityBadge.className}`}>
                          {priorityBadge.label}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-center"><StatusIcon status={status} /></TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

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
                  const label = humanizeSlug(item.slug);
                  return (
                    <div
                      key={item.slug}
                      className={`border rounded-lg p-3 flex items-center justify-between gap-2 ${exists ? "opacity-50 bg-muted/30" : "bg-card"}`}
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{label}</p>
                        <p className="text-xs text-muted-foreground truncate">{item.slug}</p>
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
    </>
  );
};

export { PRIORITY_ARTICLES };
export default ContentToCreate;
