const EARTH_RADIUS_M = 6_371_000;

const hashUuid = (id: string): number => {
  let hash = 2166136261;
  for (let index = 0; index < id.length; index += 1) {
    hash ^= id.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
};

export interface MapPoint {
  lat: number;
  lng: number;
}

/** Décalage stable de 200 à 500 mètres, calculé uniquement depuis l'identifiant. */
export const offsetApproximatePoint = (id: string, lat: number, lng: number): MapPoint => {
  const hash = hashUuid(id);
  const distance = 200 + (hash % 301);
  const angle = ((hash >>> 9) % 360) * (Math.PI / 180);
  const latOffset = (distance * Math.cos(angle) / EARTH_RADIUS_M) * (180 / Math.PI);
  const cosLatitude = Math.max(0.2, Math.cos(lat * Math.PI / 180));
  const lngOffset = (distance * Math.sin(angle) / (EARTH_RADIUS_M * cosLatitude)) * (180 / Math.PI);
  return { lat: lat + latOffset, lng: lng + lngOffset };
};

export const offsetDistanceMeters = (source: MapPoint, shifted: MapPoint): number => {
  const toRad = (value: number) => value * Math.PI / 180;
  const dLat = toRad(shifted.lat - source.lat);
  const dLng = toRad(shifted.lng - source.lng);
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(toRad(source.lat)) * Math.cos(toRad(shifted.lat)) * Math.sin(dLng / 2) ** 2;
  return EARTH_RADIUS_M * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};