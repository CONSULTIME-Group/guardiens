import { useEffect } from "react";
import { useMap } from "react-leaflet";
import type { Map as LeafletMap } from "leaflet";

/**
 * Garde-fou de démontage pour toute carte react-leaflet.
 *
 * 1. Leaflet planifie `setTimeout(_onZoomTransitionEnd, 250)` à chaque zoom
 * animé (fitBounds/setView/pinch), et `map.remove()` n'annule PAS ce timer
 * (`_stop` ne couvre que flyTo/pan). Si la carte est démontée pendant
 * l'animation, le timer s'exécute sur une carte sans `_mapPane` :
 * crash "Cannot read properties of undefined (reading '_leaflet_pos')"
 * (empreinte lo413y, /search, mobile). Le cleanup React des enfants
 * s'exécute AVANT celui de MapContainer (qui appelle map.remove()) :
 * neutraliser `_animatingZoom` ici fait sortir le timer par son garde-fou
 * interne `if (!this._animatingZoom) return;`.
 *
 * 2. Lot F2 : une couche ajoutée ou retirée sur une carte déjà détruite, ou
 * une couche nulle, levait "Cannot use 'in' operator to search for
 * '_leaflet_id' in null" et "reading '_removePath'" (/petites-missions/
 * saint-etienne). addLayer et removeLayer de l'instance ne font plus rien
 * si la carte n'a plus de `_mapPane` ou si la couche est absente.
 *
 * À placer en premier enfant de tout <MapContainer>.
 */
export const isMapAlive = (map: LeafletMap | null | undefined): boolean =>
  Boolean(map && (map as unknown as { _mapPane?: unknown })._mapPane);

export const guardLayerCalls = (map: LeafletMap): void => {
  const flagged = map as unknown as { __layerGuard?: boolean };
  if (flagged.__layerGuard) return;
  flagged.__layerGuard = true;
  const add = map.addLayer.bind(map);
  const remove = map.removeLayer.bind(map);
  map.addLayer = ((layer) => (layer && isMapAlive(map) ? add(layer) : map)) as LeafletMap["addLayer"];
  map.removeLayer = ((layer) => (layer && isMapAlive(map) ? remove(layer) : map)) as LeafletMap["removeLayer"];
};

export const LeafletUnmountGuard = () => {
  const map = useMap();
  guardLayerCalls(map);
  useEffect(() => {
    return () => {
      (map as unknown as { _animatingZoom: boolean })._animatingZoom = false;
    };
  }, [map]);
  return null;
};

export default LeafletUnmountGuard;
