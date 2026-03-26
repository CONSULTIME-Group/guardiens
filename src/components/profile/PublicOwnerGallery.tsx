import { useState } from "react";

const CATEGORY_LABELS: Record<string, string> = {
  home_life: "🏠 Maison",
  animals_life: "🐾 Animaux",
  garden: "🌿 Jardin",
  neighborhood: "🏘️ Quartier",
  seasonal: "🍂 Saisons",
};

const SEASON_ICONS: Record<string, string> = {
  printemps: "🌸",
  été: "☀️",
  automne: "🍂",
  hiver: "❄️",
};

interface Photo {
  id: string;
  photo_url: string;
  caption: string;
  category: string;
  season: string | null;
}

interface Props {
  photos: Photo[];
  firstName: string;
  city?: string;
}

const PublicOwnerGallery = ({ photos, firstName, city }: Props) => {
  const [filter, setFilter] = useState("all");
  const [lightbox, setLightbox] = useState<Photo | null>(null);

  if (photos.length === 0) return null;

  const categories = Array.from(new Set(photos.map(p => p.category)));
  const filtered = filter === "all" ? photos : photos.filter(p => p.category === filter);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-heading font-semibold text-sm">La vie ici</h3>
        <span className="text-xs text-muted-foreground">{photos.length} photo{photos.length > 1 ? "s" : ""}</span>
      </div>

      {/* Category pills */}
      {categories.length > 1 && (
        <div className="flex gap-1.5 flex-wrap">
          <button
            onClick={() => setFilter("all")}
            className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${filter === "all" ? "bg-primary text-primary-foreground" : "bg-accent text-accent-foreground hover:bg-accent/80"}`}
          >
            Toutes
          </button>
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setFilter(cat)}
              className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${filter === cat ? "bg-primary text-primary-foreground" : "bg-accent text-accent-foreground hover:bg-accent/80"}`}
            >
              {CATEGORY_LABELS[cat] || cat}
            </button>
          ))}
        </div>
      )}

      {/* Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {filtered.map(photo => (
          <button
            key={photo.id}
            onClick={() => setLightbox(photo)}
            className="group relative rounded-xl overflow-hidden aspect-square"
          >
            <img
              src={photo.photo_url}
              alt={`${photo.caption} — Logement house-sitting à ${city || "France"} | Guardiens`}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-end">
              <p className="p-2 text-white text-xs opacity-0 group-hover:opacity-100 transition-opacity line-clamp-2">
                {photo.caption}
              </p>
            </div>
            {photo.season && (
              <span className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded-full bg-black/40 text-white text-[10px]">
                {SEASON_ICONS[photo.season] || ""} {photo.season}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Lightbox */}
      {lightbox && (
        <div
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
          onClick={() => setLightbox(null)}
        >
          <div className="max-w-3xl max-h-[90vh] flex flex-col items-center" onClick={e => e.stopPropagation()}>
            <img src={lightbox.photo_url} alt={lightbox.caption} className="max-h-[75vh] rounded-xl object-contain" />
            <div className="mt-3 text-center">
              <p className="text-white text-sm">{lightbox.caption}</p>
              <p className="text-white/60 text-xs mt-1">{CATEGORY_LABELS[lightbox.category] || lightbox.category}</p>
            </div>
            <button onClick={() => setLightbox(null)} className="mt-4 text-white/60 hover:text-white text-sm">
              Fermer
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default PublicOwnerGallery;
