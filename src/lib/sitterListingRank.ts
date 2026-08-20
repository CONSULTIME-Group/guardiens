import { haversineDistance } from "@/utils/geo";

export type ListingRankingSource = "alert" | "distance" | "affinity";

export interface ListingRankPoint {
  lat: number;
  lng: number;
}

export interface ListingAlertPreference {
  zoneType: string;
  radiusKm: number | null;
  department: string | null;
  center: ListingRankPoint | null;
}

export interface RankableListing {
  id: string;
  department: string | null;
  coords: ListingRankPoint | null;
  affinityScore: number | null;
  environments: string[];
}

interface RankListingsInput<T extends RankableListing> {
  listings: T[];
  alert: ListingAlertPreference | null;
  sitterCoords: ListingRankPoint | null;
  preferredEnvironments: string[];
  limit?: number;
}

const normalizeEnvironment = (value: string) =>
  value.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

const environmentMatches = (listing: RankableListing, preferred: ReadonlySet<string>) =>
  listing.environments.reduce(
    (count, environment) => count + (preferred.has(normalizeEnvironment(environment)) ? 1 : 0),
    0,
  );

const distanceFrom = (listing: RankableListing, origin: ListingRankPoint | null): number | null =>
  listing.coords && origin ? haversineDistance(origin, listing.coords) : null;

const compareNullableAscending = (a: number | null, b: number | null) => {
  if (a == null && b == null) return 0;
  if (a == null) return 1;
  if (b == null) return -1;
  return a - b;
};

const isNationalAlert = (alert: ListingAlertPreference) =>
  alert.zoneType === "france" || alert.zoneType === "region";

const isInAlert = (listing: RankableListing, alert: ListingAlertPreference): boolean => {
  if (isNationalAlert(alert)) return true;
  if (alert.zoneType === "departement") {
    return !!alert.department && listing.department === alert.department;
  }
  if (alert.zoneType === "rayon") {
    const distance = distanceFrom(listing, alert.center);
    return distance != null && alert.radiusKm != null && distance <= alert.radiusKm;
  }
  return false;
};

export function rankSitterListings<T extends RankableListing>({
  listings,
  alert,
  sitterCoords,
  preferredEnvironments,
  limit = 3,
}: RankListingsInput<T>): { listings: Array<T & { distanceKm: number | null }>; source: ListingRankingSource } {
  const source: ListingRankingSource = alert ? "alert" : sitterCoords ? "distance" : "affinity";
  const origin = alert?.center ?? sitterCoords;
  const preferred = new Set(preferredEnvironments.map(normalizeEnvironment));

  /**
   * Palier de proximité (0 = affiché en premier) : zone d'alerte (ou mode
   * affinité nationale), puis tout près (<= 30 km), proche (<= 100 km),
   * étendu (<= 200 km), au-delà, sans coordonnées. La géographie de
   * l'alerte reste la priorité absolue : une annonce hors zone ne passe
   * jamais devant une annonce dans la zone.
   */
  const tierOf = (entry: { distanceKm: number | null; inAlert: boolean }): number => {
    if (alert && entry.inAlert) return 0;
    if (source === "affinity") return 0;
    const km = entry.distanceKm;
    if (km == null) return 5;
    if (km <= 30) return 1;
    if (km <= 100) return 2;
    if (km <= 200) return 3;
    return 4;
  };

  const ranked = listings
    .map((listing, index) => ({
      listing,
      index,
      distanceKm: distanceFrom(listing, origin),
      inAlert: alert ? isInAlert(listing, alert) : false,
      environmentMatches: environmentMatches(listing, preferred),
    }))
    .sort((a, b) => {
      const tierOrder = tierOf(a) - tierOf(b);
      if (tierOrder !== 0) return tierOrder;

      // Dans un même palier : la meilleure affinité en premier. La carte
      // vedette (rang 0) porte donc toujours la meilleure affinité du
      // palier affiché (correctif du cas 81 % vedette devant un 88 %).
      const affinityOrder = (b.listing.affinityScore ?? -1) - (a.listing.affinityScore ?? -1);
      if (affinityOrder !== 0) return affinityOrder;

      const distanceOrder = compareNullableAscending(a.distanceKm, b.distanceKm);
      if (distanceOrder !== 0) return distanceOrder;

      if (b.environmentMatches !== a.environmentMatches) return b.environmentMatches - a.environmentMatches;
      return a.index - b.index;
    })
    .slice(0, limit)
    .map(({ listing, distanceKm }) => ({ ...listing, distanceKm }));

  return { listings: ranked, source };
}

export function listingRankingSubtitle(source: ListingRankingSource): string {
  if (source === "alert") return "Dans votre zone d'alerte.";
  if (source === "distance") return "Autour de chez vous.";
  return "Partout en France, les plus proches de votre profil.";
}