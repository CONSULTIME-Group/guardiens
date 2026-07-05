import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger,
} from "@/components/ui/dialog";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { ArrowRight, ArrowLeft, ExternalLink, Mail, Trash2 } from "lucide-react";

type Status = "new" | "in_progress" | "done" | "archived";
type ReqType = "city" | "breed" | "places" | "pros" | "other";

interface AnalysisRequest {
  id: string;
  request_type: ReqType;
  subject: string;
  details: string | null;
  email: string | null;
  city_context: string | null;
  status: Status;
  admin_notes: string | null;
  delivered_at: string | null;
  delivered_url: string | null;
  created_at: string;
  updated_at: string;
}

const STATUSES: { key: Status; label: string; next?: Status; prev?: Status }[] = [
  { key: "new", label: "Nouvelles", next: "in_progress" },
  { key: "in_progress", label: "En cours", next: "done", prev: "new" },
  { key: "done", label: "Livrées", next: "archived", prev: "in_progress" },
  { key: "archived", label: "Archivées", prev: "done" },
];

const TYPE_LABELS: Record<ReqType, string> = {
  city: "Ville",
  breed: "Race",
  places: "Lieux",
  pros: "Pros",
  other: "Autre",
};

const TYPE_COLORS: Record<ReqType, string> = {
  city: "bg-blue-50 text-blue-700 border-blue-200",
  breed: "bg-amber-50 text-amber-700 border-amber-200",
  places: "bg-emerald-50 text-emerald-700 border-emerald-200",
  pros: "bg-purple-50 text-purple-700 border-purple-200",
  other: "bg-slate-50 text-slate-700 border-slate-200",
};

