import { useState } from "react";
import { AlertTriangle, AlertOctagon, Mail, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";

export interface PendingApplicationSignal {
  id: string;
  signal_type: string;
  severity: "critical" | "warning" | "info";
  entity_type: string;
  entity_id: string;
  detected_at: string;
  metadata: {
    sit_id?: string;
    sit_title?: string;
    sitter_id?: string;
    sitter_first_name?: string | null;
    owner_id?: string;
    owner_first_name?: string | null;
    owner_email?: string;
    hours_since_created?: number;
  };
}

interface Props {
  signal: PendingApplicationSignal;
}

export const PendingApplicationCard = ({ signal }: Props) => {
  const qc = useQueryClient();
  const [sending, setSending] = useState(false);
  const [ignoring, setIgnoring] = useState(false);

  const m = signal.metadata ?? {};
  const isCritical = signal.severity === "critical";
  const hours = m.hours_since_created ?? 0;
  const days = Math.max(1, Math.floor(hours / 24));
  const Icon = isCritical ? AlertOctagon : AlertTriangle;
  const ownerEmail = m.owner_email ?? "";
  const applicationId = signal.entity_id;
  const dashboardUrl = `https://guardiens.fr/dashboard/candidatures/${applicationId}`;

  const invalidate = () =>
    qc.invalidateQueries({ queryKey: ["admin_dashboard_snapshot"] });

  const resolveSignal = async (action: "email_sent" | "dismissed") => {
    const { data: { user } } = await supabase.auth.getUser();
    return supabase
      .from("admin_signals")
      .update({
        resolved_at: new Date().toISOString(),
        action_taken: action,
        admin_id: user?.id ?? null,
      })
      .eq("id", signal.id);
  };

  const handleSendReminder = async () => {
    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke(
        "nudge-owner-pending-application",
        {
          body: {
            mode: "manual",
            application_id: applicationId,
            signal_id: signal.id,
          },
        },
      );
      if (error) throw error;
      const payload = data as { sent?: boolean; error?: string | null; recipient?: string };
      if (payload?.sent) {
        toast.success(`Relance envoyée à ${payload.recipient ?? ownerEmail}.`);
      } else {
        const reason = payload?.error === "opted_out"
          ? "Ce propriétaire s'est désinscrit des emails produit."
          : payload?.error === "suppressed"
            ? "Cet email est en liste de suppression."
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
    const { error } = await resolveSignal("dismissed");
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
  const badgeTone = isCritical
    ? "bg-destructive/10 text-destructive border-destructive/30"
    : "bg-warning/10 text-warning-foreground border-warning/30";

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
                Candidature sans réponse
              </h3>
              <Badge variant="outline" className={`text-[10px] uppercase tracking-wide ${badgeTone}`}>
                {isCritical ? "Critique" : "À traiter"}
              </Badge>
            </div>
            <div className="text-sm text-foreground">
              {m.sitter_first_name || "Un gardien"} a candidaté à «&nbsp;{m.sit_title ?? "annonce"}&nbsp;» il y a {days} jour{days > 1 ? "s" : ""}.
            </div>
            <p className="text-xs text-muted-foreground">
              Propriétaire : {m.owner_first_name || "propriétaire"} ({ownerEmail || "email inconnu"})
            </p>
            {isCritical && (
              <p className="text-xs text-destructive">
                Il est temps de relancer le propriétaire directement.
              </p>
            )}
            <div className="flex flex-wrap gap-2 pt-1">
              <Button size="sm" onClick={handleSendReminder} disabled={sending || !ownerEmail}>
                <Mail className="h-4 w-4 mr-2" />
                {sending ? "Envoi..." : "Relancer par email"}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                asChild
              >
                <a href={dashboardUrl} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Voir la candidature
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
