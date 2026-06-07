import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { CheckCircle2, XCircle } from "lucide-react";

interface Submission {
  id: string;
  submitted_at: string;
  url_count: number;
  sample_urls: string[];
  status_code: number | null;
  ok: boolean;
  source: string | null;
}

/**
 * Historique des dernières soumissions IndexNow.
 * Lecture admin uniquement (RLS).
 */
export default function IndexNowHistory() {
  const [rows, setRows] = useState<Submission[] | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("indexnow_submissions" as any)
        .select("id, submitted_at, url_count, sample_urls, status_code, ok, source")
        .order("submitted_at", { ascending: false })
        .limit(20);
      setRows((data as unknown as Submission[]) ?? []);
    })();
  }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Historique IndexNow (20 dernières)</CardTitle>
      </CardHeader>
      <CardContent>
        {rows === null ? (
          <p className="text-sm text-muted-foreground">Chargement…</p>
        ) : rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucune soumission enregistrée.</p>
        ) : (
          <div className="space-y-1.5 text-xs">
            {rows.map((r) => (
              <div key={r.id} className="flex items-center gap-3 border-b border-border/40 pb-1.5">
                {r.ok ? (
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                ) : (
                  <XCircle className="h-3.5 w-3.5 text-destructive shrink-0" />
                )}
                <span className="text-muted-foreground shrink-0 w-20">
                  {r.status_code ?? "–"}
                </span>
                <span className="font-mono shrink-0 w-16 text-right">{r.url_count} URLs</span>
                <span className="text-muted-foreground shrink-0 w-24 truncate">
                  {r.source ?? "manual"}
                </span>
                <span className="text-muted-foreground truncate flex-1 min-w-0">
                  {r.sample_urls.slice(0, 2).map((u) => u.replace(/^https?:\/\/[^/]+/, "")).join(" · ")}
                </span>
                <span className="text-muted-foreground shrink-0">
                  {formatDistanceToNow(new Date(r.submitted_at), { addSuffix: true, locale: fr })}
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
