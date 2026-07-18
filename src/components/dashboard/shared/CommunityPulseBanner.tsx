/**
 * CommunityPulseBanner — panneau vert chaleureux « Le quartier, en ce moment ».
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
}

const CommunityPulseBanner = memo(({ userId, className }: Props) => {
  const { data: pulse } = useCommunityPulse();
  const { data: proximity } = useHelpersProximityCount(userId);

  const metrics: Metric[] = [];

  if (proximity?.hasGeo && proximity.localCount > 0) {
    metrics.push({
      key: "local",
      value: proximity.localCount,
      label: `à moins de ${proximity.radiusKm} km autour de vous`,
      Icon: MapPin,
    });
  }
  if (pulse && pulse.maisonsGardees > 0) {
    metrics.push({
      key: "maisons",
      value: pulse.maisonsGardees,
      label: "maisons gardées",
      Icon: Home,
    });
  }
  if (pulse && pulse.animauxAccompagnes > 0) {
    metrics.push({
      key: "animaux",
      value: pulse.animauxAccompagnes,
      label: "animaux accompagnés",
      Icon: PawPrint,
    });
  }
  if (proximity && proximity.nationalCount > 0) {
    metrics.push({
      key: "helpers",
      value: proximity.nationalCount,
      label: "personnes prêtes à aider en France",
      Icon: HandHeart,
    });
  }
  if (pulse && pulse.totalInscrits > 0) {
    metrics.push({
      key: "inscrits",
      value: pulse.totalInscrits,
      label: "membres de la communauté",
      Icon: Users,
    });
  }

  if (metrics.length === 0) return null;

  return (
    <section
      aria-labelledby="community-pulse-heading"
      className={cn(
        "rounded-2xl bg-gradient-to-br from-[#235741] to-[#2C6D50] p-6 md:p-7 shadow-lg",
        className,
      )}
    >
      <div className="mb-5">
        <p className="text-[11px] sm:text-xs font-semibold uppercase tracking-[0.18em] text-[#cfe6da]">
          Le quartier, en ce moment
        </p>
        <h2
          id="community-pulse-heading"
          className="mt-1.5 font-heading text-xl sm:text-2xl font-semibold text-white leading-tight"
        >
          Il vit. Vous en êtes déjà.
        </h2>
      </div>
      <ul className="grid grid-cols-2 gap-x-6 gap-y-4">
        {metrics.slice(0, 4).map(({ key, value, label, Icon }) => (
          <li key={key} className="flex items-start gap-2.5 min-w-0">
            <Icon
              className="mt-1 h-3.5 w-3.5 shrink-0 text-[#cfe6da] opacity-80"
              aria-hidden="true"
            />
            <div className="min-w-0">
              <div className="font-heading text-2xl sm:text-3xl font-semibold text-white tabular-nums leading-none">
                {value.toLocaleString("fr-FR")}
              </div>
              <div className="mt-1 text-xs sm:text-sm text-[#d5e6dd] leading-snug">
                {label}
              </div>
            </div>
          </li>
        ))}
      </ul>
      <div className="mt-5 flex justify-end">
        <Link
          to="/actualites/inventaire-guardiens-france"
          className="inline-flex items-center gap-1 text-xs sm:text-sm text-[#cfe6da] hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[#235741] rounded-sm"
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
