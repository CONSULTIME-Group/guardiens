/**
 * Fond de carte unique de l'application : Plan IGN de la Géoplateforme.
 * Service public, sans clé d'accès, usage commercial autorisé sous réserve
 * d'afficher l'attribution IGN, qui est donc obligatoire sur chaque carte.
 */
export const MAP_TILE_URL =
  "https://data.geopf.fr/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=GEOGRAPHICALGRIDSYSTEMS.PLANIGNV2&STYLE=normal&TILEMATRIXSET=PM&FORMAT=image/png&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}";

export const MAP_TILE_ATTRIBUTION =
  '&copy; <a href="https://www.ign.fr/" target="_blank" rel="noopener">IGN</a> Géoplateforme';

export const MAP_TILE_MAX_ZOOM = 19;
