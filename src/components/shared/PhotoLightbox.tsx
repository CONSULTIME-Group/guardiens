/**
 * Lightbox minimaliste pour afficher une photo unique en plein écran.
 *
 * Utilisation :
 *   <PhotoLightbox src={url} alt="Mochi" open={isOpen} onClose={close} />
 *
 * Caractéristiques :
 *  - Rendue via createPortal dans document.body pour échapper aux stacking
 *    contexts parents (sidebar, sticky bars).
 *  - z-[9999] pour passer au-dessus de toute UI applicative.
 *  - Ferme à : Escape, click sur l'overlay, click sur le bouton X.
 *  - Bloque le scroll du body tant qu'elle est ouverte.
 *  - role="dialog" + aria-modal pour les lecteurs d'écran.
 *
 * NB : pour une galerie multi-photos avec navigation, voir SitHero qui
 * implémente sa propre version plus riche (compteur, prev/next, swipe).
 */
import { useEffect } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

interface PhotoLightboxProps {
  src: string;
  alt: string;
  open: boolean;
  onClose: () => void;
}

const PhotoLightbox = ({ src, alt, open, onClose }: PhotoLightboxProps) => {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] bg-black/95 flex items-center justify-center animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-label="Photo en plein écran"
      onClick={onClose}
    >
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
        className="absolute top-4 right-4 z-10 bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-full p-3 text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
        aria-label="Fermer"
      >
        <X className="h-5 w-5" />
      </button>
      <img
        src={src}
        alt={alt}
        onClick={(e) => e.stopPropagation()}
        className="max-h-[90vh] max-w-[95vw] object-contain select-none"
        draggable={false}
      />
    </div>,
    document.body,
  );
};

export default PhotoLightbox;
