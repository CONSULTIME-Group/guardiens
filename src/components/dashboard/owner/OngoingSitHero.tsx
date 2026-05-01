import { memo } from "react";
import { Link } from "react-router-dom";
import { differenceInDays, format } from "date-fns";
import { fr } from "date-fns/locale";
import { MessageSquare } from "lucide-react";
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
 * - photo gardien + nom + jours restants
 * - CTA messagerie + voir l'annonce
 * Affiché uniquement si une garde est CONFIRMÉE et active aujourd'hui.
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

  return (
    <div className="relative overflow-hidden rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/8 via-card to-card">
      {coverPhoto && (
        <div className="absolute inset-0 opacity-15" aria-hidden="true">
          <img src={coverPhoto} alt="" className="w-full h-full object-cover" />
        </div>
      )}

      <div className="relative p-5 md:p-6 flex flex-col md:flex-row md:items-center gap-5">
        {/* Avatar gardien */}
        <div className="flex items-center gap-4 min-w-0 flex-1">
          <div className="shrink-0">
            {sitter?.avatar_url ? (
              <img
                src={sitter.avatar_url}
                alt={`Photo de ${sitterName}`}
                className="w-16 h-16 md:w-20 md:h-20 rounded-full object-cover ring-2 ring-primary/40"
              />
            ) : (
              <div className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-primary/15 ring-2 ring-primary/40 flex items-center justify-center text-primary font-heading font-bold text-xl">
                {sitterName.charAt(0)}
              </div>
            )}
          </div>

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

            {/* Progress bar */}
            {totalDays !== null && (
              <div className="mt-2.5 h-1.5 w-full max-w-xs bg-primary/15 rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary transition-all"
                  style={{ width: `${progress}%` }}
                  role="progressbar"
                  aria-valuenow={progress}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label={`Garde réalisée à ${progress}%`}
                />
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 shrink-0 w-full md:w-auto">
          {sitter?.id && (
            <Button asChild size="sm" className="flex-1 md:flex-initial rounded-xl">
              <Link to={`/messages?with=${sitter.id}&sit=${sit.id}`}>
                <MessageSquare className="h-4 w-4 mr-1.5" />
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
