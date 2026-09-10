/**
 * Source unique des surfaces Alma.
 *
 * `surfaceFromPath` (utilisée par le dock) et le sélecteur de surface du
 * diagnostic admin lisent la même liste : une surface câblée ici est
 * toujours simulable côté admin.
 */

/** Surfaces produites par la navigation, donc par `surfaceFromPath`. */
export const ALMA_NAV_SURFACES = [
  "owner_dashboard",
  "sitter_dashboard",
  "sits_list",
  "sit_detail",
  "favorites",
  "search_page",
  "sitter_profile",
  "mutual_aid",
  "listings",
] as const;

/** Surfaces éditoriales, atteintes par le contenu et non par la navigation applicative. */
export const ALMA_CONTENT_SURFACES = [
  "breed_page",
  "city_page",
  "house_guide",
  "missions",
] as const;

export const ALMA_SURFACES = [
  ...ALMA_NAV_SURFACES,
  ...ALMA_CONTENT_SURFACES,
] as const;

export type AlmaSurface = (typeof ALMA_SURFACES)[number];

export function surfaceFromPath(
  pathname: string,
  activeRole?: "owner" | "sitter",
): string {
  if (pathname.startsWith("/dashboard")) {
    return activeRole === "sitter" ? "sitter_dashboard" : "owner_dashboard";
  }
  if (pathname === "/sits" || pathname === "/sits/") return "sits_list";
  if (pathname.startsWith("/sits/")) return "sit_detail";
  if (pathname === "/favoris") return "favorites";
  if (pathname.startsWith("/recherche-gardiens")) return "search_page";
  if (pathname.startsWith("/gardiens/")) return "sitter_profile";
  if (pathname.startsWith("/petites-missions")) return "mutual_aid";
  return "listings";
}
