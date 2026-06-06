import { Link } from "react-router-dom";
import { format, differenceInHours } from "date-fns";
import { fr } from "date-fns/locale";
import { MapPin, Calendar, ArrowRight, Sparkles } from "lucide-react";
import { getOptimizedImageUrl } from "@/lib/imageOptim";

interface NearestListingHeroProps {
  listing: any;
}

/**
 * Carte hero "Annonce phare près de chez vous", mise en avant
 * visuelle de la 1ʳᵉ annonce la plus proche du gardien. Format compact
 * (image + titre + dates + CTA), affichée juste après le SitterHero
 * quand il n'y a pas de garde en cours.
 */
const NearestListingHero = ({ listing }: NearestListingHeroProps) => {
  if (!listing) return null;

  const cover = listing.properties?.photos?.[0];
  const isNew = differenceInHours(new Date(), new Date(listing.created_at)) < 48;
  const isUrgent = listing.is_urgent;

  return (
    <div className="px-4 sm:px-5 md:px-8 mb-6 md:mb-8">
      <Link
        to={`/sits/${listing.id}`}
        className="group block bg-card border border-border rounded-2xl overflow-hidden transition-all duration-300 ease-out hover:shadow-lg hover:-translate-y-0.5 hover:border-primary/30"
      >
        <div className="flex flex-col sm:flex-row">
          {/* Image */}
          <div className="relative sm:w-48 md:w-56 h-40 sm:h-auto sm:min-h-[160px] overflow-hidden bg-muted shrink-0">
            {cover ? (
              <img
                src={getOptimizedImageUrl(cover, 400, 80)}
                alt={listing.title || "Annonce"}
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
            {(isUrgent || isNew) && (
              <div className="absolute top-2 left-2 flex gap-1.5">
                {isUrgent && (
                  <span className="text-[11px] font-semibold bg-destructive text-destructive-foreground rounded-full px-2 py-0.5 shadow">
                    Urgent
                  </span>
                )}
                {isNew && !isUrgent && (
                  <span className="text-[11px] font-semibold bg-primary text-primary-foreground rounded-full px-2 py-0.5 shadow">
                    Nouveau
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Contenu */}
          <div className="flex-1 p-4 sm:p-5 flex flex-col justify-between min-w-0">
            <div>
              <p className="text-xs uppercase tracking-widest text-primary font-sans font-medium mb-1.5 flex items-center gap-1.5">
                <Sparkles className="h-3 w-3" aria-hidden="true" />
                Annonce la plus proche
              </p>
              <h3 className="text-base sm:text-lg font-heading font-semibold text-foreground line-clamp-2 transition-colors group-hover:text-primary mb-2">
                {listing.title}
              </h3>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                {listing.start_date && listing.end_date && (
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5" aria-hidden="true" />
                    {format(new Date(listing.start_date), "d MMM", { locale: fr })} → {format(new Date(listing.end_date), "d MMM", { locale: fr })}
                  </span>
                )}
                {listing.properties?.type && (
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
                    {listing.properties.type}
                  </span>
                )}
              </div>
            </div>

            <div className="mt-3 flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
                Découvrir cette annonce
              </span>
              <span className="inline-flex items-center gap-1 text-sm font-medium text-primary transition-transform duration-200 group-hover:translate-x-0.5">
                Voir <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </span>
            </div>
          </div>
        </div>
      </Link>
    </div>
  );
};

export default NearestListingHero;
