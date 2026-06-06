import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Zap, CheckCircle2, Loader2, X, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import { Link } from "react-router-dom";

interface EmergencyAlertBannerProps {
  sitId: string;
  sitCity: string;
  startDate: string | null;
}

/**
 * Affiché au propriétaire quand sa garde commence dans ≤ 15 jours.
 *
 * Logique d'affichage :
 * - On vérifie d'abord le nombre de gardiens d'urgence dans un rayon de 100 km autour de la ville.
 * - count > 0 → bandeau complet "Alerter les gardiens d'urgence" (l'envoi cible 35 km).
 * - count = 0 → bandeau replié, dépliable, expliquant que personne n'est encore disponible
 *   dans la zone mais que ça évolue vite.
 * - Erreur réseau ou ville non géocodée → on n'affiche rien (silencieux).
 */
const EmergencyAlertBanner = ({ sitId, sitCity, startDate }: EmergencyAlertBannerProps) => {
  const [alerting, setAlerting] = useState(false);
  const [alerted, setAlerted] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [nearbyCount, setNearbyCount] = useState<number | null>(null);
  const [expanded, setExpanded] = useState(false);

  const daysUntilStart = startDate
    ? Math.ceil((new Date(startDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null;
  const inWindow = daysUntilStart !== null && daysUntilStart <= 15 && daysUntilStart >= 0;

  // Pré-check : combien de gardiens d'urgence dans un rayon de 100 km ?
  useEffect(() => {
    if (!inWindow || dismissed) return;
    let cancelled = false;
    (async () => {
      try {
        const { data, error } = await supabase.functions.invoke("alert-emergency-sitters", {
          body: { sitCity, countOnly: true, radiusKm: 100 },
        });
        if (cancelled) return;
        if (error) {
          setNearbyCount(null);
          return;
        }
        setNearbyCount(typeof data?.count === "number" ? data.count : 0);
      } catch {
        if (!cancelled) setNearbyCount(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [inWindow, dismissed, sitCity]);

  if (!inWindow || dismissed) return null;
  // Tant qu'on ne sait pas, ou en cas d'erreur silencieuse → rien.
  if (nearbyCount === null) return null;

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
          ? `${count} gardien${count > 1 ? "s" : ""} d'urgence alerté${count > 1 ? "s" : ""} à proximité de ${sitCity}.`
          : "Aucun gardien d'urgence disponible dans votre zone pour le moment."
      );
    } catch {
      toast.error("Impossible d'alerter les gardiens d'urgence.");
    } finally {
      setAlerting(false);
    }
  };

  // CAS 1, Aucun gardien d'urgence dans un rayon de 100 km : bandeau replié.
  if (nearbyCount === 0) {
    return (
      <div className="mb-6 rounded-xl border border-border bg-muted/30 px-4 py-3 relative">
        <button
          onClick={() => setDismissed(true)}
          className="absolute top-2.5 right-2.5 text-muted-foreground hover:text-foreground"
          aria-label="Fermer"
        >
          <X className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={() => setExpanded((v) => !v)}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground w-full text-left pr-6"
          aria-expanded={expanded}
        >
          <Zap className="h-4 w-4 shrink-0" />
          <span>Gardiens d'urgence dans votre zone</span>
          <ChevronDown
            className={`h-4 w-4 ml-auto transition-transform ${expanded ? "rotate-180" : ""}`}
          />
        </button>
        {expanded && (
          <div className="mt-3 text-sm text-muted-foreground space-y-2">
            <p>
              Aucun gardien d'urgence n'est encore disponible près de <strong>{sitCity}</strong>.
              Le réseau s'étoffe vite, n'hésitez pas à publier votre annonce, elle reste visible
              de tous les gardiens.
            </p>
            <p className="text-xs">
              <Link to="/gardien-urgence" className="text-primary hover:underline">
                En savoir plus sur les gardiens d'urgence →
              </Link>
            </p>
          </div>
        )}
      </div>
    );
  }

  // CAS 2, Au moins 1 gardien d'urgence dans la zone : bandeau complet.
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
            Votre garde commence dans <strong>{daysUntilStart} jour{daysUntilStart! > 1 ? "s" : ""}</strong>.
            <strong> {nearbyCount} gardien{nearbyCount > 1 ? "s" : ""} d'urgence</strong> {nearbyCount > 1 ? "sont disponibles" : "est disponible"} à proximité de {sitCity}, des membres
            expérimentés (5+ gardes, note ≥ 4.7, identité vérifiée) mobilisables en quelques heures.
          </p>
          <p className="text-xs text-muted-foreground">
            Ils recevront une notification et pourront consulter votre annonce pour postuler.{" "}
            <Link to="/gardien-urgence" className="text-primary hover:underline">En savoir plus →</Link>
          </p>

          <div className="flex items-center gap-3 pt-1">
            {alerted ? (
              <Button size="sm" variant="outline" disabled className="gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-primary" /> Gardiens alertés
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
