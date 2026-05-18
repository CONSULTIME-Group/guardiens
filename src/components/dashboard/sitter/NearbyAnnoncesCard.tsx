import { Link } from "react-router-dom";
import { format, differenceInHours } from "date-fns";
import { fr } from "date-fns/locale";
import { AlertCircle, RefreshCw, Share2, Compass } from "lucide-react";
import { REFERRAL_REWARD_LABEL, SITTER_PRICE_START } from "@/lib/pricing";

interface Props {
  nearbyListings: any[];
  nearbyError?: string | null;
  /** Rayon (km) effectivement appliqué pour le filtrage (30/50/100), ou null
   *  si on a dû élargir au-delà (annonces flaggées is_beyond). */
  nearbyListingsRadius?: number | null;
  isAvailable?: boolean;
  /** Quand un parent (ex: SitterDashboard) a déjà rendu un SectionEyebrow. */
  hideHeader?: boolean;
}

/**
 * Carte "Annonces près de chez vous" — extraite de SitterBottomColumns
 * pour pouvoir être utilisée seule dans un onglet de la zone Découverte.
 */
const NearbyAnnoncesCard = ({ nearbyListings, nearbyError = null, isAvailable = false, hideHeader = false }: Props) => (
  <section aria-labelledby={hideHeader ? undefined : "nearby-annonces-heading"} className="space-y-5">
    {!hideHeader && (
      <div className="flex flex-col">
        <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-accent mb-1.5">
          Annonces
        </p>
        <div className="flex items-end justify-between gap-3">
          <h3
            id="nearby-annonces-heading"
            className="font-heading text-2xl sm:text-3xl font-semibold text-foreground leading-tight"
          >
            Près de chez vous
          </h3>
          {nearbyListings.length > 0 && (
            <Link to="/search" className="text-xs text-primary font-semibold hover:underline shrink-0">
              Voir tout →
            </Link>
          )}
        </div>
      </div>
    )}

    {nearbyError ? (
      <div role="alert" className="rounded-[2rem] border border-destructive/30 bg-destructive/5 p-6 text-center">
        <p className="text-xs text-destructive font-medium inline-flex items-center gap-1.5 justify-center mb-1">
          <AlertCircle className="h-3.5 w-3.5" aria-hidden="true" />
          {nearbyError}
        </p>
        <button type="button" onClick={() => window.location.reload()} className="mt-1 inline-flex items-center gap-1 text-xs text-destructive hover:underline">
          <RefreshCw className="h-3 w-3" aria-hidden="true" /> Réessayer
        </button>
      </div>
    ) : nearbyListings.length === 0 ? (
      <div className="bg-card border border-border rounded-[2rem] p-8 sm:p-10 flex flex-col items-center text-center shadow-sm">
        <div className="max-w-lg space-y-6">
          <div className="space-y-3">
            <h4 className="font-heading text-xl sm:text-2xl font-semibold text-foreground leading-snug">
              Calme plat sur votre secteur
            </h4>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Aucune annonce de garde n'a été publiée près de chez vous pour le moment.
              Votre profil reste visible auprès de la communauté et de nouvelles
              opportunités peuvent apparaître chaque jour.
            </p>
          </div>

          <div className="bg-background/60 border border-accent/25 rounded-3xl p-5 sm:p-6 flex flex-col sm:flex-row items-center gap-5 text-left">
            <div className="flex-1 min-w-0">
              <span className="inline-block px-2 py-1 bg-accent text-accent-foreground text-[10px] font-bold uppercase tracking-widest rounded-md mb-3">
                {REFERRAL_REWARD_LABEL}
              </span>
              <p className="font-heading text-base font-semibold text-foreground mb-1">
                Parrainez vos proches
              </p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Aidez la communauté à grandir. Quand l'abonnement gardien deviendra
                payant (à partir du {SITTER_PRICE_START}), chaque filleul activé vous
                offre {REFERRAL_REWARD_LABEL}.
              </p>
            </div>
            <Link
              to="/mon-abonnement#parrainage"
              className="shrink-0 inline-flex items-center gap-1.5 whitespace-nowrap px-6 py-3 bg-primary text-primary-foreground text-xs font-bold uppercase tracking-wider rounded-full hover:bg-primary/90 transition-colors"
            >
              <Share2 className="h-3.5 w-3.5" aria-hidden="true" />
              Partager mon lien
            </Link>
          </div>

          {!isAvailable && (
            <p className="text-xs text-muted-foreground">
              Pensez à activer le mode disponible (en haut de page) pour être contacté
              dès qu'une annonce arrive.
            </p>
          )}
        </div>
      </div>
    ) : (
      <div className="bg-card border border-border rounded-[2rem] p-4 sm:p-5 divide-y divide-border/60">
        {nearbyListings.slice(0, 5).map((sit: any) => {
          const isNew = differenceInHours(new Date(), new Date(sit.created_at)) < 48;
          const distance =
            typeof sit.distance_km === "number" ? Math.round(sit.distance_km) : null;
          return (
            <Link
              key={sit.id}
              to={`/sits/${sit.id}`}
              className="group flex items-start gap-3 py-3 first:pt-1 last:pb-1 -mx-2 px-2 rounded-lg transition-all duration-200 ease-out hover:bg-muted/40 hover:translate-x-0.5"
            >
              <div className="w-2 h-2 rounded-full bg-accent shrink-0 mt-1.5 transition-transform duration-200 group-hover:scale-125" />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-foreground leading-snug font-medium transition-colors group-hover:text-primary">
                  {sit.title}
                  {isNew && (
                    <span className="ml-2 text-[10px] uppercase tracking-wider font-bold bg-accent text-accent-foreground rounded px-1.5 py-0.5 align-middle">
                      Nouveau
                    </span>
                  )}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {sit.start_date && sit.end_date
                    ? `${format(new Date(sit.start_date), "d MMM", { locale: fr })} → ${format(new Date(sit.end_date), "d MMM", { locale: fr })}`
                    : "Dates flexibles"}
                </p>
              </div>
              {distance !== null && (
                <span
                  className="shrink-0 inline-flex items-center rounded-full bg-primary/10 text-primary text-[11px] font-bold tabular-nums px-2.5 py-0.5"
                  aria-label={`À environ ${distance} kilomètres de chez vous`}
                  title="Distance approximative (~1 km de précision)"
                >
                  {distance}&nbsp;km
                </span>
              )}
            </Link>
          );
        })}
      </div>
    )}
  </section>
);

export default NearbyAnnoncesCard;
