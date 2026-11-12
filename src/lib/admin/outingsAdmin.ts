/**
 * Lot SORT5 : lecture et pilotage des sorties dans l'espace admin.
 * Règles pures (états, compteurs, libellés) et les deux appels de la page.
 * Les fonctions SQL du lot sont absentes des types générés tant que la
 * migration 0149 n'est pas en base, d'où le client non typé de ce seul fichier.
 */
import { supabase } from "@/integrations/supabase/client";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

export type AdminOutingSource = "site" | "lien" | "alerte" | "garde";

export interface AdminOutingRow {
  id: string;
  slug: string;
  title: string;
  category: string;
  city: string | null;
  place_kind: "home" | "public" | "online";
  starts_at: string;
  created_at: string;
  status: "open" | "cancelled";
  hidden_at: string | null;
  capacity: number;
  reserved: number;
  taken: number;
  sources: Partial<Record<AdminOutingSource, number>>;
  alerts_sent: number;
  reports_open: number;
  organizer_id: string;
  organizer_first_name: string | null;
  organizer_last_seen_at: string | null;
}

export interface AdminOutingCounters {
  published_total: number;
  published_30d: number;
  upcoming_open: number;
  with_attendee: number;
  organizers: number;
  cancelled: number;
  hidden: number;
  joins_total: number;
  joins_by_source: Partial<Record<AdminOutingSource, number>>;
  left_total: number;
  alerts_sent: number;
  alerts_sent_7d: number;
  alerts_stopped: number;
  alerts_radius: Partial<Record<"quartier" | "5" | "15", number>>;
  reports_open: number;
  flags: Partial<Record<"sorties" | "sorties_emails" | "sorties_alertes", boolean>>;
}

export interface AdminOutingsOverview {
  counters: AdminOutingCounters;
  outings: AdminOutingRow[];
  generated_at: string;
}

export const ADMIN_OUTING_SOURCES: ReadonlyArray<{ value: AdminOutingSource; label: string }> = [
  { value: "site", label: "Site" },
  { value: "lien", label: "Lien partagé" },
  { value: "alerte", label: "Alerte" },
  { value: "garde", label: "Garde" },
];

export const ADMIN_OUTING_FLAGS: ReadonlyArray<{ key: "sorties" | "sorties_emails" | "sorties_alertes"; label: string }> = [
  { key: "sorties", label: "Rubrique" },
  { key: "sorties_emails", label: "Emails de service" },
  { key: "sorties_alertes", label: "Alerte nouvelle sortie" },
];

export type AdminOutingState = "hidden" | "cancelled" | "past" | "full" | "open";

export const ADMIN_OUTING_STATE_LABEL: Record<AdminOutingState, string> = {
  hidden: "Masquée",
  cancelled: "Annulée",
  past: "Passée",
  full: "Complète",
  open: "Ouverte",
};

/** L'état lu par un admin : le masquage prime, puis l'annulation, puis la date. */
export function adminOutingState(
  row: Pick<AdminOutingRow, "hidden_at" | "status" | "starts_at" | "capacity" | "reserved" | "taken">,
  now: Date = new Date(),
): AdminOutingState {
  if (row.hidden_at) return "hidden";
  if (row.status === "cancelled") return "cancelled";
  if (new Date(row.starts_at).getTime() <= now.getTime()) return "past";
  if (row.reserved + row.taken >= row.capacity) return "full";
  return "open";
}

/** « 3 sur 4 » : places prises (déjà là et inscrits) sur la capacité. */
export function adminPlacesLabel(row: Pick<AdminOutingRow, "capacity" | "reserved" | "taken">): string {
  return `${row.reserved + row.taken} sur ${row.capacity}`;
}

/** « 2 site, 1 lien partagé » : l'origine des inscrits, dans l'ordre du menu. */
export function adminSourcesLabel(sources: AdminOutingRow["sources"]): string {
  const parts = ADMIN_OUTING_SOURCES
    .map((s) => ({ n: Number(sources?.[s.value] ?? 0), label: s.label.toLowerCase() }))
    .filter((s) => s.n > 0)
    .map((s) => `${s.n} ${s.label}`);
  return parts.length ? parts.join(", ") : "Aucun inscrit";
}

