/**
 * Lot D7 (09/11/2026, audit « Tableaux de bord ordinateur », état G3) : un
 * gardien dont la garde ouverte la plus proche est au-delà de 50 km choisit,
 * depuis son accueil ordinateur, une zone d'alerte plus large. Règles pures :
 * zones proposées (100 km, son département, la France), zones déjà suivies
 * écartées, nombre réel de gardes ouvertes par zone (get_alert_zone_options,
 * migration 0125), jamais de zéro affiché, et paramètres de
 * create_alert_preference pour la zone retenue.
 */

/** Au-delà de cette distance, la garde la plus proche fait de l'accueil un état G3. */
export const FAR_NEAREST_SIT_KM = 50;
export const ALERT_ZONE_RADIUS_KM = 100;
/** Plafond de create_alert_preference (alertes actives). */
export const MAX_ACTIVE_ALERTS = 5;

export type AlertZoneKind = "rayon" | "departement" | "france";

export interface AlertZoneData {
  located: boolean;
  city: string | null;
  postal_code: string | null;
  departement: string | null;
  departement_name: string | null;
  open_sits: { r100: number | null; departement: number | null; france: number | null };
  alerts: Array<{ zone_type: string; radius_km: number | null; departement: string | null; region_code: string | null }>;
  active_alerts: number;
}

export interface AlertZoneChoice {
  kind: AlertZoneKind;
  label: string;
  /** Phrase du compte, absente à zéro (aucun compteur à zéro affiché). */
  countLine: string | null;
  count: number;
  /** Fin de la phrase de confirmation : « les nouvelles gardes {scope} ». */
  scope: string;
}

/** État G3 : pas de garde à venir, garde ouverte la plus proche au-delà de 50 km. */
export function isFarFromSits(nearestKm: number | string | null | undefined, hasNextGuard: boolean): boolean {
  if (hasNextGuard) return false;
  const km = Number(nearestKm);
  return Number.isFinite(km) && Math.round(km) > FAR_NEAREST_SIT_KM;
}

const countLine = (n: number): string | null =>
  n > 0 ? `${n} garde${n > 1 ? "s" : ""} ouverte${n > 1 ? "s" : ""} aujourd'hui` : null;

function covers(alerts: AlertZoneData["alerts"], kind: AlertZoneKind, dept: string | null): boolean {
  return alerts.some((a) => {
    if (a.zone_type === "france" || (a.zone_type === "region" && a.region_code === "FR")) return true;
    if (kind === "rayon") return a.zone_type === "rayon" && (a.radius_km ?? 0) >= ALERT_ZONE_RADIUS_KM;
    if (kind === "departement") return a.zone_type === "departement" && !!dept && a.departement === dept;
    return false;
  });
}

/** Zones proposées, du plus petit nombre de gardes au plus grand, la France en dernier. */
export function buildAlertZoneChoices(data: AlertZoneData | null | undefined): AlertZoneChoice[] {
  if (!data) return [];
  const alerts = Array.isArray(data.alerts) ? data.alerts : [];
  const out: AlertZoneChoice[] = [];
  const r100 = data.open_sits?.r100;
  if (data.located && data.city && typeof r100 === "number" && !covers(alerts, "rayon", null)) {
    out.push({ kind: "rayon", label: "À 100 km de chez vous", countLine: countLine(r100), count: r100, scope: "à 100 km de chez vous" });
  }
  const dept = data.open_sits?.departement;
  if (data.departement && data.departement_name && typeof dept === "number" && !covers(alerts, "departement", data.departement)) {
    out.push({
      kind: "departement",
      label: `Dans votre département (${data.departement_name})`,
      countLine: countLine(dept),
      count: dept,
      scope: "de votre département",
    });
  }
  const france = data.open_sits?.france;
  if (typeof france === "number" && !covers(alerts, "france", null)) {
    out.push({ kind: "france", label: "Partout en France", countLine: countLine(france), count: france, scope: "en France" });
  }
  const local = out.filter((c) => c.kind !== "france").sort((a, b) => a.count - b.count);
  return [...local, ...out.filter((c) => c.kind === "france")];
}

/** Choix proposé d'office : la plus petite zone qui compte déjà une garde, sinon la première. */
export function defaultAlertZone(choices: AlertZoneChoice[]): AlertZoneKind | null {
  return (choices.find((c) => c.count > 0) ?? choices[0])?.kind ?? null;
}

export const alertZonesFull = (data: AlertZoneData | null | undefined): boolean =>
  (data?.active_alerts ?? 0) >= MAX_ACTIVE_ALERTS;

/** Paramètres de create_alert_preference pour la zone retenue (gardes et nouvelles annonces). */
export function alertZoneRpcArgs(kind: AlertZoneKind, data: AlertZoneData): Record<string, unknown> {
  const base = {
    p_city: null as string | null,
    p_postal_code: null as string | null,
    p_radius_km: null as number | null,
    p_departement: null as string | null,
    p_region_code: null as string | null,
    p_alert_types: ["gardes", "new_sit"],
    p_heure_envoi: "08:00",
    p_frequence: "quotidien",
  };
  if (kind === "rayon") {
    return { ...base, p_label: `Autour de ${data.city} (${ALERT_ZONE_RADIUS_KM} km)`, p_zone_type: "rayon",
      p_city: data.city, p_postal_code: data.postal_code, p_radius_km: ALERT_ZONE_RADIUS_KM };
  }
  if (kind === "departement") {
    return { ...base, p_label: `Département ${data.departement_name}`, p_zone_type: "departement", p_departement: data.departement };
  }
  return { ...base, p_label: "France entière", p_zone_type: "france" };
}

export const ALERT_ZONE_TITLE = "Recevez les gardes d'un peu plus loin, dès leur parution.";
export const ALERT_ZONE_CTA = "Enregistrer ma zone";
export const ALERT_ZONE_KEEP = "Vos zones actuelles restent en place.";
export const alertZoneDone = (scope: string) =>
  `Zone enregistrée. Les nouvelles gardes ${scope} arrivent désormais dans vos alertes par email.`;
export const ALERT_ZONE_FULL =
  "Vous suivez déjà cinq zones d'alerte. Choisissez celle à élargir dans Mon secteur.";
