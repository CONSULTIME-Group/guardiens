/**
 * Onglet "Logement & quartier" : description + équipements + photos extra
 * + lien guide local + LocationProfileCard.
 */
import { Link } from "react-router-dom";
import { Home, BookOpen, MapPin, ChevronRight } from "lucide-react";
import LocationProfileCard from "@/components/location/LocationProfileCard";
import { AMENITY_META } from "./sitMeta";

interface TabLogementProps {
  propertyDescription: string;
  amenities: string[];
  photos: string[];
  hasLocalGuide: boolean;
  citySlug: string | null;
  cityName: string;
  ownerPostalCode?: string;
}

const TabLogement = ({
  propertyDescription,
  amenities,
  photos,
  hasLocalGuide,
  citySlug,
  cityName,
  ownerPostalCode,
}: TabLogementProps) => {
  const hasAnything =
    propertyDescription || amenities.length > 0 || photos.length > 3 || cityName;

  return (
    <>
      {(propertyDescription || amenities.length > 0) && (
        <section className="rounded-2xl border border-border bg-card p-5 md:p-6">
          <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <Home className="h-5 w-5 text-primary" /> Le logement
          </h2>
          {propertyDescription && (
            <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
              {propertyDescription}
            </p>
          )}
          {amenities.length > 0 && (
            <div className="mt-4 pt-4 border-t border-border">
              <p className="text-xs uppercase tracking-wide text-muted-foreground mb-2">
                Équipements disponibles
              </p>
              <div className="flex flex-wrap gap-2">
                {amenities.map((a) => {
                  const meta = AMENITY_META[a];
                  if (!meta) {
                    return (
                      <span
                        key={a}
                        className="inline-flex items-center gap-1.5 text-xs bg-accent text-accent-foreground rounded-full px-3 py-1"
                      >
                        {a}
                      </span>
                    );
                  }
                  const Ico = meta.icon;
                  return (
                    <span
                      key={a}
                      className="inline-flex items-center gap-1.5 text-xs bg-accent text-accent-foreground rounded-full px-3 py-1"
                    >
                      <Ico className="h-3.5 w-3.5" /> {meta.label}
                    </span>
                  );
                })}
              </div>
            </div>
          )}
        </section>
      )}

      {photos.length > 3 && (
        <section className="rounded-2xl border border-border bg-card p-5 md:p-6">
          <h2 className="text-lg font-semibold mb-3">Photos du logement</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {photos.slice(3).map((p, i) => (
              <img
                key={i}
                src={p}
                alt={`Photo ${i + 4}`}
                loading="lazy"
                className="w-full h-32 md:h-40 object-cover rounded-lg border border-border"
              />
            ))}
          </div>
        </section>
      )}

      {hasLocalGuide && citySlug && (
        <Link
          to={`/guides/${citySlug}`}
          className="block rounded-2xl border border-border bg-card p-5 hover:border-primary/50 transition-colors group"
        >
          <div className="flex items-start gap-3">
            <div className="shrink-0 w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center">
              <BookOpen className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs uppercase tracking-wide text-muted-foreground mb-0.5">
                Guide local
              </p>
              <p className="font-semibold text-sm group-hover:text-primary transition-colors">
                Découvrir {cityName}
              </p>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                Bonnes adresses, vétérinaires, parcs à chiens et spots à connaître.
              </p>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all shrink-0 mt-2" />
          </div>
        </Link>
      )}

      {cityName && ownerPostalCode && (
        <section className="rounded-2xl border border-border bg-card p-5 md:p-6">
          <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <MapPin className="h-5 w-5 text-primary" /> Le quartier
          </h2>
          <LocationProfileCard city={cityName} postalCode={ownerPostalCode} />
        </section>
      )}

      {!hasAnything && (
        <p className="text-sm text-muted-foreground italic text-center py-8">
          Pas encore d'information sur le logement ou le quartier.
        </p>
      )}
    </>
  );
};

export default TabLogement;
