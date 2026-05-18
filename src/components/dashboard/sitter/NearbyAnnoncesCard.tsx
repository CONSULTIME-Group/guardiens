import { Link } from "react-router-dom";
import { format, differenceInHours } from "date-fns";
import { fr } from "date-fns/locale";
import { AlertCircle, RefreshCw, Share2 } from "lucide-react";
import { REFERRAL_REWARD_LABEL, SITTER_PRICE_START } from "@/lib/pricing";

interface Props {
  nearbyListings: any[];
  nearbyError?: string | null;
  isAvailable?: boolean;
}

/**
 * Carte "Annonces près de chez vous" — extraite de SitterBottomColumns
 * pour pouvoir être utilisée seule dans un onglet de la zone Découverte.
 */
const NearbyAnnoncesCard = ({ nearbyListings, nearbyError = null, isAvailable = false }: Props) => (
  <div className="bg-card border border-border rounded-2xl p-4 sm:p-5 transition-shadow duration-300 hover:shadow-sm">
    <div className="flex justify-between items-center mb-4">
      <p className="text-sm font-semibold text-foreground">Annonces près de chez vous</p>
      <Link to="/search" className="text-xs text-primary font-sans hover:underline">Voir tout →</Link>
    </div>
    {nearbyError ? (
      <div role="alert" className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-center">
        <p className="text-xs text-destructive font-medium inline-flex items-center gap-1.5 justify-center mb-1">
          <AlertCircle className="h-3.5 w-3.5" aria-hidden="true" />
          {nearbyError}
        </p>
        <button type="button" onClick={() => window.location.reload()} className="mt-1 inline-flex items-center gap-1 text-xs text-destructive hover:underline">
          <RefreshCw className="h-3 w-3" aria-hidden="true" /> Réessayer
        </button>
      </div>
    ) : nearbyListings.length === 0 ? (
      <div className="py-2 space-y-3">
        <p className="text-sm text-foreground/80 font-sans leading-snug">
          Pas encore d'annonce dans votre zone. Nous travaillons chaque jour à faire
          connaître la plateforme aux propriétaires — et vous pouvez nous y aider.
        </p>
        <div className="rounded-xl border border-primary/20 bg-primary/[0.05] p-3">
          <p className="text-xs font-semibold text-foreground mb-1">
            Partagez votre lien de parrainage
          </p>
          <p className="text-xs text-muted-foreground font-sans leading-relaxed mb-2">
            Invitez un propriétaire à rejoindre Guardiens. Quand l'abonnement gardien
            deviendra payant (à partir du 14 juillet 2026), vous recevrez{" "}
            <strong className="text-foreground font-semibold">1 mois offert</strong>{" "}
            par filleul activé.
          </p>
          <Link
            to="/my-subscription#parrainage"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
          >
            <Share2 className="h-3.5 w-3.5" aria-hidden="true" />
            Obtenir mon lien
          </Link>
        </div>
        {!isAvailable && (
          <p className="text-xs text-muted-foreground font-sans">
            Pensez à activer le mode disponible (en haut de page) pour être contacté
            dès qu'une annonce arrive.
          </p>
        )}
      </div>
    ) : (
      nearbyListings.slice(0, 5).map((sit: any) => {
        const isNew = differenceInHours(new Date(), new Date(sit.created_at)) < 48;
        const distance =
          typeof sit.distance_km === "number" ? Math.round(sit.distance_km) : null;
        return (
          <Link
            key={sit.id}
            to={`/sits/${sit.id}`}
            className="group flex items-start gap-3 py-2.5 border-b border-border last:border-0 -mx-2 px-2 rounded-lg transition-all duration-200 ease-out hover:bg-muted/40 hover:translate-x-0.5"
          >
            <div className="w-2 h-2 rounded-full bg-primary shrink-0 mt-1.5 transition-transform duration-200 group-hover:scale-125" />
            <div className="flex-1 min-w-0">
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
            {distance !== null && (
              <span
                className="shrink-0 inline-flex items-center rounded-full bg-primary/10 text-primary text-[11px] font-semibold font-sans px-2 py-0.5 tabular-nums"
                aria-label={`À environ ${distance} kilomètres de chez vous`}
                title="Distance approximative (~1 km de précision)"
              >
                {distance}&nbsp;km
              </span>
            )}
          </Link>
        );
      })
    )}
  </div>
);

export default NearbyAnnoncesCard;
