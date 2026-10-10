// Historique lisible d'un dossier admin (annonce ou entraide), construit
// uniquement à partir d'événements réellement enregistrés. Rien n'est inventé :
// sans événement, le dossier le dit.
import { SIT_STATUS_SHORT_LABELS, isSitStatus } from "@/lib/sitStatus";
import { unpublishReasonAdminLabel } from "@/lib/unpublishReason";
import { ARCHIVED_REASON_LABEL } from "@/lib/admin/listingSituation";

export type EventSource = "field" | "status_history" | "admin_log";

export interface DossierEvent {
  at: string;
  kind: string;
  label: string;
  detail?: string | null;
  actor?: string | null;
  source: EventSource;
}

export const APPLICATION_STATUS_LABELS: Record<string, string> = {
  pending: "En attente", viewed: "Vue", discussing: "En discussion", accepted: "Acceptée",
  rejected: "Refusée", cancelled: "Annulée", withdrawn: "Retirée",
};
export const RESPONSE_STATUS_LABELS: Record<string, string> = {
  pending: "En attente", accepted: "Acceptée", declined: "Déclinée", withdrawn: "Retirée",
};
export const statusCountLabel = (map: Record<string, string>, s: string) => map[s] ?? `Statut ${s}`;

const ADMIN_ACTION_LABELS: Record<string, { kind: string; label: string }> = {
  hide_listing: { kind: "hide", label: "Masquage par l'équipe" },
  restore_listing: { kind: "restore", label: "Remise en ligne par l'équipe" },
  cancel_garde: { kind: "cancel", label: "Annulation par l'équipe" },
  force_complete_garde: { kind: "complete", label: "Fin forcée par l'équipe" },
  mark_garde_in_progress: { kind: "in_progress", label: "Marquée en cours par l'équipe" },
  mark_garde_completed: { kind: "complete", label: "Marquée terminée par l'équipe" },
  small_mission_hide: { kind: "hide", label: "Masquage par l'équipe" },
  small_mission_restore: { kind: "restore", label: "Restauration par l'équipe" },
  release_projet: { kind: "release", label: "Diffusion validée par l'équipe" },
};

const sitLabel = (s: string | null | undefined) =>
  s && isSitStatus(s) ? SIT_STATUS_SHORT_LABELS[s] : s ? `Statut ${s}` : "Aucun";

const DEDUPE_WINDOW_MS = 5 * 60 * 1000;
const SOURCE_RANK: Record<EventSource, number> = { admin_log: 0, status_history: 1, field: 2 };

/** Tri chronologique et suppression des doublons (même nature à moins de 5 min). */
export function buildTimeline(events: DossierEvent[]): DossierEvent[] {
  const valid = events.filter((e) => e.at && !isNaN(new Date(e.at).getTime()));
  const sorted = [...valid].sort((a, b) =>
    new Date(a.at).getTime() - new Date(b.at).getTime() || SOURCE_RANK[a.source] - SOURCE_RANK[b.source],
  );
  const out: DossierEvent[] = [];
  for (const e of sorted) {
    const t = new Date(e.at).getTime();
    // Même événement vu par deux sources différentes seulement : deux actions
    // réelles d'une même source, ou d'acteurs/motifs différents, sont gardées.
    const dup = out.findIndex((o) => o.kind === e.kind && o.source !== e.source
      && Math.abs(new Date(o.at).getTime() - t) <= DEDUPE_WINDOW_MS
      && !(o.actor && e.actor && o.actor !== e.actor)
      && !(o.detail && e.detail && o.detail !== e.detail));
    if (dup === -1) { out.push(e); continue; }
    const kept = out[dup];
    if (SOURCE_RANK[e.source] < SOURCE_RANK[kept.source]) {
      out[dup] = { ...e, detail: e.detail ?? kept.detail, actor: e.actor ?? kept.actor };
    } else if (!kept.detail && e.detail) {
      out[dup] = { ...kept, detail: e.detail };
    }
  }
  return out.sort((a, b) =>
    new Date(a.at).getTime() - new Date(b.at).getTime() || SOURCE_RANK[a.source] - SOURCE_RANK[b.source]);
}

export interface SitFields {
  user_id?: string | null;
  created_at?: string | null; published_at?: string | null; unpublished_at?: string | null;
  last_unpublished_reason?: string | null; hidden_at?: string | null; cancelled_at?: string | null;
  cancelled_by?: string | null; cancellation_reason?: string | null;
}

