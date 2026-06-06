import { Link } from "react-router-dom";
import { format, differenceInHours } from "date-fns";
import { fr } from "date-fns/locale";
import { AlertCircle, RefreshCw } from "lucide-react";
import SitterMissionsSection from "./SitterMissionsSection";

interface SitterBottomColumnsProps {
  nearbyListings: any[];
  nearbyMissions: any[];
  myMissions: any[];
  postalCode: string | null;
  nearbyError?: string | null;
  nearbyMissionsError?: string | null;
  myMissionsError?: string | null;
  /** Mode disponible : conditionne le copy de l'empty state. */
  isAvailable?: boolean;
}

const SitterBottomColumns = ({
  nearbyListings,
  nearbyMissions,
  myMissions,
  postalCode,
  nearbyError = null,
  nearbyMissionsError = null,
  myMissionsError = null,
  isAvailable = false,
}: SitterBottomColumnsProps) => {

  const ErrorState = ({ message }: { message: string }) => (
    <div role="alert" className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-center">
      <p className="text-xs text-destructive font-medium inline-flex items-center gap-1.5 justify-center mb-1">
        <AlertCircle className="h-3.5 w-3.5" aria-hidden="true" />
        {message}
      </p>
      <button
        type="button"
        onClick={() => window.location.reload()}
        className="mt-1 inline-flex items-center gap-1 text-xs text-destructive hover:underline"
      >
        <RefreshCw className="h-3 w-3" aria-hidden="true" /> Réessayer
      </button>
    </div>
  );

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 px-4 sm:px-5 md:px-8 mb-6 md:mb-8">
      {/* Colonne gauche, Annonces */}
      <div className="bg-card border border-border rounded-2xl p-4 sm:p-5 transition-shadow duration-300 hover:shadow-sm">
        <div className="flex justify-between items-center mb-4">
          <p className="text-sm font-semibold text-foreground">Annonces près de chez vous</p>
          <Link to="/search" className="text-xs text-primary font-sans hover:underline">Voir tout →</Link>
        </div>
        {nearbyError ? (
          <ErrorState message={nearbyError} />
        ) : nearbyListings.length === 0 ? (
          <div className="text-center py-4">
            <p className="text-sm text-muted-foreground font-sans italic mb-3">Pas encore d'annonce dans votre zone.</p>
            {isAvailable ? (
              <p className="text-xs text-muted-foreground font-sans">
                Vous êtes visible : élargissez votre rayon ou repassez bientôt, de nouvelles annonces apparaissent chaque jour.
              </p>
            ) : (
              <p className="text-xs text-muted-foreground font-sans">
                Activez le mode disponible (en haut de page) pour être contacté directement par les propriétaires.
              </p>
            )}
          </div>
        ) : (
          nearbyListings.slice(0, 3).map((sit: any) => {
            const isNew = differenceInHours(new Date(), new Date(sit.created_at)) < 48;
            return (
              <Link
                key={sit.id}
                to={`/sits/${sit.id}`}
                className="group flex items-start gap-3 py-2.5 border-b border-border last:border-0 -mx-2 px-2 rounded-lg transition-all duration-200 ease-out hover:bg-muted/40 hover:translate-x-0.5"
              >
                <div className="w-2 h-2 rounded-full bg-primary shrink-0 mt-1.5 transition-transform duration-200 group-hover:scale-125" />
                <div className="flex-1">
                  <p className="text-xs text-foreground/80 font-sans leading-snug transition-colors group-hover:text-foreground">
                    {sit.title}
                    {isNew && <span className="ml-2 text-xs bg-primary text-primary-foreground rounded px-1.5 py-0.5">Nouveau</span>}
                  </p>
                  <p className="text-xs text-muted-foreground font-sans mt-0.5">
                    {sit.start_date && sit.end_date
                      ? `${format(new Date(sit.start_date), "d MMM", { locale: fr })} → ${format(new Date(sit.end_date), "d MMM", { locale: fr })}`
                      : "Dates flexibles"}
                  </p>
                </div>
              </Link>
            );
          })
        )}
      </div>

      {/* Colonne droite, Petites missions (mes missions + autour de vous) */}
      <SitterMissionsSection
        myMissions={myMissions}
        nearbyMissions={nearbyMissions}
        postalCode={postalCode}
        myMissionsError={myMissionsError}
        nearbyMissionsError={nearbyMissionsError}
      />
    </div>
  );
};

export default SitterBottomColumns;
