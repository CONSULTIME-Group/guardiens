import PageMeta from "@/components/PageMeta";
import { buildOgImageUrl } from "@/lib/ogImage";
import type { CityData } from "@/data/cities";

interface Props {
  city: CityData;
  noindex?: boolean;
}

const META_TITLE_OVERRIDES: Record<string, string> = {
  lyon: "Garde chien et chat à Lyon, Home sitter | Guardiens",
  grenoble: "Home sitting Grenoble, Gardien de confiance en Isère | Guardiens",
  chambery: "Home sitting Chambéry, Gardien de confiance en Savoie | Guardiens",
};

const CityPageMeta = ({ city, noindex = false }: Props) => {
  const title =
    META_TITLE_OVERRIDES[city.slug] ||
    `House-sitting à ${city.name} – Gardiens vérifiés | Guardiens`;

  return (
    <PageMeta
      title={title}
      description={city.metaDescription}
      path={`/house-sitting/${city.slug}`}
      noindex={noindex}
      image={buildOgImageUrl({
        title: city.name,
        subtitle: "Garde d'animaux entre particuliers",
        kind: "ville",
      })}
    />
  );
};

export default CityPageMeta;
