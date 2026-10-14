import { resolveSitPlace } from "@/lib/sitSearchRules";

/**
 * Lot H4 : point d'un lieu de garde tiré du profil public du propriétaire,
 * quand le lieu vient de ce profil (resolveSitPlace, source owner) et que le
 * profil porte ses coordonnées approchées. Sinon null (géocodage).
 */
export const profilePlacePoint = (s: any): { lat: number; lng: number } | null => {
  if (resolveSitPlace(s).source !== "owner") return null;
  const lat = Number(s?.owner?.latitude_approx);
  const lng = Number(s?.owner?.longitude_approx);
  if (s?.owner?.latitude_approx == null || s?.owner?.longitude_approx == null) return null;
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || (lat === 0 && lng === 0)) return null;
  return { lat, lng };
};
