import { useEffect, useState } from "react";
import { MapPin, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { trackEvent } from "@/lib/analytics";

const STORAGE_KEY = "entraide-geoloc-banner-dismissed-v1";

interface Props {
  hasCoords: boolean;
  onUseMyLocation: () => void;
}

/**
 * Banner géoloc EntraideHub — s'affiche 1 fois, dismiss persistant (localStorage).
 * Ne s'affiche pas si l'utilisateur a déjà des coordonnées.
 */
const EntraideGeolocBanner = ({ hasCoords, onUseMyLocation }: Props) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (hasCoords) return;
    try {
      const dismissed = localStorage.getItem(STORAGE_KEY);
      if (!dismissed) {
        setVisible(true);
        try { trackEvent("entraide_geoloc_banner_shown", {}); } catch {}
      }
    } catch { /* localStorage indisponible */ }
  }, [hasCoords]);

  const dismiss = () => {
    setVisible(false);
    try { localStorage.setItem(STORAGE_KEY, "1"); } catch {}
    try { trackEvent("entraide_geoloc_banner_dismissed", {}); } catch {}
  };

  const activate = () => {
    try { trackEvent("entraide_geoloc_banner_accepted", {}); } catch {}
    onUseMyLocation();
    dismiss();
  };

  if (!visible) return null;

  return (
    <div className="rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 flex items-start gap-3 mb-4">
      <div className="rounded-full bg-primary/15 p-2 shrink-0">
        <MapPin className="h-4 w-4 text-primary" aria-hidden="true" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground">
          Voir l'entraide près de chez vous
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          Activez votre position pour trier les missions par distance et recevoir
          les nouvelles annonces publiées autour de vous.
        </p>
        <div className="flex gap-2 mt-2">
          <Button size="sm" onClick={activate} className="h-8 text-xs">
            Utiliser ma position
          </Button>
          <Button size="sm" variant="ghost" onClick={dismiss} className="h-8 text-xs">
            Plus tard
          </Button>
        </div>
      </div>
      <button
        type="button"
        onClick={dismiss}
        aria-label="Fermer"
        className="text-muted-foreground hover:text-foreground shrink-0"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
};

export default EntraideGeolocBanner;