/** Part des sorties qui ont au moins un inscrit, en pourcentage entier. */
export function adminFillRate(counters: Pick<AdminOutingCounters, "published_total" | "with_attendee">): number | null {
  if (!counters.published_total) return null;
  return Math.round((counters.with_attendee / counters.published_total) * 100);
}

/** Dernière visite de l'organisateur, en jours pleins. */
export function daysSince(iso: string | null, now: Date = new Date()): number | null {
  if (!iso) return null;
  const ms = now.getTime() - new Date(iso).getTime();
  if (Number.isNaN(ms)) return null;
  return Math.max(0, Math.floor(ms / 86_400_000));
}

export function lastSeenLabel(iso: string | null, now: Date = new Date()): string {
  const d = daysSince(iso, now);
  if (d === null) return "Visite inconnue";
  if (d === 0) return "Vu aujourd'hui";
  if (d === 1) return "Vu hier";
  return `Vu il y a ${d} jours`;
}

/** Un organisateur absent depuis 30 jours laisse une sortie à venir sans réponse. */
export function organizerAway(row: Pick<AdminOutingRow, "organizer_last_seen_at" | "starts_at" | "status" | "hidden_at">, now: Date = new Date()): boolean {
  if (row.status !== "open" || row.hidden_at) return false;
  if (new Date(row.starts_at).getTime() <= now.getTime()) return false;
  const d = daysSince(row.organizer_last_seen_at, now);
  return d === null || d >= 30;
}

export type AdminOutingFilter = "all" | "upcoming" | "attention";

/** « À regarder » : masquée, signalée, ou organisateur absent d'une sortie à venir. */
export function filterAdminOutings(rows: AdminOutingRow[], filter: AdminOutingFilter, now: Date = new Date()): AdminOutingRow[] {
  if (filter === "upcoming") {
    return rows.filter((r) => ["open", "full"].includes(adminOutingState(r, now)));
  }
  if (filter === "attention") {
    return rows.filter((r) => Boolean(r.hidden_at) || r.reports_open > 0 || organizerAway(r, now));
  }
  return rows;
}

function toNumber(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

export function normalizeOverview(raw: unknown): AdminOutingsOverview {
  const data = (raw ?? {}) as Record<string, unknown>;
  const c = (data.counters ?? {}) as Record<string, unknown>;
  const rows = Array.isArray(data.outings) ? (data.outings as Record<string, unknown>[]) : [];
  return {
    generated_at: typeof data.generated_at === "string" ? data.generated_at : new Date().toISOString(),
    counters: {
      published_total: toNumber(c.published_total),
      published_30d: toNumber(c.published_30d),
      upcoming_open: toNumber(c.upcoming_open),
      with_attendee: toNumber(c.with_attendee),
      organizers: toNumber(c.organizers),
      cancelled: toNumber(c.cancelled),
      hidden: toNumber(c.hidden),
      joins_total: toNumber(c.joins_total),
      joins_by_source: (c.joins_by_source ?? {}) as AdminOutingCounters["joins_by_source"],
      left_total: toNumber(c.left_total),
      alerts_sent: toNumber(c.alerts_sent),
      alerts_sent_7d: toNumber(c.alerts_sent_7d),
      alerts_stopped: toNumber(c.alerts_stopped),
      alerts_radius: (c.alerts_radius ?? {}) as AdminOutingCounters["alerts_radius"],
      reports_open: toNumber(c.reports_open),
      flags: (c.flags ?? {}) as AdminOutingCounters["flags"],
    },
    outings: rows.map((r) => ({
      ...(r as unknown as AdminOutingRow),
      capacity: toNumber(r.capacity),
      reserved: toNumber(r.reserved),
      taken: toNumber(r.taken),
      alerts_sent: toNumber(r.alerts_sent),
      reports_open: toNumber(r.reports_open),
      sources: (r.sources ?? {}) as AdminOutingRow["sources"],
    })),
  };
}

export async function fetchAdminOutingsOverview(): Promise<AdminOutingsOverview> {
  const { data, error } = await db.rpc("admin_outings_overview", { p_limit: 200 });
  if (error) throw error;
  return normalizeOverview(data);
}

export async function setAdminOutingHidden(outingId: string, hidden: boolean): Promise<{ ok: boolean }> {
  const { data, error } = await db.rpc("admin_outing_set_hidden", { p_outing: outingId, p_hidden: hidden });
  if (error) return { ok: false };
  return { ok: (data as { ok?: boolean } | null)?.ok === true };
}
