import PageMeta from "@/components/PageMeta";
import { buildOgImageUrl } from "@/lib/ogImage";
import type { CityData } from "@/data/cities";

interface Props {
  city: CityData;
  noindex?: boolean;
  /**
   * Titre SEO rédigé en base (seo_city_pages.meta_title), utilisé tel quel
   * quand il est non vide. Le gabarit générique reste le repli quand le
   * champ est vide. PageMeta réutilise le même titre pour og:title.
   */
  metaTitle?: string | null;
  /**
   * Propagé à PageMeta : tant que faux, window.prerenderReady reste à false.
   * Utilisé pour attendre la résolution des variables de contenu.
   */
  ready?: boolean;
}

const META_TITLE_OVERRIDES: Record<string, string> = {
  lyon: "Garde chien et chat à Lyon, Home sitter | Guardiens",
  grenoble: "Home sitting Grenoble, Gardien de confiance en Isère | Guardiens",
  chambery: "Home sitting Chambéry, Gardien de confiance en Savoie | Guardiens",
};

const CityPageMeta = ({ city, noindex = false, metaTitle, ready }: Props) => {
  const title =
    (metaTitle && metaTitle.trim()) ||
    META_TITLE_OVERRIDES[city.slug] ||
    `House-sitting à ${city.name}, garde d'animaux, de maison et de jardin, gardiens près de chez vous | Guardiens`;

  return (
    <PageMeta
      title={title}
      description={city.metaDescription}
      path={`/house-sitting/${city.slug}`}
      noindex={noindex}
      ready={ready}
      image={buildOgImageUrl({
        title: city.name,
        subtitle: "Garde d'animaux, de maison et de jardin entre particuliers",
        kind: "ville",
      })}
    />
  );
};

export default CityPageMeta;
