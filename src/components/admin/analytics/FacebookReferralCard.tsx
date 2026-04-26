import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Facebook, ThumbsUp, Meh, MessageSquare, X as XIcon } from "lucide-react";
import { format, subDays, startOfDay } from "date-fns";
import { fr } from "date-fns/locale";

interface Props {
  rangeDays: 1 | 7 | 30;
}

interface Row {
  event_type: string;
  metadata: any;
  source: string | null;
  created_at: string;
}

const FacebookReferralCard = ({ rangeDays }: Props) => {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    (async () => {
      const since = startOfDay(subDays(new Date(), rangeDays - 1)).toISOString();
      const { data, error } = await supabase
        .from("analytics_events")
        .select("event_type, metadata, source, created_at")
        .in("event_type", ["fb_referral_landing", "fb_referral_feedback", "fb_referral_dismissed"])
        .gte("created_at", since)
        .order("created_at", { ascending: false })
        .limit(1000);

      if (cancelled) return;
      if (!error && data) setRows(data as Row[]);
      setLoading(false);
    })();

    return () => { cancelled = true; };
  }, [rangeDays]);

  const stats = useMemo(() => {
    if (!rows) return null;

    const landings = rows.filter(r => r.event_type === "fb_referral_landing");
    const feedbacks = rows.filter(r => r.event_type === "fb_referral_feedback");
    const dismissed = rows.filter(r => r.event_type === "fb_referral_dismissed");

    const reactions = { useful: 0, meh: 0, comment: 0 };
    const comments: { text: string; at: string }[] = [];
    for (const f of feedbacks) {
      const r = f.metadata?.reaction;
      if (r === "useful" || r === "meh" || r === "comment") reactions[r]++;
      if (r === "comment" && f.metadata?.comment) {
        comments.push({ text: f.metadata.comment, at: f.created_at });
      }
    }

    const landingPaths: Record<string, number> = {};
    for (const l of landings) {
      const p = l.metadata?.landing_path || l.source || "(?)";
      landingPaths[p] = (landingPaths[p] || 0) + 1;
    }
    const topPaths = Object.entries(landingPaths)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    const responseRate = landings.length
      ? Math.round((feedbacks.length / landings.length) * 100)
      : 0;

    return {
      landings: landings.length,
      feedbacks: feedbacks.length,
      dismissed: dismissed.length,
      reactions,
      comments,
      topPaths,
      responseRate,
    };
  }, [rows]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Facebook className="h-5 w-5 text-primary" />
          Trafic Facebook (commentaires)
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading || !stats ? (
          <div className="flex justify-center py-10">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : stats.landings === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">
            Aucune visite identifiée depuis Facebook sur cette période.
            <br />
            <span className="text-xs">
              Astuce : ajoutez <code className="bg-muted px-1 rounded">?utm_source=facebook&utm_medium=comment</code> à vos liens.
            </span>
          </p>
        ) : (
          <div className="space-y-5">
            {/* KPIs */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Kpi label="Visites FB" value={stats.landings} />
              <Kpi label="Feedbacks" value={stats.feedbacks} hint={`${stats.responseRate}% de réponse`} />
              <Kpi label="Fermés" value={stats.dismissed} />
              <Kpi label="Commentaires" value={stats.comments.length} />
            </div>

            {/* Réactions */}
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground mb-2">Réactions</p>
              <div className="grid grid-cols-3 gap-2">
                <ReactionTile icon={ThumbsUp} label="Utile" value={stats.reactions.useful} tone="text-emerald-600" />
                <ReactionTile icon={Meh} label="Bof" value={stats.reactions.meh} tone="text-amber-600" />
                <ReactionTile icon={MessageSquare} label="Commenté" value={stats.reactions.comment} tone="text-primary" />
              </div>
            </div>

            {/* Pages d'arrivée */}
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground mb-2">Pages d'arrivée</p>
              <ul className="space-y-1">
                {stats.topPaths.map(([path, n]) => (
                  <li key={path} className="flex items-center justify-between text-sm border-b border-border/50 py-1">
                    <span className="font-mono text-xs truncate">{path}</span>
                    <span className="tabular-nums text-muted-foreground">{n}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Commentaires */}
            {stats.comments.length > 0 && (
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground mb-2">Commentaires reçus</p>
                <ul className="space-y-2">
                  {stats.comments.slice(0, 8).map((c, i) => (
                    <li key={i} className="bg-muted/40 rounded-md p-2 text-sm">
                      <p className="text-foreground">{c.text}</p>
                      <p className="text-[11px] text-muted-foreground mt-1">
                        {format(new Date(c.at), "d MMM yyyy 'à' HH:mm", { locale: fr })}
                      </p>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

const Kpi = ({ label, value, hint }: { label: string; value: number; hint?: string }) => (
  <div className="bg-muted/40 rounded-lg p-3 border border-border">
    <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
    <p className="text-2xl font-bold tabular-nums text-foreground mt-0.5">{value}</p>
    {hint && <p className="text-[11px] text-muted-foreground mt-0.5">{hint}</p>}
  </div>
);

const ReactionTile = ({ icon: Icon, label, value, tone }: {
  icon: any; label: string; value: number; tone: string;
}) => (
  <div className="border border-border rounded-lg p-3 flex flex-col items-center gap-1">
    <Icon className={`h-5 w-5 ${tone}`} />
    <span className="text-xs text-muted-foreground">{label}</span>
    <span className="text-lg font-bold tabular-nums text-foreground">{value}</span>
  </div>
);

export default FacebookReferralCard;
