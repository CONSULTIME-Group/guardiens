import { Link } from "react-router-dom";
import { format, differenceInHours } from "date-fns";
import { fr } from "date-fns/locale";
import { AlertCircle, RefreshCw, Share2, Compass, Home } from "lucide-react";


/** Résout la meilleure photo de couverture disponible pour une annonce. */
const resolveCover = (sit: any): string | null =>
  sit?.cover_photo_url
  || sit?.properties?.cover_photo_url
  || (Array.isArray(sit?.properties?.photos) ? sit.properties.photos[0] : null)
  || null;

/** Vignette paysage (4:3) à gauche d'un item d'annonce. Fallback icône maison. */
const SitThumb = ({ sit }: { sit: any }) => {
  const src = resolveCover(sit);
  return src ? (
    <div className="relative w-20 aspect-[4/3] rounded-xl overflow-hidden shrink-0 ring-1 ring-border bg-muted">
      <img
        src={src}
        alt=""
        loading="lazy"
        className="w-full h-full object-cover object-[center_30%]"
        onError={(e) => { e.currentTarget.src = '/placeholder.svg'; }}
      />
    </div>
  ) : (
    <div className="w-20 aspect-[4/3] rounded-xl bg-muted flex items-center justify-center shrink-0 ring-1 ring-border">
      <Home className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
    </div>
  );
};


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
 * Carte "Annonces près de chez vous", extraite de SitterBottomColumns
 * pour pouvoir être utilisée seule dans un onglet de la zone Découverte.
 */
const NearbyAnnoncesCard = ({ nearbyListings, nearbyError = null, nearbyListingsRadius = null, isAvailable = false, hideHeader = false }: Props) => {
  const hasBeyond = nearbyListings.some((s: any) => s?.is_beyond);
  return (
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
    ) : nearbyListings.length === 0 || hasBeyond ? (
      (() => {
        const hasFallback = hasBeyond && nearbyListings.length > 0;
        // Cas "vraiment vide" : bloc compact (pas de pavé). Le parrainage
        // reste accessible mais sur 1 ligne, pas en hero.
        // Cas "hors rayon mais on a des suggestions" : on inverse la hiérarchie
        //, les annonces plus loin deviennent le contenu principal, l'empty
        // state se réduit à une mention discrète en tête.
        if (!hasFallback) {
          return (
            <div className="bg-card border border-border rounded-2xl p-4 sm:p-5 flex flex-col gap-3 shadow-sm min-w-0">
              <div className="flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-heading font-semibold text-foreground leading-snug">
                    Calme plat sur votre secteur
                  </p>
                  <p className="text-xs text-muted-foreground leading-relaxed mt-1">
                    Aucune annonce de garde n'a été publiée près de chez vous pour le moment. Votre profil reste visible.
                  </p>
                </div>
                <Link
                  to="/search"
                  className="shrink-0 inline-flex items-center gap-1.5 px-3 py-2 rounded-full border border-border bg-background text-[11px] font-semibold text-foreground hover:bg-muted/60 hover:border-foreground/30 transition-colors"
                >
                  <Compass className="h-3.5 w-3.5" aria-hidden="true" />
                  Voir plus loin
                </Link>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-border/60">
                <p className="text-xs text-muted-foreground">
                  Faites venir un propriétaire&nbsp;: votre filleul rejoint gratuitement, lui aussi.
                </p>
                <Link
                  to="/mon-abonnement#parrainage"
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
                >
                  <Share2 className="h-3 w-3" aria-hidden="true" />
                  Partager mon lien
                </Link>
              </div>
              {!isAvailable && (
                <p className="text-[11px] text-muted-foreground italic">
                  Pensez à activer le mode disponible pour être contacté dès qu'une annonce arrive.
                </p>
              )}
            </div>
          );
        }

        // hasFallback === true : on met en avant les annonces hors rayon.
        return (
          <div className="space-y-3 min-w-0">
            <div className="bg-card border border-border rounded-2xl p-4 sm:p-5 min-w-0">
              <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground font-semibold mb-3">
                Aucune garde à moins de 100 km, voici les plus proches disponibles
              </p>
              <div className="divide-y divide-border/60">
                {nearbyListings.slice(0, 5).map((sit: any) => {
                  const distance =
                    typeof sit.distance_km === "number" ? Math.round(sit.distance_km) : null;
                  const isNew = differenceInHours(new Date(), new Date(sit.created_at)) < 48;
                  return (
                    <Link
                      key={sit.id}
                      to={`/sits/${sit.id}`}
                      className="group flex items-start gap-3 py-3 first:pt-1 last:pb-1 -mx-2 px-2 rounded-lg transition-all duration-200 ease-out hover:bg-muted/40 hover:translate-x-0.5"
                    >
                      <SitThumb sit={sit} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm sm:text-base text-foreground leading-snug font-medium transition-colors group-hover:text-primary">
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
                          className="shrink-0 inline-flex items-center rounded-full text-[11px] font-bold tabular-nums px-2.5 py-0.5 bg-muted text-muted-foreground ring-1 ring-border"
                          aria-label={`À environ ${distance} kilomètres de chez vous`}
                        >
                          {distance}&nbsp;km
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>
              <div className="flex items-center justify-end gap-2 pt-3 mt-2 border-t border-border/60">
                <Link
                  to="/mon-abonnement#parrainage"
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-primary"
                >
                  <Share2 className="h-3 w-3" aria-hidden="true" />
                  Inviter un proche
                </Link>
              </div>
            </div>
          </div>
        );
      })()

    ) : (
      <div className="bg-card border border-border rounded-[2rem] p-4 sm:p-5">
        {(nearbyListingsRadius || hasBeyond) && (
          <p className="text-[11px] text-muted-foreground mb-2 px-1">
            {hasBeyond
              ? "Aucune annonce dans un rayon de 100 km, voici la/les plus proche(s) disponible(s)."
              : `Annonces dans un rayon de ${nearbyListingsRadius} km.`}
          </p>
        )}
        <div className="divide-y divide-border/60">
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
              <SitThumb sit={sit} />
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
                  className={`shrink-0 inline-flex items-center rounded-full text-[11px] font-bold tabular-nums px-2.5 py-0.5 ${
                    sit.is_beyond
                      ? "bg-muted text-muted-foreground ring-1 ring-border"
                      : "bg-primary/10 text-primary"
                  }`}
                  aria-label={`À environ ${distance} kilomètres de chez vous`}
                  title={sit.is_beyond ? "Annonce hors rayon habituel" : "Distance approximative (~1 km de précision)"}
                >
                  {sit.is_beyond ? "Plus loin · " : ""}{distance}&nbsp;km
                </span>
              )}
            </Link>
          );
        })}
        </div>
      </div>
    )}
  </section>
  );
};

export default NearbyAnnoncesCard;