export default function AdminAnalysisRequests() {
  const queryClient = useQueryClient();
  const [typeFilter, setTypeFilter] = useState<ReqType | "all">("all");

  const { data: requests = [], isLoading } = useQuery({
    queryKey: ["admin-analysis-requests"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("analysis_requests")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as AnalysisRequest[];
    },
  });

  const filtered = useMemo(
    () => (typeFilter === "all" ? requests : requests.filter((r) => r.request_type === typeFilter)),
    [requests, typeFilter],
  );

  const byStatus = useMemo(() => {
    const map: Record<Status, AnalysisRequest[]> = { new: [], in_progress: [], done: [], archived: [] };
    filtered.forEach((r) => map[r.status]?.push(r));
    return map;
  }, [filtered]);

  const kpi = useMemo(() => {
    const total30 = requests.filter(
      (r) => Date.now() - new Date(r.created_at).getTime() < 30 * 86400_000,
    ).length;
    const delivered = requests.filter((r) => r.delivered_at);
    const medianDays =
      delivered.length === 0
        ? null
        : (() => {
            const days = delivered
              .map((r) => (new Date(r.delivered_at!).getTime() - new Date(r.created_at).getTime()) / 86400_000)
              .sort((a, b) => a - b);
            return days[Math.floor(days.length / 2)];
          })();
    const byType: Record<ReqType, number> = { city: 0, breed: 0, places: 0, pros: 0, other: 0 };
    requests.forEach((r) => (byType[r.request_type] = (byType[r.request_type] || 0) + 1));
    return { total30, medianDays, byType };
  }, [requests]);

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: Status }) => {
      const { error } = await (supabase as any)
        .from("analysis_requests")
        .update({ status })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-analysis-requests"] });
      window.dispatchEvent(new Event("admin-badges-refresh"));
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deliver = useMutation({
    mutationFn: async ({ id, url, notes }: { id: string; url: string; notes: string }) => {
      const { error } = await (supabase as any)
        .from("analysis_requests")
        .update({
          status: "done",
          delivered_at: new Date().toISOString(),
          delivered_url: url || null,
          admin_notes: notes || null,
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-analysis-requests"] });
      window.dispatchEvent(new Event("admin-badges-refresh"));
      toast.success("Demande marquée livrée");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("analysis_requests").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-analysis-requests"] });
      window.dispatchEvent(new Event("admin-badges-refresh"));
      toast.success("Supprimée");
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
          Demandes d'analyse
        </h1>
        <p className="text-muted-foreground text-sm">
          Formulaire public de l'article « Inventaire vivant » et de l'observatoire.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Card>
          <CardContent className="p-4">
            <p className="text-2xl font-bold text-primary">{kpi.total30}</p>
            <p className="text-xs text-muted-foreground">Demandes reçues sur 30 j</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-2xl font-bold text-primary">
              {kpi.medianDays === null ? "–" : `${Math.round(kpi.medianDays)} j`}
            </p>
            <p className="text-xs text-muted-foreground">Délai médian de livraison</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground mb-2">Répartition par type</p>
            <div className="flex flex-wrap gap-1.5">
              {(Object.keys(TYPE_LABELS) as ReqType[]).map((t) => (
                <Badge key={t} variant="outline" className="text-[10px]">
                  {TYPE_LABELS[t]} {kpi.byType[t] || 0}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-wrap gap-2 items-center">
        <span className="text-xs text-muted-foreground mr-2">Filtrer :</span>
        <Button
          size="sm"
          variant={typeFilter === "all" ? "default" : "outline"}
          onClick={() => setTypeFilter("all")}
        >
          Tous
        </Button>
        {(Object.keys(TYPE_LABELS) as ReqType[]).map((t) => (
          <Button
            key={t}
            size="sm"
            variant={typeFilter === t ? "default" : "outline"}
            onClick={() => setTypeFilter(t)}
          >
            {TYPE_LABELS[t]}
          </Button>
        ))}
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-64 bg-muted animate-pulse rounded-lg" />
          ))}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {STATUSES.map((col) => (
            <Card key={col.key} className="flex flex-col">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center justify-between">
                  <span>{col.label}</span>
                  <Badge variant="secondary">{byStatus[col.key].length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="flex-1 space-y-2 min-h-[100px]">
                {byStatus[col.key].length === 0 && (
                  <p className="text-xs text-muted-foreground italic">Rien ici</p>
                )}
                {byStatus[col.key].map((r) => (
                  <RequestCard
                    key={r.id}
                    r={r}
                    onPrev={col.prev ? () => updateStatus.mutate({ id: r.id, status: col.prev! }) : undefined}
                    onNext={col.next ? () => updateStatus.mutate({ id: r.id, status: col.next! }) : undefined}
                    onDeliver={
                      col.key === "in_progress"
                        ? (url, notes) => deliver.mutate({ id: r.id, url, notes })
                        : undefined
                    }
                    onDelete={() => del.mutate(r.id)}
                  />
                ))}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function RequestCard({
  r,
  onPrev,
  onNext,
  onDeliver,
  onDelete,
}: {
  r: AnalysisRequest;
  onPrev?: () => void;
  onNext?: () => void;
  onDeliver?: (url: string, notes: string) => void;
  onDelete: () => void;
}) {
  const [url, setUrl] = useState(r.delivered_url || "");
  const [notes, setNotes] = useState(r.admin_notes || "");
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-lg border border-border bg-background p-3 text-sm space-y-2">
      <div className="flex items-center gap-2 flex-wrap">
        <Badge className={`text-[10px] border ${TYPE_COLORS[r.request_type]}`} variant="outline">
          {TYPE_LABELS[r.request_type]}
        </Badge>
        <span className="text-[10px] text-muted-foreground">
          {formatDistanceToNow(new Date(r.created_at), { addSuffix: true, locale: fr })}
        </span>
      </div>
      <p className="font-medium text-foreground line-clamp-2">{r.subject}</p>
      {r.details && (
        <p className="text-xs text-muted-foreground line-clamp-3">{r.details}</p>
      )}
      {r.email && (
        <p className="text-[11px] text-muted-foreground flex items-center gap-1">
          <Mail className="h-3 w-3" />
          <a href={`mailto:${r.email}`} className="hover:underline">{r.email}</a>
        </p>
      )}
      {r.delivered_url && (
        <a
          href={r.delivered_url}
          target="_blank"
          rel="noopener"
          className="text-[11px] text-primary hover:underline flex items-center gap-1"
        >
          <ExternalLink className="h-3 w-3" /> URL livrée
        </a>
      )}
      <div className="flex items-center gap-1 pt-1 border-t border-border">
        {onPrev && (
          <Button size="icon" variant="ghost" onClick={onPrev} title="Étape précédente">
            <ArrowLeft className="h-3.5 w-3.5" />
          </Button>
        )}
        {onDeliver && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm" variant="default" className="text-xs h-7">
                Livrer
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Livrer cette demande</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-medium mb-1 block">URL publiée (facultatif)</label>
                  <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://guardiens.fr/…" />
                </div>
                <div>
                  <label className="text-xs font-medium mb-1 block">Notes internes</label>
                  <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)}>Annuler</Button>
                <Button
                  onClick={() => {
                    onDeliver(url, notes);
                    setOpen(false);
                  }}
                >
                  Marquer livré
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
        {onNext && !onDeliver && (
          <Button size="icon" variant="ghost" onClick={onNext} title="Étape suivante">
            <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        )}
        <Button
          size="icon"
          variant="ghost"
          onClick={onDelete}
          title="Supprimer"
          className="ml-auto text-muted-foreground hover:text-destructive"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}
