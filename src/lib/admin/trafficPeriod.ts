/**
 * Lot TRF-6 (15/11/2026, maquette « Guardiens admin Trafic : actions et
 * lecture en un écran », validée par Jérémie) : une seule période pour les
 * trois onglets de /admin/traffic, portée par l'adresse (?periode=).
 */
import { LEADS_PERIODS, LEADS_TRACKING_START, DEFAULT_LEADS_PERIOD, type LeadsPeriod } from "@/lib/admin/channelLeads";

export type TrafficPeriod = LeadsPeriod;
export const TRAFFIC_PERIODS = LEADS_PERIODS;
export const DEFAULT_TRAFFIC_PERIOD: TrafficPeriod = DEFAULT_LEADS_PERIOD;
export const TRAFFIC_PERIOD_PARAM = "periode";

export function trafficPeriodFromParam(param: string | null): TrafficPeriod {
  if (param === "suivi") return "suivi";
  const n = Number(param);
  return (TRAFFIC_PERIODS as readonly (string | number)[]).includes(n) ? (n as TrafficPeriod) : DEFAULT_TRAFFIC_PERIOD;
}

/** Nombre de jours de la période : « suivi » compte du 12/11/2026 à aujourd'hui, bornes comprises. */
export function trafficPeriodDays(p: TrafficPeriod, now = new Date()): number {
  if (p !== "suivi") return p;
  const start = Date.parse(`${LEADS_TRACKING_START}T00:00:00+01:00`);
  return Math.max(1, Math.ceil((now.getTime() - start) / 86_400_000));
}

export function trafficPeriodShortLabel(p: TrafficPeriod): string {
  return p === "suivi" ? "Depuis le suivi" : `${p} j`;
}

/** « en 4 jours », « en 30 jours » : complément de phrase des synthèses. */
export function trafficPeriodPhrase(p: TrafficPeriod, now = new Date()): string {
  const d = trafficPeriodDays(p, now);
  return p === "suivi" ? `depuis le 12/11 (${d} jour${d > 1 ? "s" : ""})` : `en ${d} jours`;
}
