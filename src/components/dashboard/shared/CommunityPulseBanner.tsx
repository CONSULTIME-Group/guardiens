/**
 * CommunityPulseBanner — bandeau « Le pouls de la communauté ».
 *
 * Vitrine de chiffres RÉELS et vivants (jamais des KPI personnels à zéro).
 * Sources : useCommunityPulse (RPC get_public_stats + offsets fondateurs) et
 * useHelpersProximityCount (dimension locale si géoloc dispo). Aucun chiffre
 * n'est affiché s'il vaut 0 : on ne veut pas de métrique démoralisante.
 *
 * Placement recommandé : haut du dashboard, sous l'action prioritaire.
 */
import { memo } from "react";
import { Link } from "react-router-dom";
import { MapPin, Users, Home, PawPrint, HandHeart, ArrowRight } from "lucide-react";
import { useCommunityPulse } from "@/hooks/useCommunityPulse";
import { useHelpersProximityCount } from "@/hooks/useHelpersProximityCount";
import { cn } from "@/lib/utils";

interface Props {
  userId?: string;
  className?: string;
}

interface Metric {
  key: string;
  value: number;
  label: string;
  Icon: typeof Users;
  tone: "primary" | "warning" | "success" | "info";
}

const TONE_CLASSES: Record<Metric["tone"], string> = {
  primary: "bg-primary/10 text-primary",
  warning: "bg-warning/10 text-warning",
  success: "bg-success/10 text-success",
  info: "bg-info/10 text-info",
};

const CommunityPulseBanner = memo(({ userId, className }: Props) => {
  const { data: pulse } = useCommunityPulse();
  const { data: proximity } = useHelpersProximityCount(userId);

  const metrics: Metric[] = [];

  if (proximity?.hasGeo && proximity.localCount > 0) {
    metrics.push({
      key: "local",
      value: proximity.localCount,
      label: `gens du coin à moins de ${proximity.radiusKm} km`,
      Icon: MapPin,
      tone: "success",
    });
  }
  if (pulse && pulse.maisonsGardees > 0) {
    metrics.push({
      key: "maisons",
      value: pulse.maisonsGardees,
      label: "maisons gardées",
      Icon: Home,
      tone: "primary",
    });
  }
  if (pulse && pulse.animauxAccompagnes > 0) {
    metrics.push({
      key: "animaux",
      value: pulse.animauxAccompagnes,
      label: "animaux accompagnés",
      Icon: PawPrint,
      tone: "warning",
    });
  }
  if (proximity && proximity.nationalCount > 0) {
    metrics.push({
      key: "helpers",
      value: proximity.nationalCount,
      label: "personnes prêtes à aider en France",
      Icon: HandHeart,
      tone: "info",
    });
  }
  if (pulse && pulse.totalInscrits > 0) {
    metrics.push({
      key: "inscrits",
      value: pulse.totalInscrits,
      label: "membres de la communauté",
      Icon: Users,
      tone: "primary",
    });
  }

  if (metrics.length === 0) return null;

  return (
    <section
      aria-labelledby="community-pulse-heading"
      className={cn(
        "rounded-2xl border border-border/60 bg-card p-4 sm:p-5",
        className,
      )}
    >
      <div className="flex items-center gap-2 mb-3">
        <span className="relative flex h-2 w-2 shrink-0" aria-hidden="true">
          <span className="absolute inline-flex h-full w-full rounded-full bg-success opacity-60 animate-ping" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-success" />
        </span>
        <h2
          id="community-pulse-heading"
          className="font-heading text-sm sm:text-base font-semibold text-foreground leading-tight"
        >
          Le pouls de la communauté
        </h2>
      </div>
      <ul className="grid grid-cols-2 md:grid-cols-4 gap-2.5 sm:gap-3">
        {metrics.slice(0, 4).map(({ key, value, label, Icon, tone }) => (
          <li
            key={key}
            className="flex items-start gap-2.5 rounded-xl bg-background/60 border border-border/40 p-3 min-w-0"
          >
            <span
              className={cn(
                "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
                TONE_CLASSES[tone],
              )}
              aria-hidden="true"
            >
              <Icon className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <div className="font-heading text-lg sm:text-xl font-bold text-foreground tabular-nums leading-none">
                {value.toLocaleString("fr-FR")}
              </div>
              <div className="mt-1 text-[11px] sm:text-xs text-foreground/70 leading-snug">
                {label}
              </div>
            </div>
          </li>
        ))}
      </ul>
      <div className="mt-3 flex justify-end">
        <Link
          to="/actualites/inventaire-guardiens-france"
          className="inline-flex items-center gap-1 text-xs sm:text-sm text-muted-foreground hover:text-primary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-sm"
        >
          Voir l'inventaire complet
          <ArrowRight className="h-3 w-3" aria-hidden="true" />
        </Link>
      </div>
    </section>
  );
});

CommunityPulseBanner.displayName = "CommunityPulseBanner";
export default CommunityPulseBanner;
