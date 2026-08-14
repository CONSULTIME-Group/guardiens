import { useEffect } from "react";
import { useMap } from "react-leaflet";

/**
 * Garde-fou de démontage pour toute carte react-leaflet.
 *
 * Leaflet planifie `setTimeout(_onZoomTransitionEnd, 250)` à chaque zoom
 * animé (fitBounds/setView/pinch), et `map.remove()` n'annule PAS ce timer
 * (`_stop` ne couvre que flyTo/pan). Si la carte est démontée pendant
 * l'animation, le timer s'exécute sur une carte sans `_mapPane` :
 * crash "Cannot read properties of undefined (reading '_leaflet_pos')"
 * (empreinte lo413y, /search, mobile).
 *
 * Le cleanup React des enfants s'exécute AVANT celui de MapContainer (qui
 * appelle map.remove()) : neutraliser `_animatingZoom` ici fait sortir le
 * timer par son garde-fou interne `if (!this._animatingZoom) return;`.
 *
 * À placer en premier enfant de tout <MapContainer>.
 */
export const LeafletUnmountGuard = () => {
  const map = useMap();
  useEffect(() => {
    return () => {
      (map as unknown as { _animatingZoom: boolean })._animatingZoom = false;
    };
  }, [map]);
  return null;
};

export default LeafletUnmountGuard;
