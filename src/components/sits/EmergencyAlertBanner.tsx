import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Zap, CheckCircle2, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { Link } from "react-router-dom";

interface EmergencyAlertBannerProps {
  sitId: string;
  sitCity: string;
  startDate: string | null;
}

/**
 * Shown to the owner when their sit is published and starts within 15 days.
 * Lets the owner opt-in to alerting nearby emergency sitters.
 */
const EmergencyAlertBanner = ({ sitId, sitCity, startDate }: EmergencyAlertBannerProps) => {
  const [alerting, setAlerting] = useState(false);
  const [alerted, setAlerted] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  // Only show if start_date is within 15 days
  if (!startDate || dismissed) return null;
  const daysUntilStart = Math.ceil((new Date(startDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  if (daysUntilStart > 15 || daysUntilStart < 0) return null;

  const handleAlert = async () => {
    setAlerting(true);
    try {
      const { data, error } = await supabase.functions.invoke("alert-emergency-sitters", {
        body: { sitId, sitCity },
      });
      if (error) throw error;
      const count = data?.alerted || 0;
      setAlerted(true);
      toast.success(
        count > 0
          ? `${count} gardien${count > 1 ? "s" : ""} d'urgence alerté${count > 1 ? "s" : ""} à proximité de ${sitCity} ⚡`
          : "Aucun gardien d'urgence disponible dans votre zone pour le moment."
      );
    } catch {
      toast.error("Impossible d'alerter les gardiens d'urgence.");
    } finally {
      setAlerting(false);
    }
  };

  return (
    <div className="mb-6 rounded-xl border-2 border-primary/30 bg-primary/5 p-4 md:p-5 relative">
      <button
        onClick={() => setDismissed(true)}
        className="absolute top-3 right-3 text-muted-foreground hover:text-foreground"
        aria-label="Fermer"
      >
        <X className="h-4 w-4" />
      </button>

      <div className="flex items-start gap-3">
        <span className="inline-flex items-center justify-center h-10 w-10 rounded-full bg-primary/10 shrink-0 mt-0.5">
          <Zap className="h-5 w-5 text-primary" />
        </span>
        <div className="space-y-2 flex-1">
          <p className="font-heading text-base font-semibold">
            Besoin d'un gardien rapidement ?
          </p>
          <p className="text-sm text-muted-foreground">
            Votre garde commence dans <strong>{daysUntilStart} jour{daysUntilStart > 1 ? "s" : ""}</strong>.
            Vous pouvez alerter les <strong>gardiens d'urgence</strong> à proximité de {sitCity} — des membres
            expérimentés (3+ gardes, note ≥ 4.7, identité vérifiée) mobilisables en quelques heures.
          </p>
          <p className="text-xs text-muted-foreground">
            Ils recevront une notification et pourront consulter votre annonce pour postuler.{" "}
            <Link to="/gardien-urgence" className="text-primary hover:underline">En savoir plus →</Link>
          </p>

          <div className="flex items-center gap-3 pt-1">
            {alerted ? (
              <Button size="sm" variant="outline" disabled className="gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-primary" /> Gardiens alertés ✓
              </Button>
            ) : (
              <Button size="sm" onClick={handleAlert} disabled={alerting} className="gap-1.5">
                {alerting ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> Envoi en cours…</>
                ) : (
                  <><Zap className="h-4 w-4" /> Alerter les gardiens d'urgence</>
                )}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmergencyAlertBanner;
