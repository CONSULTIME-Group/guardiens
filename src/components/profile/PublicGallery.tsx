import { useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { CheckCircle2, X, Camera } from "lucide-react";

interface GalleryPhoto {
  id: string;
  photo_url: string;
  caption: string;
  animal_type: string | null;
  animal_breed: string | null;
  city: string | null;
  photo_date: string | null;
  source: string;
}

interface PublicGalleryProps {
  photos: GalleryPhoto[];
  firstName: string;
}

const PublicGallery = ({ photos, firstName }: PublicGalleryProps) => {
  const [lightbox, setLightbox] = useState<GalleryPhoto | null>(null);

  if (photos.length === 0) return null;

  const uniqueAnimals = new Set(photos.map(p => p.animal_type).filter(Boolean));

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-heading font-semibold text-sm flex items-center gap-1.5">
          <Camera className="h-4 w-4" /> Galerie
        </h3>
        <span className="text-xs text-muted-foreground">{photos.length} photo{photos.length > 1 ? "s" : ""} · {uniqueAnimals.size} type{uniqueAnimals.size > 1 ? "s" : ""} d'animaux</span>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
        {photos.map(photo => (
          <div key={photo.id} className="group relative aspect-square rounded-xl overflow-hidden cursor-pointer" onClick={() => setLightbox(photo)}>
            <img
              src={photo.photo_url}
              alt={`Photo de ${photo.animal_breed || photo.animal_type || "animal"} gardé à ${photo.city || ""} par ${firstName} — Guardiens`}
              className="w-full h-full object-cover transition-transform group-hover:scale-105"
              loading="lazy"
            />
            <span className={`absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded-full text-[10px] font-medium ${photo.source === "guardiens" ? "bg-primary text-primary-foreground" : "bg-muted/90 text-muted-foreground"}`}>
              {photo.source === "guardiens" ? "Guardiens" : "Exp. passée"}
            </span>
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-2">
              <p className="text-white text-xs line-clamp-2">{photo.caption}</p>
            </div>
          </div>
        ))}
      </div>

      {lightbox && (
        <Dialog open={!!lightbox} onOpenChange={() => setLightbox(null)}>
          <DialogContent className="max-w-2xl p-0 overflow-hidden">
            <div className="relative">
              <img src={lightbox.photo_url} alt={lightbox.caption} className="w-full max-h-[70vh] object-contain bg-black" />
              <button onClick={() => setLightbox(null)} className="absolute top-3 right-3 p-2 rounded-full bg-black/60 text-white hover:bg-black/80">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="p-4 space-y-1">
              <p className="font-medium text-sm">{lightbox.caption}</p>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                {lightbox.animal_type && <span className="capitalize">{lightbox.animal_type}</span>}
                {lightbox.animal_breed && <span>· {lightbox.animal_breed}</span>}
                {lightbox.city && <span>· {lightbox.city}</span>}
                {lightbox.photo_date && <span>· {lightbox.photo_date}</span>}
              </div>
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${lightbox.source === "guardiens" ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
                {lightbox.source === "guardiens" ? <><CheckCircle2 className="h-3 w-3" /> Guardiens</> : "Expérience passée"}
              </span>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default PublicGallery;
