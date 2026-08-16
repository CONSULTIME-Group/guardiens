import { useState } from "react";
import { AlertTriangle, AlertOctagon, Mail, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SignalPriorityBadge } from "./PriorityBadge";
import { supabase } from "@/integrations/supabase/client";

export interface StaleDraftSignal {
  id: string;
  signal_type: string;
  severity: "critical" | "warning" | "info";
  entity_type: string;
  entity_id: string;
  detected_at: string;
  metadata: {
    sit_title?: string | null;
    city?: string | null;
    start_date?: string | null;
    owner_id?: string;
    owner_first_name?: string | null;
    owner_email?: string;
    days_since_created?: number;
    days_until_start?: number | null;
  };
}

interface Props {
  signal: StaleDraftSignal;
}

export const StaleDraftCard = ({ signal }: Props) => {
  const qc = useQueryClient();
  const [sending, setSending] = useState(false);
  const [ignoring, setIgnoring] = useState(false);

  const m = signal.metadata ?? {};
  const isCritical = signal.severity === "critical";
  const Icon = isCritical ? AlertOctagon : AlertTriangle;
  const days = m.days_since_created ?? 0;
  const ownerEmail = m.owner_email ?? "";
  const sitId = signal.entity_id;
  const startLabel = m.start_date
    ? new Date(`${m.start_date}T00:00:00`).toLocaleDateString("fr-FR", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : "dates non renseignées";

  const invalidate = () => qc.invalidateQueries({ queryKey: ["admin_dashboard_snapshot"] });

  const handleSendReminder = async () => {
    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke("nudge-stale-draft", {
        body: { mode: "manual", sit_id: sitId, signal_id: signal.id },
      });
      if (error) throw error;
      const payload = data as { sent?: boolean; error?: string | null; recipient?: string };
      if (payload?.sent) {
        toast.success(`Relance envoyée à ${payload.recipient ?? ownerEmail}.`);
      } else {
        const reason = payload?.error === "opted_out"
          ? "Ce propriétaire s'est désinscrit des emails produit."
          : payload?.error === "suppressed"
            ? "Cet email est en liste de suppression."
            : payload?.error === "deferred"
              ? "Envoi différé, le plafond de fréquence est atteint."
              : payload?.error === "already_sent"
                ? "Une relance a déjà été envoyée récemment."
                : "Envoi impossible pour le moment.";
        toast.error(reason);
      }
      invalidate();
    } catch (e) {
      toast.error(`Impossible d'envoyer la relance : ${(e as Error).message}`);
    } finally {
      setSending(false);
    }
  };

  const handleIgnore = async () => {
    setIgnoring(true);
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase
      .from("admin_signals")
      .update({
        resolved_at: new Date().toISOString(),
        action_taken: "dismissed",
        admin_id: user?.id ?? null,
      })
      .eq("id", signal.id);
    setIgnoring(false);
    if (error) {
      toast.error("Impossible d'ignorer ce signal.");
      return;
    }
    toast.success("Signal ignoré.");
    invalidate();
  };

  const tone = isCritical
    ? "border-destructive/30 bg-destructive/5"
    : "border-warning/30 bg-warning/5";
  const iconTone = isCritical
    ? "bg-destructive/15 text-destructive"
    : "bg-warning/15 text-warning-foreground";



  return (
    <Card className={tone}>
      <CardContent className="pt-4 pb-4">
        <div className="flex items-start gap-3">
          <div className={`rounded-full p-2 shrink-0 ${iconTone}`}>
            <Icon className="h-4 w-4" aria-hidden />
          </div>
          <div className="flex-1 min-w-0 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-sm font-semibold text-foreground">
                Annonce en brouillon
              </h3>
              <SignalPriorityBadge severity={signal.severity} />
            </div>
            <div className="text-sm text-foreground">
              «&nbsp;{m.sit_title || "Annonce sans titre"}&nbsp;»
              {m.city ? ` à ${m.city}` : ""}, début le {startLabel}.
            </div>
            <p className="text-xs text-muted-foreground">
              Propriétaire : {m.owner_first_name || "propriétaire"} ({ownerEmail || "email inconnu"}) · brouillon depuis {days} jour{days > 1 ? "s" : ""}
            </p>
            <div className="flex flex-wrap gap-2 pt-1">
              <Button size="sm" onClick={handleSendReminder} disabled={sending || !ownerEmail}>
                <Mail className="h-4 w-4 mr-2" />
                {sending ? "Envoi..." : "Relancer"}
              </Button>
              <Button size="sm" variant="ghost" asChild>
                <a href={`/admin/listings?sit=${sitId}`}>
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Voir l'annonce
                </a>
              </Button>
              <Button size="sm" variant="ghost" onClick={handleIgnore} disabled={ignoring}>
                Ignorer
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
