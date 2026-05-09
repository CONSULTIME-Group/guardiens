import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  sequenceKey: string;
  sequenceLabel: string;
  sinceIso: string;
}

interface JourneyRow {
  id: string;
  user_id: string;
  status: string;
  current_step: number;
  exit_reason: string | null;
  started_at: string;
  exited_at: string | null;
  profiles: { first_name: string | null; last_name: string | null; email: string | null } | null;
}

interface StepLogRow {
  journey_id: string;
  step_order: number;
  template_name: string;
  sent: boolean;
  reason: string | null;
  message_id: string | null;
  created_at: string;
}

interface EventRow {
  message_id: string;
  event_type: "open" | "click";
}

const STATUS_TONE: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  active: "default",
  exited: "secondary",
  dropped: "outline",
  failed: "destructive",
};

const STATUS_LABEL: Record<string, string> = {
  active: "En cours",
  exited: "Sorti (objectif)",
  dropped: "Abandonné",
  failed: "Échec",
};

export const SequenceRecipientsDialog = ({ open, onOpenChange, sequenceKey, sequenceLabel, sinceIso }: Props) => {
  const [loading, setLoading] = useState(false);
  const [journeys, setJourneys] = useState<JourneyRow[]>([]);
  const [stepLogs, setStepLogs] = useState<StepLogRow[]>([]);
  const [events, setEvents] = useState<EventRow[]>([]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      // 1) Parcours de la séquence sur la période
      const jr = await supabase
        .from("user_journeys")
        .select("id, user_id, status, current_step, exit_reason, started_at, exited_at, profiles!user_journeys_user_id_fkey(first_name, last_name, email)")
        .eq("sequence_key", sequenceKey)
        .gte("started_at", sinceIso)
        .order("started_at", { ascending: false })
        .limit(200);
      const journeyRows = (jr.data ?? []) as unknown as JourneyRow[];

      // 2) Logs des étapes pour ces parcours
      const journeyIds = journeyRows.map((j) => j.id);
      let logsRows: StepLogRow[] = [];
      let evRows: EventRow[] = [];
      if (journeyIds.length > 0) {
        const lr = await supabase
          .from("journey_step_log")
          .select("journey_id, step_order, template_name, sent, reason, message_id, created_at")
          .in("journey_id", journeyIds)
          .order("created_at", { ascending: true });
        logsRows = (lr.data ?? []) as StepLogRow[];

        // 3) Engagement events sur les message_ids de ces logs
        const mids = Array.from(new Set(logsRows.map((l) => l.message_id).filter(Boolean) as string[]));
        if (mids.length > 0) {
          const er = await supabase
            .from("email_engagement_events")
            .select("message_id, event_type")
            .in("message_id", mids);
          evRows = (er.data ?? []) as EventRow[];
        }
      }

      if (!cancelled) {
        setJourneys(journeyRows);
        setStepLogs(logsRows);
        setEvents(evRows);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, sequenceKey, sinceIso]);

  const eventsByMid = new Map<string, { open: boolean; click: boolean }>();
  for (const e of events) {
    const r = eventsByMid.get(e.message_id) ?? { open: false, click: false };
    if (e.event_type === "open") r.open = true;
    if (e.event_type === "click") r.click = true;
    eventsByMid.set(e.message_id, r);
  }

  const logsByJourney = new Map<string, StepLogRow[]>();
  for (const l of stepLogs) {
    const arr = logsByJourney.get(l.journey_id) ?? [];
    arr.push(l);
    logsByJourney.set(l.journey_id, arr);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{sequenceLabel} — destinataires</DialogTitle>
          <DialogDescription>
            Liste des utilisateurs entrés dans le parcours sur la période, avec leur progression et engagement.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : journeys.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">
            Aucun destinataire sur la période sélectionnée.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Utilisateur</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Étape</TableHead>
                <TableHead>Timeline (envoyé / ouvert / cliqué)</TableHead>
                <TableHead>Démarrage</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {journeys.map((j) => {
                const name =
                  [j.profiles?.first_name, j.profiles?.last_name].filter(Boolean).join(" ") ||
                  j.profiles?.email ||
                  "—";
                const logs = logsByJourney.get(j.id) ?? [];
                return (
                  <TableRow key={j.id}>
                    <TableCell>
                      <Link to={`/gardiens/${j.user_id}`} className="text-foreground hover:underline">
                        <span className="font-medium">{name}</span>
                      </Link>
                      {j.profiles?.email && (
                        <p className="text-[11px] text-muted-foreground">{j.profiles.email}</p>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={STATUS_TONE[j.status] ?? "outline"}>
                        {STATUS_LABEL[j.status] ?? j.status}
                      </Badge>
                      {j.exit_reason && (
                        <p className="text-[10px] text-muted-foreground mt-1">{j.exit_reason}</p>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {j.current_step ?? "—"}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1.5">
                        {logs.length === 0 && (
                          <span className="text-xs text-muted-foreground">aucun envoi</span>
                        )}
                        {logs.map((l, idx) => {
                          const ev = l.message_id ? eventsByMid.get(l.message_id) : undefined;
                          const open = !!ev?.open;
                          const click = !!ev?.click;
                          const tone = !l.sent
                            ? "bg-muted text-muted-foreground"
                            : click
                              ? "bg-success/15 text-success border border-success/30"
                              : open
                                ? "bg-primary/10 text-primary border border-primary/25"
                                : "bg-muted/50 text-foreground border border-border";
                          return (
                            <span
                              key={idx}
                              className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-mono ${tone}`}
                              title={`Étape ${l.step_order} · ${l.template_name} · ${
                                l.sent ? "envoyé" : `non envoyé (${l.reason ?? "—"})`
                              }${open ? " · ouvert" : ""}${click ? " · cliqué" : ""}`}
                            >
                              {l.step_order}
                              {l.sent && <>·{open ? "O" : "·"}{click ? "C" : ""}</>}
                            </span>
                          );
                        })}
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                      {format(new Date(j.started_at), "dd/MM HH:mm", { locale: fr })}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </DialogContent>
    </Dialog>
  );
};
