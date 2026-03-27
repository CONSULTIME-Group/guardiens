import { Card, CardContent } from "@/components/ui/card";
import { Mountain, Droplets, Stethoscope, Trees, Building2, MapPin } from "lucide-react";
import type { CityPOI } from "@/data/cityContent";

const iconMap = {
  mountain: Mountain,
  water: Droplets,
  stethoscope: Stethoscope,
  tree: Trees,
  building: Building2,
  map: MapPin,
};

interface CityPOISectionProps {
  city: string;
  pois: CityPOI[];
}

export default function CityPOISection({ city, pois }: CityPOISectionProps) {
  if (pois.length === 0) return null;

  return (
    <section className="py-12 border-t border-border">
      <h2 className="font-heading text-2xl md:text-3xl font-bold text-foreground mb-2">
        Points d'intérêt locaux
      </h2>
      <p className="text-muted-foreground mb-8">
        Ce que nos gardiens apprécient autour de {city}
      </p>
      <div className="grid md:grid-cols-3 gap-5">
        {pois.map((poi) => {
          const Icon = iconMap[poi.icon] || MapPin;
          return (
            <Card key={poi.title} className="rounded-2xl hover:shadow-md transition-shadow border-primary/10">
              <CardContent className="p-6">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                  <Icon className="h-5 w-5 text-primary" />
                </div>
                <h3 className="font-heading font-semibold text-foreground mb-2">{poi.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{poi.description}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </section>
  );
}
