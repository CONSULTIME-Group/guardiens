import PageMeta from "@/components/PageMeta";
import type { CityData } from "@/data/cities";

interface Props {
  city: CityData;
}

const CityPageMeta = ({ city }: Props) => {
  return (
    <PageMeta
      title={`House-sitting à ${city.name} – Gardiens vérifiés | Guardiens`}
      description={city.metaDescription}
      path={`/house-sitting/${city.slug}`}
    />
  );
};

export default CityPageMeta;
