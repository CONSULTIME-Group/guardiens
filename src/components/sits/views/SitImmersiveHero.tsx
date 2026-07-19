/**
 * Hero immersif de la fiche annonce (mosaïque photos + titre + ville).
 *
 * Extrait de SitImmersiveContent pour permettre à SitterSitView de placer
 * le hero AVANT la barre de candidature et la section rencontre,
 * tout en conservant le reste du contenu immersif après.
 */
import { slugify } from "@/lib/normalize";
import SitHero from "./tabs/SitHero";
import { speciesLabel } from "./tabs/sitMeta";

interface SitImmersiveHeroProps {
  sit: any;
  owner: any;
  property: any;
  pets: any[];
}

const SitImmersiveHero = ({
  sit,
  owner,
  property,
  pets,
}: SitImmersiveHeroProps) => {
  const photos: string[] = Array.isArray(property?.photos)
    ? property.photos.filter((p: any) => typeof p === "string" && p.trim().length > 0)
    : [];

  const safePets = Array.isArray(pets) ? pets.filter(Boolean) : [];

  const speciesSummary = (() => {
    const counts = new Map<string, number>();
    for (const p of safePets) {
      const label = speciesLabel(p?.species);
      counts.set(label, (counts.get(label) || 0) + 1);
    }
    const pluralize = (label: string, n: number) => {
      if (n <= 1) return `${n} ${label.toLowerCase()}`;
      const last = label.slice(-1).toLowerCase();
      const plural = last === "s" || last === "x" ? label : `${label}s`;
      return `${n} ${plural.toLowerCase()}`;
    };
    return Array.from(counts.entries())
      .map(([label, n]) => pluralize(label, n))
      .join(" · ");
  })();

  const ownerName = owner?.first_name || "L'hôte";
  const cityName = owner?.city || "";
  const department: string | undefined =
    owner?.department || (owner?.postal_code ? String(owner.postal_code).slice(0, 2) : undefined);

  return (
    <SitHero
      photos={photos}
      petPhotos={safePets
        .filter((p: any) => typeof p?.photo_url === "string" && p.photo_url.trim().length > 0)
        .map((p: any) => ({ url: p.photo_url, name: p?.name, species: p?.species }))}
      title={sit?.title}
      cityName={cityName}
      department={department}
      startDate={sit?.start_date}
      endDate={sit?.end_date}
      petsCount={safePets.length}
      speciesSummary={speciesSummary}
      ownerAvatarUrl={owner?.avatar_url}
      ownerName={ownerName}
      ownerVerified={owner?.verified}
    />
  );
};

export default SitImmersiveHero;
