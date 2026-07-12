/**
 * ActivityAnalysisCard : analyse IA de l'activité admin (résumé + actions
 * suggérées). Chargée depuis `admin_activity_analysis` via l'edge function
 * `admin-activity-analysis`. Rafraîchissement manuel uniquement.
 */
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { Loader2, Sparkles, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";

type Priority = "haute" | "moyenne" | "basse";
interface ActionItem {
  title: string;
  why: string;
  priority: Priority;
  link: string;
}
interface Analysis {
  analysis: string;
  actions: ActionItem[];
  generated_at: string;
}

const PRIORITY_VARIANT: Record<Priority, "destructive" | "default" | "secondary"> = {
  haute: "destructive",
  moyenne: "default",
  basse: "secondary",
};

const PRIORITY_LABEL: Record<Priority, string> = {
  haute: "Priorité haute",
  moyenne: "Priorité moyenne",
  basse: "Priorité basse",
};

export function ActivityAnalysisCard() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = async (mode: "latest" | "refresh") => {
    const isRefresh = mode === "refresh";
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("admin-activity-analysis", {
        body: { mode },
      });
      if (error) throw error;
      setAnalysis((data as { analysis: Analysis | null })?.analysis ?? null);
      if (isRefresh) {
        toast({ title: "Analyse mise à jour", description: "L'IA a généré une nouvelle synthèse." });
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : "Erreur inconnue";
      toast({ title: "Analyse indisponible", description: message, variant: "destructive" });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    load("latest");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
        <div className="space-y-1">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Sparkles className="h-5 w-5 text-primary" />
            Analyse IA de l'activité
          </CardTitle>
          {analysis && (
            <p className="text-xs text-muted-foreground">
              Généré il y a {formatDistanceToNow(new Date(analysis.generated_at), { locale: fr })}
            </p>
          )}
        </div>
        {analysis && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => load("refresh")}
            disabled={refreshing}
          >
            {refreshing ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            Rafraîchir l'analyse
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-6">
        {loading ? (
          <div className="space-y-3">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-4/5" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        ) : !analysis ? (
          <div className="rounded-lg border border-dashed border-border p-6 text-center space-y-3">
            <p className="text-sm text-muted-foreground">
              Aucune analyse en cache. Générez la première synthèse de l'activité de la plateforme.
            </p>
            <Button onClick={() => load("refresh")} disabled={refreshing}>
              {refreshing ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4 mr-2" />
              )}
              Générer l'analyse
            </Button>
          </div>
        ) : (
          <>
            <p className="text-sm leading-relaxed text-foreground whitespace-pre-line">
              {analysis.analysis}
            </p>

            {analysis.actions.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-foreground">
                  Actions suggérées
                </h3>
                <ul className="space-y-3">
                  {analysis.actions.map((action, idx) => (
                    <li
                      key={idx}
                      className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 rounded-lg border border-border bg-card p-3"
                    >
                      <div className="space-y-1 flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant={PRIORITY_VARIANT[action.priority]}>
                            {PRIORITY_LABEL[action.priority]}
                          </Badge>
                          <span className="font-semibold text-sm text-foreground">
                            {action.title}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground">{action.why}</p>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => navigate(action.link)}
                        className="shrink-0"
                      >
                        Traiter
                      </Button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
