import { memo } from "react";
import { Link } from "react-router-dom";
import { differenceInDays, format } from "date-fns";
import { fr } from "date-fns/locale";
import { MessageSquare, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { capitalize } from "./helpers";
import type { SitRow, SitterInfo } from "./types";

interface OngoingSitHeroProps {
  sit: SitRow;
  sitterProfiles: Record<string, SitterInfo>;
  coverPhoto?: string | null;
}

/**
 * Hero contextuel "garde en cours" :
 * - photo de couverture en fond avec voile dégradé pour lisibilité
 * - avatar gardien (cliquable → profil public)
 * - badge "J-X" / "Dernier jour" en haut à droite
 * - barre de progression
 * - CTA messagerie + voir l'annonce
 */
const OngoingSitHero = memo(({ sit, sitterProfiles, coverPhoto }: OngoingSitHeroProps) => {
  const acceptedApp = (sit.applications || []).find(a => a.status === "accepted");
  const sitter = acceptedApp?.sitter_id ? sitterProfiles[acceptedApp.sitter_id] : null;

  const now = new Date();
  const daysLeft = sit.end_date ? Math.max(0, differenceInDays(new Date(sit.end_date), now)) : null;
  const totalDays = sit.start_date && sit.end_date
    ? Math.max(1, differenceInDays(new Date(sit.end_date), new Date(sit.start_date)))
    : null;
  const daysElapsed = totalDays !== null && daysLeft !== null
    ? Math.max(0, totalDays - daysLeft)
    : null;
  const progress = totalDays && daysElapsed !== null
    ? Math.min(100, Math.round((daysElapsed / totalDays) * 100))
    : 0;

  const sitterName = sitter?.first_name ? capitalize(sitter.first_name) : "Votre gardien";
  const endLabel = sit.end_date ? format(new Date(sit.end_date), "EEEE d MMMM", { locale: fr }) : null;

  const badgeLabel = daysLeft === null
    ? "En cours"
    : daysLeft === 0
      ? "Dernier jour"
      : `J-${daysLeft}`;

  return (
    <div className="group relative overflow-hidden rounded-2xl border border-primary/30 bg-card transition-all duration-300 ease-out hover:shadow-lg hover:border-primary/40">
      {/* Image de couverture en fond + voile dégradé pour lisibilité */}
      {coverPhoto && (
        <>
          <div className="absolute inset-0 opacity-25" aria-hidden="true">
            <img
              src={coverPhoto}
              alt=""
              className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.03]"
            />
          </div>
          <div
            className="absolute inset-0 bg-gradient-to-r from-card via-card/85 to-card/40"
            aria-hidden="true"
          />
        </>
      )}
      {!coverPhoto && (
        <div className="absolute inset-0 bg-gradient-to-br from-primary/8 via-card to-card" aria-hidden="true" />
      )}

      {/* Badge J-X — en haut à droite */}
      <div className="absolute top-3 right-3 z-10">
        <span className="inline-flex items-center text-xs font-semibold bg-primary text-primary-foreground rounded-full px-2.5 py-1 shadow-sm">
          {badgeLabel}
        </span>
      </div>

      <div className="relative p-5 md:p-6 flex flex-col md:flex-row md:items-center gap-5">
        {/* Avatar gardien — cliquable → profil public */}
        <div className="flex items-center gap-4 min-w-0 flex-1">
          <Link
            to={sitter?.id ? `/gardiens/${sitter.id}` : "#"}
            className="shrink-0 group/avatar"
            aria-label={`Voir le profil de ${sitterName}`}
          >
            {sitter?.avatar_url ? (
              <img
                src={sitter.avatar_url}
                alt={`Photo de ${sitterName}`}
                className="w-16 h-16 md:w-20 md:h-20 rounded-full object-cover ring-2 ring-primary/40 transition-all duration-300 group-hover/avatar:ring-primary group-hover/avatar:scale-105"
              />
            ) : (
              <div className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-primary/15 ring-2 ring-primary/40 flex items-center justify-center text-primary font-heading font-bold text-xl transition-all duration-300 group-hover/avatar:ring-primary group-hover/avatar:scale-105">
                {sitterName.charAt(0)}
              </div>
            )}
          </Link>

          <div className="min-w-0">
            <p className="text-[11px] uppercase tracking-[2px] text-primary font-sans font-semibold mb-1">
              Garde en cours
            </p>
            <p className="text-base md:text-lg font-heading font-bold text-foreground leading-tight">
              {sitterName} s'occupe de vos animaux
            </p>
            <p className="text-xs md:text-sm text-muted-foreground mt-0.5">
              {daysLeft !== null && daysLeft > 0
                ? `Encore ${daysLeft} jour${daysLeft > 1 ? "s" : ""}${endLabel ? ` — fin ${endLabel}` : ""}`
                : daysLeft === 0
                  ? `Dernier jour${endLabel ? ` — fin ${endLabel}` : ""}`
                  : "Garde en cours"}
            </p>

            {/* Barre de progression */}
            {totalDays !== null && (
              <div className="mt-2.5 h-1.5 w-full max-w-xs bg-primary/15 rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary transition-all duration-500 ease-out"
                  style={{ width: `${progress}%` }}
                  role="progressbar"
                  aria-valuenow={progress}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label={`Garde réalisée à ${progress}%`}
                />
              </div>
            )}

            {sitter?.id && (
              <Link
                to={`/gardiens/${sitter.id}`}
                className="inline-flex items-center gap-1 text-xs text-primary hover:underline mt-2 transition-transform duration-200 hover:translate-x-0.5"
              >
                Voir le profil <ArrowRight className="h-3 w-3" aria-hidden="true" />
              </Link>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 shrink-0 w-full md:w-auto">
          {sitter?.id && (
            <Button asChild size="sm" className="flex-1 md:flex-initial rounded-xl group/btn">
              <Link to={`/messages?with=${sitter.id}&sit=${sit.id}`}>
                <MessageSquare className="h-4 w-4 mr-1.5 transition-transform duration-200 group-hover/btn:scale-110" />
                Message
              </Link>
            </Button>
          )}
          <Button asChild variant="outline" size="sm" className="flex-1 md:flex-initial rounded-xl">
            <Link to={`/sits/${sit.id}`}>Voir l'annonce</Link>
          </Button>
        </div>
      </div>
    </div>
  );
});

OngoingSitHero.displayName = "OngoingSitHero";
export default OngoingSitHero;