export function sitFieldEvents(s: SitFields): DossierEvent[] {
  const ev: DossierEvent[] = [];
  if (s.created_at) ev.push({ at: s.created_at, kind: "create", label: "Création", source: "field" });
  if (s.published_at) ev.push({ at: s.published_at, kind: "publish", label: "Dernière mise en ligne", source: "field" });
  if (s.unpublished_at) ev.push({
    at: s.unpublished_at, kind: "unpublish", label: "Retrait par le propriétaire", source: "field", actor: "Propriétaire",
    detail: s.last_unpublished_reason ? unpublishReasonAdminLabel(s.last_unpublished_reason) : "Motif non renseigné",
  });
  if (s.hidden_at) ev.push({ at: s.hidden_at, kind: "hide", label: "Masquage par l'équipe", source: "field", actor: "Équipe" });
  if (s.cancelled_at) ev.push({
    at: s.cancelled_at, kind: "cancel", label: s.cancellation_reason === "archived" ? ARCHIVED_REASON_LABEL : "Annulation", source: "field",
    actor: s.cancelled_by ? (s.cancelled_by === s.user_id ? "Propriétaire" : "Compte autre que le propriétaire") : "Auteur non enregistré",
    detail: s.cancellation_reason === "archived" ? ARCHIVED_REASON_LABEL : s.cancellation_reason?.trim() || "Motif non renseigné",
  });
  return ev;
}

export function statusHistoryEvents(
  rows: Array<{ old_status: string | null; new_status: string | null; changed_at: string; changed_by: string | null; reason: string | null }>,
  ownerId?: string | null,
): DossierEvent[] {
  return rows.map((r) => ({
    at: r.changed_at,
    kind: r.new_status === "published" ? "publish" : r.new_status === "cancelled" ? "cancel" : r.new_status === "completed" ? "complete" : r.new_status === "in_progress" ? "in_progress" : `status:${r.new_status}`,
    label: `${sitLabel(r.old_status)} vers ${sitLabel(r.new_status)}`,
    detail: r.reason === "archived" ? ARCHIVED_REASON_LABEL : r.reason ? (unpublishReasonAdminLabel(r.reason) || r.reason) : null,
    actor: r.changed_by ? (ownerId && r.changed_by === ownerId ? "Propriétaire" : "Compte autre que le propriétaire") : "Auteur non enregistré",
    source: "status_history" as const,
  }));
}

export function adminLogEvents(rows: Array<{ action: string; created_at: string; note?: string | null }>): DossierEvent[] {
  return rows.map((r) => {
    const m = ADMIN_ACTION_LABELS[r.action] ?? { kind: `admin:${r.action}`, label: `Action de l'équipe (${r.action})` };
    return { at: r.created_at, kind: m.kind, label: m.label, detail: r.note?.trim() || null, actor: "Équipe", source: "admin_log" as const };
  });
}

export interface MissionFields {
  created_at?: string | null; hidden_at?: string | null; closed_at?: string | null; close_reason?: string | null;
}

const CLOSE_REASON_LABEL: Record<string, string> = {
  manual_admin: "Clôture par l'équipe",
  auto_completed_after_date: "Clôture automatique après la date",
  expired: "Expiration automatique",
  migrated_to_profile: "Transfert vers le profil",
  moderation: "Retrait après signalement",
  meetup_confirmed: "Rencontre confirmée par le membre",
};

export function missionFieldEvents(m: MissionFields): DossierEvent[] {
  const ev: DossierEvent[] = [];
  if (m.created_at) ev.push({ at: m.created_at, kind: "create", label: "Publication", source: "field" });
  if (m.hidden_at) ev.push({ at: m.hidden_at, kind: "hide", label: "Masquage par l'équipe", source: "field", actor: "Équipe" });
  if (m.closed_at) ev.push({
    at: m.closed_at, kind: "close", source: "field",
    label: m.close_reason ? CLOSE_REASON_LABEL[m.close_reason] ?? `Clôture (${m.close_reason})` : "Clôture, motif non renseigné",
    actor: m.close_reason === "manual_admin" || m.close_reason === "moderation" ? "Équipe"
      : m.close_reason === "auto_completed_after_date" || m.close_reason === "expired" ? "Automatique" : null,
  });
  return ev;
}

/** Compte par statut, dans l'ordre d'apparition des libellés. */
export function countByStatus(rows: Array<{ status: string | null }>): Record<string, number> {
  const out: Record<string, number> = {};
  for (const r of rows) { const k = r.status ?? "inconnu"; out[k] = (out[k] ?? 0) + 1; }
  return out;
}
