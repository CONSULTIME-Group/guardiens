/**
 * Hero photo principale + bandeau ville/titre superposé.
 * Utilisé en tête de SitImmersiveContent.
 */


interface SitHeroProps {
  photos: string[];
  title?: string | null;
  cityName?: string;
  department?: string;
}

const SitHero = ({ photos, title, cityName, department }: SitHeroProps) => {
  const coverPhoto = photos[0] || null;
  if (!coverPhoto) return null;

  return (
    <div className="rounded-3xl overflow-hidden border border-border bg-card mb-6">
      <div className="relative">
        <img
          src={coverPhoto}
          alt={title ? `Photo principale — ${title}` : "Photo principale de l'annonce"}
          loading="eager"
          fetchPriority="high"
          decoding="async"
          className="w-full h-[280px] md:h-[420px] object-cover"
        />
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-5 md:p-8">
          {(cityName || department) && (
            <p className="mb-2 text-white/90 text-sm font-medium">
              {cityName}
              {department ? ` · ${department}` : ""}
            </p>
          )}
          {title && (
            <h1 className="text-2xl md:text-4xl font-bold text-white leading-tight max-w-3xl">
              {title}
            </h1>
          )}
        </div>
      </div>

      {photos.length > 1 && (
        <div className="grid grid-cols-2 gap-1 p-1">
          {photos.slice(1, 3).map((p, i) => (
            <img
              key={i}
              src={p}
              alt={`Photo ${i + 2} de ${title || "l'annonce"}`}
              loading="lazy"
              className="w-full h-32 md:h-44 object-cover"
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default SitHero;
