import { Link } from "react-router-dom";
import type { CityData } from "@/data/cities";
import { getNearbyCities } from "@/utils/geo";

interface Props {
  current: CityData;
  allCities: CityData[];
}

const LocalNetworkGrid = ({ current, allCities }: Props) => {
  const nearby = getNearbyCities(current, allCities, 5);

  if (nearby.length === 0) return null;

  return (
    <section className="max-w-5xl mx-auto px-4 py-12 border-t border-border">
      <h2 className="font-serif text-2xl font-bold text-foreground mb-6">
        Guardiens est aussi présent près de {current.name}
      </h2>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {nearby.map((city) => (
          <Link
            key={city.slug}
            to={`/house-sitting/${city.slug}`}
            className="text-primary hover:underline font-medium text-sm"
          >
            House-sitting {city.name}
          </Link>
        ))}
      </div>
    </section>
  );
};

export default LocalNetworkGrid;
