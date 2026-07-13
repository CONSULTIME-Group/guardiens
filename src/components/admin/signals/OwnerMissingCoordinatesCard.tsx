import { useState } from "react";
import { AlertTriangle, MailPlus } from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";

export interface OwnerMissingCoordinatesSignal {
  id: string;
  signal_type: "owner_missing_coordinates";
  severity: "critical" | "warning" | "info";
  entity_type: string;
  entity_id: string;
  detected_at: string;
  metadata: {
    owner_first_name?: string;
    owner_city?: string;
    sit_id?: string;
    sit_title?: string;
  };
}

interface Props {
  signal: OwnerMissingCoordinatesSignal;
}

export const OwnerMissingCoordinatesCard = ({ signal }: Props) => {
  const qc = useQueryClient();
  const [sending, setSending] = useState(false);
  const [ignoring, setIgnoring] = useState(false);

  const m = signal.metadata ?? {};
  const firstName = m.owner_first_name?.trim() || "Ce propriétaire";
  const sitTitle = m.sit_title || "son annonce";

  const invalidate = () =>
    qc.invalidateQueries({ queryKey: ["admin_dashboard_snapshot"] });

  const handleSendRelance = async () => {
    setSending(true);
    try {
      // Load owner email
      const { data: profile, error: pErr } = await supabase
        .from("profiles")
        .select("email, first_name")
        .eq("id", signal.entity_id)
        .maybeSingle();
      if (pErr || !profile?.email) {
        throw new Error("Email du propriétaire introuvable.");
      }
      const { error } = await supabase.functions.invoke(
        "send-transactional-email",
        {
          body: {
            templateName: "relance-cp-manquant",
            recipientEmail: profile.email,
            idempotencyKey: `relance-cp-${signal.id}`,
            templateData: {
              firstName: profile.first_name || "",
            },
          },
        },
      );
      if (error) throw error;

      const {
        data: { user },
      } = await supabase.auth.getUser();
      await supabase
        .from("admin_signals")
        .update({
          resolved_at: new Date().toISOString(),
          action_taken: "relance_cp_manquant_sent",
          admin_id: user?.id ?? null,
        })
        .eq("id", signal.id);

      toast.success("Email de relance envoyé.");
      invalidate();
    } catch (e) {
      toast.error((e as Error)?.message ?? "Envoi impossible.");
    } finally {
      setSending(false);
    }
  };

  const handleIgnore = async () => {
    setIgnoring(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
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

  return (
    <Card className="border-warning/30 bg-warning/5">
      <CardContent className="pt-4 pb-4">
        <div className="flex items-start gap-3">
          <div className="rounded-full bg-warning/15 p-2 shrink-0">
            <AlertTriangle className="h-4 w-4 text-warning-foreground" aria-hidden />
          </div>
          <div className="flex-1 min-w-0 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-sm font-semibold text-foreground">
                Propriétaire sans coordonnées
              </h3>
              <Badge
                variant="outline"
                className="text-[10px] uppercase tracking-wide bg-warning/10 text-warning-foreground border-warning/30"
              >
                À traiter
              </Badge>
            </div>
            <p className="text-sm text-foreground">
              {firstName} a publié « {sitTitle} » mais n'a pas de coordonnées
              géographiques dans son profil. Son annonce ne pourra pas être
              diffusée par proximité.
            </p>
            <p className="text-xs text-muted-foreground">
              Détecté le {new Date(signal.detected_at).toLocaleDateString("fr-FR")}.
            </p>
            <div className="flex flex-wrap gap-2 pt-1">
              <Button size="sm" onClick={handleSendRelance} disabled={sending}>
                <MailPlus className="h-4 w-4 mr-2" />
                Envoyer un email de relance
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={handleIgnore}
                disabled={ignoring}
              >
                Ignorer
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
