/**
 * CommunityPulseBanner — panneau vert chaleureux « Le pouls de la communauté ».
 *
 * VAGUE 4 (rail confirmé) : liste verticale de TROIS chiffres MAX, sans icônes,
 * priorité au local. Chaque libellé dit explicitement son périmètre.
 *
 * Vitrine de chiffres RÉELS et vivants (jamais des KPI personnels à zéro).
 * Sources : useCommunityPulse (RPC get_public_stats + offsets fondateurs) et
 * useHelpersProximityCount (dimension locale si géoloc dispo).
 */
import { memo } from "react";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
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
}

// Grain très léger : SVG feTurbulence en data-uri, mix-blend soft-light,
// opacité globale ~0.5. Se sent, ne se voit pas.
const GRAIN_DATA_URI =
  "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 200'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/></filter><rect width='100%25' height='100%25' filter='url(%23n)' opacity='0.55'/></svg>\")";

const CommunityPulseBanner = memo(({ userId, className }: Props) => {
  const { data: pulse } = useCommunityPulse();
  const { data: proximity } = useHelpersProximityCount(userId);

  const metrics: Metric[] = [];

  // (a) Local prioritaire si dispo
  if (proximity?.hasGeo && proximity.localCount > 0) {
    metrics.push({
      key: "local",
      value: proximity.localCount,
      label: `personnes prêtes à aider à moins de ${proximity.radiusKm} km de chez vous`,
    });
  } else if (proximity && proximity.nationalCount > 0) {
    // Fallback national quand pas de local
    metrics.push({
      key: "national",
      value: proximity.nationalCount,
      label: "personnes prêtes à aider en France",
    });
  }
  // (b) Maisons (inclut l'historique fondateurs 2021-2026)
  if (pulse && pulse.maisonsGardees > 0 && metrics.length < 3) {
    metrics.push({
      key: "maisons",
      value: pulse.maisonsGardees,
      label: "maisons gardées depuis le début de l'aventure",
    });
  }
  // (c) Animaux (inclut l'historique fondateurs 2021-2026)
  if (pulse && pulse.animauxAccompagnes > 0 && metrics.length < 3) {
    metrics.push({
      key: "animaux",
      value: pulse.animauxAccompagnes,
      label: "animaux accompagnés depuis le début de l'aventure",
    });
  }

  if (metrics.length === 0) return null;

  return (
    <section
      aria-labelledby="community-pulse-heading"
      className={cn("relative isolate overflow-hidden", className)}
      style={{
        borderRadius: "20px",
        padding: "22px",
        background: "linear-gradient(135deg, #235741 0%, #2C6D50 100%)",
        boxShadow:
          "inset 0 1px 0 rgba(255,255,255,0.14), 0 1px 2px rgba(29,27,22,0.04), 0 12px 32px rgba(29,27,22,0.12)",
      }}
    >
      {/* Grain léger, décoratif */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage: GRAIN_DATA_URI,
          mixBlendMode: "soft-light",
          opacity: 0.5,
        }}
      />

      <div className="relative">
        <div className="mb-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#cfe6da]">
            Le pouls de la communauté
          </p>
          <h2
            id="community-pulse-heading"
            className="mt-1.5 font-heading text-xl sm:text-2xl font-semibold text-white leading-tight"
          >
            Il vit. Vous en êtes déjà.
          </h2>
        </div>

        <ul className="flex flex-col" style={{ gap: "14px" }}>
          {metrics.map(({ key, value, label }) => (
            <li key={key} className="flex items-baseline gap-3 min-w-0">
              <span
                className="font-heading text-white tabular-nums shrink-0 text-right"
                style={{ fontSize: "26px", fontWeight: 600, minWidth: "52px", lineHeight: 1 }}
              >
                {value.toLocaleString("fr-FR")}
              </span>
              <span
                className="text-[#d5e6dd] leading-snug min-w-0"
                style={{ fontSize: "12.5px" }}
              >
                {label}
              </span>
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
      </div>
    </section>
  );
});

CommunityPulseBanner.displayName = "CommunityPulseBanner";
export default CommunityPulseBanner;
