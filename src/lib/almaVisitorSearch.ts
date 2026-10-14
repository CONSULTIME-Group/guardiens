/**
 * Lot A6 (14/10/2026) : la bulle Alma « recherche vide » mène un visiteur
 * vers l'inscription, jamais vers une alerte qu'il ne peut pas créer
 * (create_alert_from_search et create_alert_preference refusées à anon).
 *
 * Module pur : adresses d'inscription, retour à la recherche avec reprise
 * de l'alerte, et règle d'affichage d'« Élargir à la région ».
 */

export type SearchZoneMode = "radius" | "dept" | "region" | "france";

/** Paramètre posé au retour d'inscription : l'alerte du secteur est créée une fois. */
export const VISITOR_ALERT_PARAM = "alerte";

/** Destination de « Vous partez ? Publiez votre annonce » pour un visiteur. */
export const VISITOR_OWNER_PUBLISH_SIGNUP_URL = `/inscription?role=owner&redirect=${encodeURIComponent("/sits/create")}`;

/**
 * Recherche courante (chemin et requête), avec la zone quand elle diffère du
 * rayon (la zone n'est pas recopiée dans l'URL par la recherche) et le
 * marqueur de reprise de l'alerte.
 */
export function visitorSearchRedirect(pathname: string, search: string, zoneMode: SearchZoneMode): string {
  const params = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
  if (zoneMode !== "radius") params.set("zone", zoneMode);
  params.set(VISITOR_ALERT_PARAM, "1");
  const path = pathname && pathname.startsWith("/") ? pathname : "/annonces";
  return `${path}?${params.toString()}`;
}

/** « Recevoir les annonces de ce secteur » : inscription gardien, retour à la recherche. */
export function visitorSectorSignupUrl(redirect: string): string {
  return `/inscription?role=sitter&redirect=${encodeURIComponent(redirect)}`;
}

/**
 * Carte Alma d'un profil public, visiteur : inscription avec le rôle attendu
 * (propriétaire devant un gardien, gardien devant un propriétaire), retour au profil.
 */
export function profileSignupHref(role: "owner" | "sitter", redirect: string): string {
  return `/inscription?role=${role}&redirect=${encodeURIComponent(redirect)}`;
}

/** « Élargir à la région » n'a de sens que pour un rayon ou un département. */
export function canExpandToRegion(zoneMode: SearchZoneMode): boolean {
  return zoneMode === "radius" || zoneMode === "dept";
}

/**
 * Au retour d'inscription, l'alerte n'est créée que si la recherche porte une
 * zone exploitable : une ville pour le rayon, sinon département ou France.
 */
export function shouldResumeVisitorAlert(input: {
  isMember: boolean;
  alertParam: string | null;
  zoneMode: SearchZoneMode;
  city: string;
}): boolean {
  if (!input.isMember || input.alertParam !== "1") return false;
  if (input.zoneMode === "radius" || input.zoneMode === "region") return input.city.trim().length > 0;
  return true;
}
