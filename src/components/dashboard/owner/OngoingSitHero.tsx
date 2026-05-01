import { memo } from "react";
import { Link } from "react-router-dom";
import { differenceInDays, format } from "date-fns";
import { fr } from "date-fns/locale";
import { MessageSquare, ArrowRight, Sparkles, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getOptimizedImageUrl } from "@/lib/imageOptim";
import { capitalize } from "./helpers";
import type { SitRow, SitterInfo } from "./types";

interface OngoingSitHeroProps {
  sit: SitRow;
  sitterProfiles: Record<string, SitterInfo>;
  coverPhoto?: string | null;
}

/**
 * Hero contextuel "garde en cours" côté propriétaire.
 * Aligné visuellement sur NearestListingHero (sitter dashboard) :
 * - format split image / contenu
 * - eyebrow "Garde en cours" + titre
 * - badge J-X / Dernier jour
 * - barre de progression
 * - CTA messagerie + voir l'annonce + lien profil
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
    <div className="px-4 sm:px-5 md:px-8 mb-6 md:mb-8">
      <div className="group block bg-card border border-border rounded-2xl overflow-hidden transition-all duration-300 ease-out hover:shadow-lg hover:border-primary/30">
        <div className="flex flex-col sm:flex-row">
          {/* Image de couverture */}
          <div className="relative sm:w-48 md:w-56 h-40 sm:h-auto sm:min-h-[180px] overflow-hidden bg-muted shrink-0">
            {coverPhoto ? (
              <img
                src={getOptimizedImageUrl(coverPhoto, 400, 80)}
                alt={sit.title || "Garde en cours"}
                className="w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.04]"
                width={400}
                height={224}
                loading="lazy"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center">
                <Sparkles className="h-8 w-8 text-primary/30" aria-hidden="true" />
              </div>
            )}
            {/* Badge J-X */}
            <div className="absolute top-2 left-2">
              <span className="text-[11px] font-semibold bg-primary text-primary-foreground rounded-full px-2 py-0.5 shadow">
                {badgeLabel}
              </span>
            </div>
          </div>

          {/* Contenu */}
          <div className="flex-1 p-4 sm:p-5 flex flex-col justify-between min-w-0 gap-3">
            <div className="flex items-start gap-3 min-w-0">
              {/* Avatar gardien — cliquable */}
              <Link
                to={sitter?.id ? `/gardiens/${sitter.id}` : "#"}
                className="shrink-0 group/avatar"
                aria-label={`Voir le profil de ${sitterName}`}
              >
                {sitter?.avatar_url ? (
                  <img
                    src={sitter.avatar_url}
                    alt={`Photo de ${sitterName}`}
                    className="w-12 h-12 sm:w-14 sm:h-14 rounded-full object-cover ring-2 ring-primary/40 transition-all duration-300 group-hover/avatar:ring-primary group-hover/avatar:scale-105"
                  />
                ) : (
                  <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-primary/15 ring-2 ring-primary/40 flex items-center justify-center text-primary font-heading font-bold text-lg transition-all duration-300 group-hover/avatar:ring-primary group-hover/avatar:scale-105">
                    {sitterName.charAt(0)}
                  </div>
                )}
              </Link>

              <div className="min-w-0 flex-1">
                <p className="text-xs uppercase tracking-widest text-primary font-sans font-medium mb-1.5 flex items-center gap-1.5">
                  <Sparkles className="h-3 w-3" aria-hidden="true" />
                  Garde en cours
                </p>
                <h3 className="text-base sm:text-lg font-heading font-semibold text-foreground leading-tight mb-1">
                  {sitterName} s'occupe de vos animaux
                </h3>
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                  {endLabel && (
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5" aria-hidden="true" />
                      {daysLeft !== null && daysLeft > 0
                        ? `Encore ${daysLeft} jour${daysLeft > 1 ? "s" : ""} — fin ${endLabel}`
                        : `Dernier jour — fin ${endLabel}`}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Barre de progression */}
            {totalDays !== null && (
              <div className="h-1.5 w-full bg-primary/15 rounded-full overflow-hidden">
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

            {/* Actions */}
            <div className="flex flex-wrap items-center justify-between gap-2">
              {sitter?.id ? (
                <Link
                  to={`/gardiens/${sitter.id}`}
                  className="inline-flex items-center gap-1 text-xs text-primary hover:underline transition-transform duration-200 hover:translate-x-0.5"
                >
                  Voir le profil <ArrowRight className="h-3 w-3" aria-hidden="true" />
                </Link>
              ) : <span />}

              <div className="flex gap-2 shrink-0 w-full sm:w-auto">
                {sitter?.id && (
                  <Button asChild size="sm" className="flex-1 sm:flex-initial rounded-xl group/btn">
                    <Link to={`/messages?with=${sitter.id}&sit=${sit.id}`}>
                      <MessageSquare className="h-4 w-4 mr-1.5 transition-transform duration-200 group-hover/btn:scale-110" />
                      Message
                    </Link>
                  </Button>
                )}
                <Button asChild variant="outline" size="sm" className="flex-1 sm:flex-initial rounded-xl">
                  <Link to={`/sits/${sit.id}`}>Voir l'annonce</Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

OngoingSitHero.displayName = "OngoingSitHero";
export default OngoingSitHero;
