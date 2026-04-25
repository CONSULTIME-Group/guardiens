/**
 * Onglet "Logement" — partie commune (carte logement + emplacement + ville).
 * Les blocs spécifiques propriétaire (CTA profil, overrides) sont rendus séparément
 * dans OwnerSitView avant ce composant.
 */
import { Home, MapPin } from "lucide-react";
import LocationProfileCard from "@/components/location/LocationProfileCard";
import {
  ENV_LABELS as envLabels,
  TYPE_LABELS as typeLabels,
} from "@/components/sits/shared/sitConstants";

interface HousingTabProps {
  property: any;
  owner: any;
  coords: { lat: number; lng: number } | null;
}

const HousingTab = ({ property, owner, coords }: HousingTabProps) => {
  return (
    <>
      {property && (
        <div className="bg-card rounded-xl border border-border p-5">
          <div className="flex items-center gap-2 mb-3">
            <Home className="h-4 w-4 text-primary" />
            <h3 className="font-heading font-semibold">Le logement</h3>
          </div>
          <p className="text-sm font-medium">
            {typeLabels[property.type] || property.type} ·{" "}
            {envLabels[property.environment] || property.environment}
          </p>
          {property.rooms_count ? (
            <p className="text-sm text-muted-foreground mt-1">
              {property.rooms_count} pièces · {property.bedrooms_count} chambres
            </p>
          ) : null}
          {property.description && (
            <p className="text-sm text-muted-foreground mt-2">{property.description}</p>
          )}
          {property.equipments?.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-3">
              {property.equipments.map((eq: string) => (
                <span key={eq} className="px-2.5 py-1 rounded-full bg-accent text-xs">
                  {eq}
                </span>
              ))}
            </div>
          )}
          {property.region_highlights && (
            <p className="text-sm text-muted-foreground mt-3">🌿 {property.region_highlights}</p>
          )}
        </div>
      )}

      {coords && owner?.city && (
        <div className="bg-card rounded-xl border border-border p-5">
          <div className="flex items-center gap-2 mb-3">
            <MapPin className="h-4 w-4 text-primary" />
            <h3 className="font-heading font-semibold">Emplacement</h3>
          </div>
          <div className="rounded-lg overflow-hidden border border-border h-52">
            <iframe
              title="Carte"
              width="100%"
              height="100%"
              style={{ border: 0 }}
              loading="lazy"
              src={`https://www.openstreetmap.org/export/embed.html?bbox=${coords.lng - 0.05},${coords.lat - 0.03},${coords.lng + 0.05},${coords.lat + 0.03}&layer=mapnik&marker=${coords.lat},${coords.lng}`}
            />
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            📍 {owner.city} — emplacement approximatif
          </p>
        </div>
      )}

      {owner?.city && owner?.postal_code && (
        <LocationProfileCard city={owner.city} postalCode={owner.postal_code} />
      )}
    </>
  );
};

export default HousingTab;
