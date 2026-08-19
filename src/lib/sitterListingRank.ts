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

  const ranked = listings
    .map((listing, index) => ({
      listing,
      index,
      distanceKm: distanceFrom(listing, origin),
      inAlert: alert ? isInAlert(listing, alert) : false,
      environmentMatches: environmentMatches(listing, preferred),
    }))
    .sort((a, b) => {
      if (source === "alert" && a.inAlert !== b.inAlert) return a.inAlert ? -1 : 1;

      if (source === "distance" || (source === "alert" && !isNationalAlert(alert as ListingAlertPreference))) {
        const distanceOrder = compareNullableAscending(a.distanceKm, b.distanceKm);
        if (distanceOrder !== 0) return distanceOrder;
      }

      const affinityOrder = (b.listing.affinityScore ?? -1) - (a.listing.affinityScore ?? -1);
      if (affinityOrder !== 0) return affinityOrder;
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