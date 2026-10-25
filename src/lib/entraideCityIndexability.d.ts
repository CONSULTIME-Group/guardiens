export interface EntraideCityCenter {
  slug: string;
  name: string;
  lat: number;
  lng: number;
}

export interface EntraideActivityRow {
  latitude?: number | string | null;
  longitude?: number | string | null;
  created_on?: string | null;
  created_at?: string | null;
}

export declare const ENTRAIDE_CITY_WINDOW_DAYS: number;
export declare const ENTRAIDE_CITY_RADIUS_KM: number;
export declare const ENTRAIDE_ACTIVITY_VIEW: string;
export declare const ENTRAIDE_CITY_CENTERS: EntraideCityCenter[];
export declare const LLMS_ENTRAIDE_CITIES_RE: RegExp;
export declare function entraideCityPath(slug: string): string;
export declare function isEntraideCityPath(loc: string | null | undefined): boolean;
export declare function entraideCityBySlug(slug: string): EntraideCityCenter | null;
export declare function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number;
export declare function entraideCityForPoint(
  latitude: number | string | null | undefined,
  longitude: number | string | null | undefined,
): EntraideCityCenter | null;
export declare function isRecentNeedRow(row: EntraideActivityRow | null | undefined, now?: Date): boolean;
export declare function entraideCitiesWithRecentNeed(rows: EntraideActivityRow[] | null | undefined, now?: Date): Set<string>;
export declare function isEntraideCityIndexable(slug: string, rows: EntraideActivityRow[] | null | undefined, now?: Date): boolean;
export declare function entraideCityLlmsLine(slug: string): string | null;
export declare function entraideCitiesLlmsBlock(indexableSlugs: Set<string> | string[] | null | undefined): string;
export declare function houseSittingSlugFromCity(city: string | null | undefined): string | null;
