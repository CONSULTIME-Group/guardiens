import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { Loader2, X } from "lucide-react";

interface PhotoQualityResult {
  score: number;
  verdict: "excellent" | "bon" | "moyen" | "faible";
  issues: string[];
  suggestions: string[];
  summary: string;
}

const ISSUE_LABELS: Record<string, string> = {
  flou: "Image floue",
  sombre: "Trop sombre",
  surexposée: "Surexposée",
  trop_loin: "Sujet trop éloigné",
  cadrage_serré: "Cadrage trop serré",
  désordre: "Désordre visible",
  vide: "Pièce vide / sans vie",
  mauvaise_perspective: "Perspective déformée",
  basse_résolution: "Résolution faible",
  hors_sujet: "Hors sujet",
};

interface Props {
  photos: string[];
}

const PhotoQualityChecker = ({ photos }: Props) => {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<Array<{ url: string; result?: PhotoQualityResult; error?: string }>>([]);

  const runAnalysis = async () => {
    if (!photos.length) {
      toast({ title: "Aucune photo à analyser", variant: "destructive" });
      return;
    }
    setOpen(true);
    setLoading(true);
    const init = photos.map((url) => ({ url }));
    setResults(init);

    const updated = [...init];
    for (let i = 0; i < photos.length; i++) {
      try {
        const { data, error } = await supabase.functions.invoke("analyze-photo-quality", {
          body: { imageUrl: photos[i] },
        });
        if (error) throw error;
        if (data?.error) throw new Error(data.error);
        updated[i] = { url: photos[i], result: data as PhotoQualityResult };
      } catch (e) {
        updated[i] = { url: photos[i], error: e instanceof Error ? e.message : "Erreur" };
      }
      setResults([...updated]);
    }
    setLoading(false);
  };

  const verdictColor = (v: string) => {
    switch (v) {
      case "excellent": return "text-success";
      case "bon": return "text-success";
      case "moyen": return "text-warning";
      case "faible": return "text-destructive";
      default: return "text-muted-foreground";
    }
  };

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={runAnalysis}
        disabled={!photos.length}
      >
        Évaluer la qualité de mes photos
      </Button>

      {open && (
        <div
          className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => !loading && setOpen(false)}
        >
          <div
            className="bg-card rounded-2xl border border-border max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-heading font-bold text-lg">Évaluation de vos photos</h3>
                <p className="text-sm text-muted-foreground">
                  Analyse automatique : luminosité, netteté, cadrage, mise en valeur.
                </p>
              </div>
              <button
                onClick={() => setOpen(false)}
                disabled={loading}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3">
              {results.map((r, i) => (
                <div key={i} className="flex gap-3 p-3 rounded-xl border border-border">
                  <img
                    src={r.url}
                    alt=""
                    className="w-20 h-20 rounded-lg object-cover flex-shrink-0"
                  />
                  <div className="flex-1 min-w-0 space-y-1.5">
                    {!r.result && !r.error && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        Analyse en cours…
                      </div>
                    )}
                    {r.error && (
                      <p className="text-sm text-destructive">{r.error}</p>
                    )}
                    {r.result && (
                      <>
                        <div className="flex items-center gap-3">
                          <span className={`font-heading font-bold text-base ${verdictColor(r.result.verdict)}`}>
                            {r.result.score}/100
                          </span>
                          <span className={`text-xs font-medium uppercase tracking-wide ${verdictColor(r.result.verdict)}`}>
                            {r.result.verdict}
                          </span>
                        </div>
                        <Progress value={r.result.score} className="h-1.5" />
                        <p className="text-sm text-foreground">{r.result.summary}</p>
                        {r.result.issues.length > 0 && (
                          <div className="flex flex-wrap gap-1 pt-0.5">
                            {r.result.issues.map((iss) => (
                              <span
                                key={iss}
                                className="px-2 py-0.5 rounded-full bg-destructive/10 text-destructive text-[11px] font-medium"
                              >
                                {ISSUE_LABELS[iss] ?? iss}
                              </span>
                            ))}
                          </div>
                        )}
                        {r.result.suggestions.length > 0 && (
                          <ul className="text-xs text-muted-foreground space-y-0.5 list-disc pl-4 pt-1">
                            {r.result.suggestions.map((s, idx) => (
                              <li key={idx}>{s}</li>
                            ))}
                          </ul>
                        )}
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {!loading && (
              <Button onClick={() => setOpen(false)} variant="outline" className="w-full">
                Fermer
              </Button>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default PhotoQualityChecker;
