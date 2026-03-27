import { Helmet } from "react-helmet-async";
import type { CityData } from "@/data/cities";

interface Props {
  city: CityData;
}

const CityPageMeta = ({ city }: Props) => {
  const url = `https://guardiens.fr/house-sitting-${city.slug}`;

  return (
    <Helmet>
      <title>{`House-sitting à ${city.name} – Gardiens vérifiés | Guardiens`}</title>
      <meta name="description" content={city.metaDescription} />
      <link rel="canonical" href={url} />
      <meta property="og:title" content={`House-sitting à ${city.name} – Guardiens`} />
      <meta property="og:description" content={city.metaDescription} />
      <meta property="og:url" content={url} />
      <meta property="og:type" content="website" />
      <meta property="og:site_name" content="Guardiens" />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={`House-sitting à ${city.name} – Guardiens`} />
      <meta name="twitter:description" content={city.metaDescription} />
    </Helmet>
  );
};

export default CityPageMeta;
