import type { CityData, LocalSpot } from "@/data/cities";
import { Trees, Footprints, MapPin, Stethoscope, ShoppingBag } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface Props {
  city: CityData;
}

const spotIcons: Record<LocalSpot["type"], React.ElementType> = {
  parc: Trees,
  balade: Footprints,
  quartier: MapPin,
  vétérinaire: Stethoscope,
  marché: ShoppingBag,
};

const LocalSpotsGrid = ({ city }: Props) => {
  return (
    <section className="max-w-5xl mx-auto px-4 py-12 border-t border-border">
      <h2 className="font-serif text-2xl font-bold text-foreground mb-6">
        Les spots de nos gardiens à {city.name}
      </h2>
      <div className="grid md:grid-cols-3 gap-4">
        {city.localSpots.map((spot, i) => {
          const Icon = spotIcons[spot.type];
          return (
            <Card key={i}>
              <CardContent className="p-5">
                <div className="flex items-center gap-2 mb-2">
                  <Icon className="h-5 w-5 text-primary" />
                  <h3 className="font-semibold text-foreground">{spot.name}</h3>
                </div>
                <p className="text-sm text-muted-foreground">{spot.tip}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </section>
  );
};

export default LocalSpotsGrid;
