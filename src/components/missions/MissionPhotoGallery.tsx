import { useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { X, ChevronLeft, ChevronRight } from "lucide-react";

interface MissionPhotoGalleryProps {
  photos: string[];
}

const MissionPhotoGallery = ({ photos }: MissionPhotoGalleryProps) => {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  if (!photos || photos.length === 0) return null;

  const openLightbox = (i: number) => setLightboxIndex(i);
  const closeLightbox = () => setLightboxIndex(null);
  const goPrev = () => setLightboxIndex((prev) => (prev !== null && prev > 0 ? prev - 1 : photos.length - 1));
  const goNext = () => setLightboxIndex((prev) => (prev !== null && prev < photos.length - 1 ? prev + 1 : 0));

  return (
    <>
      <div className="flex gap-3 overflow-x-auto pb-2 mb-6 scrollbar-thin">
        {photos.map((url, i) => (
          <button
            key={url}
            onClick={() => openLightbox(i)}
            className="shrink-0 w-32 h-24 rounded-xl overflow-hidden border border-border hover:ring-2 hover:ring-primary/30 transition-all"
          >
            <img src={url} alt="" className="w-full h-full object-cover" />
          </button>
        ))}
      </div>

      <Dialog open={lightboxIndex !== null} onOpenChange={closeLightbox}>
        <DialogContent className="max-w-3xl p-0 bg-black/95 border-none overflow-hidden">
          {lightboxIndex !== null && (
            <div className="relative flex items-center justify-center min-h-[50vh]">
              <img
                src={photos[lightboxIndex]}
                alt=""
                className="max-w-full max-h-[80vh] object-contain"
              />

              <button
                onClick={closeLightbox}
                className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>

              {photos.length > 1 && (
                <>
                  <button
                    onClick={goPrev}
                    className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-colors"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  <button
                    onClick={goNext}
                    className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-colors"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </button>
                </>
              )}

              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 text-white/60 text-xs">
                {lightboxIndex + 1} / {photos.length}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default MissionPhotoGallery;
