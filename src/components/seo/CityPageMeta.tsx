import PageMeta from "@/components/PageMeta";
import type { CityData } from "@/data/cities";

interface Props {
  city: CityData;
}

const META_TITLE_OVERRIDES: Record<string, string> = {
  lyon: "Garde chien et chat à Lyon — Home sitter | Guardiens",
  grenoble: "Home sitting Grenoble — Gardien de confiance en Isère | Guardiens",
  chambery: "Home sitting Chambéry — Gardien de confiance en Savoie | Guardiens",
};

const CityPageMeta = ({ city }: Props) => {
  const title =
    META_TITLE_OVERRIDES[city.slug] ||
    `House-sitting à ${city.name} – Gardiens vérifiés | Guardiens`;

  return (
    <PageMeta
      title={title}
      description={city.metaDescription}
      path={`/house-sitting/${city.slug}`}
    />
  );
};

export default CityPageMeta;
