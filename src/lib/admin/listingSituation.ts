// Audit admin du 10/10/2026 : lecture humaine de l'état d'une annonce de garde
// et d'une demande d'entraide. Chaque situation sépare la visibilité,
// l'avancement et le résultat déclaré. Rien n'est déduit d'une absence :
// un acteur ou un motif inconnu est dit inconnu.

import { UNPUBLISH_REASON_ADMIN_LABELS, unpublishReasonAdminLabel } from "@/lib/unpublishReason";

export type SituationTone = "default" | "secondary" | "outline" | "destructive";

export interface Situation {
  /** Situation en une phrase courte. */
  label: string;
  /** Précision factuelle, ou null. */
  detail: string | null;
  /** Fiche consultable publiquement aujourd'hui (liste ou lien direct). */
  visible: boolean;
  /** Libellé de visibilité, séparé de l'avancement. */
  visibility?: string;
  /** Résultat déclaré par un membre, ou null si rien n'est déclaré. */
  declaredOutcome: string | null;
  tone: SituationTone;
  bucket: SitBucket | MissionBucket;
}

// ---------------------------------------------------------------- Annonces

export type SitBucket =
  | "preparing" | "withdrawn" | "seeking" | "confirmed" | "in_progress"
  | "completed" | "expired" | "archived" | "hidden" | "cancelled" | "unknown";

export interface SitLike {
  status?: string | null;
  user_id?: string | null;
  unpublished_at?: string | null;
  last_unpublished_reason?: string | null;
  hidden_by?: string | null;
  hidden_at?: string | null;
  cancelled_by?: string | null;
  cancelled_at?: string | null;
  cancellation_reason?: string | null;
}

/** Résultat déclaré par le propriétaire au retrait (codes connus seulement). */
const WITHDRAW_OUTCOME: Record<string, string> = {
  found_offline: "Solution trouvée ailleurs",
  found_onplatform: "Gardien trouvé via Guardiens",
  plans_changed: "Dates ou plans changés",
  no_relevant_apps: "Aucune candidature adaptée",
};

export function sitBucket(s: SitLike): SitBucket {
  switch (s.status) {
    case "draft": return s.unpublished_at ? "withdrawn" : "preparing";
    case "published": return "seeking";
    case "confirmed": return "confirmed";
    case "in_progress": return "in_progress";
    case "completed": return "completed";
    case "expired": return "expired";
    case "archived": return "archived";
    case "cancelled": return s.hidden_by ? "hidden" : "cancelled";
    default: return "unknown";
  }
}

export const ARCHIVED_REASON_LABEL = "Retrait / archivage enregistré";
/** Confirmées, en cours, terminées, archivées : HTTP 200, noindex (PublicSitDetail). */
const CONSULTABLE = { visible: true, visibility: "Fiche consultable publiquement" };

export function sitSituation(s: SitLike): Situation {
  const bucket = sitBucket(s);
  const base = { visible: false, declaredOutcome: null as string | null, bucket };
  switch (bucket) {
    case "preparing":
      return { ...base, label: "En préparation", detail: "Brouillon, aucun retrait enregistré, non visible", tone: "outline" };
    case "withdrawn": {
      const r = s.last_unpublished_reason;
      const outcome = r ? WITHDRAW_OUTCOME[r] ?? (r in UNPUBLISH_REASON_ADMIN_LABELS ? null : unpublishReasonAdminLabel(r)) : null;
      return {
        ...base,
        label: "Retirée par le propriétaire",
        detail: outcome ?? "Motif non renseigné",
        declaredOutcome: outcome,
        tone: "secondary",
      };
    }
    case "seeking":
      return { ...base, visible: true, label: "Cherche un gardien", detail: "En ligne", tone: "default" };
    case "confirmed":
      return { ...base, ...CONSULTABLE, label: "Gardien confirmé", detail: "Garde à venir", tone: "secondary" };
    case "in_progress":
      return { ...base, ...CONSULTABLE, label: "Garde en cours", detail: null, tone: "default" };
    case "completed":
      return { ...base, ...CONSULTABLE, label: "Garde terminée", detail: null, tone: "secondary" };
    case "expired":
      return { ...base, label: "Expirée", detail: "Dates passées, annonce close automatiquement", tone: "outline" };
    case "archived":
      return { ...base, ...CONSULTABLE, label: "Archivée", detail: "Retirée des listes", tone: "secondary" };
    case "hidden":
      return { ...base, label: "Masquée par l'équipe", detail: s.hidden_at ? null : "Date de masquage non renseignée", tone: "destructive" };
    case "cancelled": {
      const reason = s.cancellation_reason?.trim() || null;
      let who: string | null = null;
      if (s.cancelled_by && s.user_id && s.cancelled_by === s.user_id) who = "par le propriétaire";
      else if (s.cancelled_by) who = "par un compte autre que le propriétaire";
      if (!who && !reason) return { ...base, label: "Annulée, motif non renseigné", detail: null, tone: "outline" };
      const actor = who ? `Action ${who}` : "Acteur non enregistré";
      if (reason === "archived") {
        // Code enregistré tel quel : on n'en déduit ni annulation réelle ni rôle.
        return { ...base, label: ARCHIVED_REASON_LABEL, detail: actor, tone: "outline" };
      }
      return { ...base, label: who ? `Annulée ${who}` : "Annulée", detail: reason ? `Motif : ${reason}, ${who ? actor.toLowerCase() : "acteur non enregistré"}` : "Motif non renseigné", tone: "outline" };
    }
    default:
      return { ...base, label: `Statut inconnu : ${s.status ?? "non renseigné"}`, detail: null, tone: "destructive" };
  }
}

/** Ordre et libellés de la répartition. Principaux d'abord, secondaires repliés. */
export const SIT_BUCKETS_PRIMARY: { key: SitBucket; label: string }[] = [
  { key: "seeking", label: "Cherchent un gardien" },
  { key: "preparing", label: "En préparation" },
  { key: "withdrawn", label: "Retirées par le propriétaire" },
  { key: "confirmed", label: "Gardien confirmé" },
  { key: "in_progress", label: "Gardes en cours" },
];
export const SIT_BUCKETS_SECONDARY: { key: SitBucket; label: string }[] = [
  { key: "completed", label: "Terminées" },
  { key: "expired", label: "Expirées" },
  { key: "archived", label: "Archivées" },
  { key: "hidden", label: "Masquées par l'équipe" },
  { key: "cancelled", label: "Annulées" },
  { key: "unknown", label: "Statut inconnu" },
];

export function sitDistribution(rows: SitLike[]): { total: number; counts: Record<SitBucket, number> } {
  const counts = Object.fromEntries(
    [...SIT_BUCKETS_PRIMARY, ...SIT_BUCKETS_SECONDARY].map((b) => [b.key, 0]),
  ) as Record<SitBucket, number>;
  for (const r of rows) counts[sitBucket(r)] += 1;
  return { total: rows.length, counts };
}

/** Ville affichée : celle de l'annonce, sinon celle du profil, signalée comme telle. */
export function listingCity(l: { city?: string | null; owner?: { city?: string | null } | null }): { city: string | null; fromOwner: boolean } {
  const own = l.city?.trim();
  if (own) return { city: own, fromOwner: false };
  const fallback = l.owner?.city?.trim();
  return fallback ? { city: fallback, fromOwner: true } : { city: null, fromOwner: false };
}

/** Filtres de la page Annonces. Les anciens identifiants restent valides. */
export const LISTING_FILTERS = [
  "published", "to_staff", "preparing", "withdrawn", "draft", "closed", "hidden", "cancelled_only", "cancelled", "no_draft", "all",
] as const;
export type ListingFilter = typeof LISTING_FILTERS[number];

export const LISTING_FILTER_LABELS: Record<ListingFilter, string> = {
  published: "Cherchent un gardien (par défaut)",
  to_staff: "Sans candidature",
  preparing: "En préparation",
  withdrawn: "Retirées par le propriétaire",
  draft: "En préparation et retirées",
  closed: "Confirmées, terminées, expirées, archivées",
  hidden: "Masquées par l'équipe",
  cancelled_only: "Annulées",
  cancelled: "Masquées et annulées",
  no_draft: "Tout sauf préparation et retirées",
  all: "Tous les états",
};

export interface ListingQueryScope {
  status?: string;
  statusIn?: string[];
  statusNeq?: string;
  unpublished?: "null" | "not_null";
  hiddenBy?: "null" | "not_null";
}

/** Périmètre serveur exact de chaque filtre. */
export function listingFilterScope(f: ListingFilter): ListingQueryScope {
  switch (f) {
    case "published":
    case "to_staff": return { status: "published" };
    case "preparing": return { status: "draft", unpublished: "null" };
    case "withdrawn": return { status: "draft", unpublished: "not_null" };
    case "draft": return { status: "draft" };
    case "closed": return { statusIn: ["confirmed", "in_progress", "completed", "expired", "archived"] };
    case "hidden": return { status: "cancelled", hiddenBy: "not_null" };
    case "cancelled_only": return { status: "cancelled", hiddenBy: "null" };
    case "cancelled": return { status: "cancelled" };
    case "no_draft": return { statusNeq: "draft" };
    case "all": return {};
  }
}

// --------------------------------------------------------------- Entraide

export type MissionBucket =
  | "open" | "open_past_date" | "chosen" | "closed_admin" | "closed_auto" | "closed_member"
  | "closed_unknown" | "migrated" | "hidden" | "expired" | "moderated" | "cancelled" | "unknown";

export interface MissionLike {
  status?: string | null;
  mission_type?: string | null;
  category?: string | null;
  close_reason?: string | null;
  closed_at?: string | null;
  hidden_by?: string | null;
  hidden_at?: string | null;
  date_needed?: string | null;
  end_date?: string | null;
}

/** Fin de journée de la date, en heure locale. */
const endOfDay = (iso: string) => { const d = new Date(iso); d.setHours(23, 59, 59, 999); return d.getTime(); };

/** Date d'échéance dépassée. Une offre sans échéance n'est jamais périmée. */
export function missionDatePassed(m: MissionLike, now = new Date()): boolean {
  const t = now.getTime();
  if (m.end_date && endOfDay(m.end_date) < t) return true;
  if (m.mission_type !== "offre" && m.date_needed && endOfDay(m.date_needed) < t) return true;
  return false;
}

export function missionSituation(m: MissionLike, now = new Date()): Situation {
  const base = { visible: false, declaredOutcome: null as string | null };
  const isOffer = m.mission_type === "offre";
  switch (m.status) {
    case "open":
      if (missionDatePassed(m, now)) {
        return { ...base, visible: true, bucket: "open_past_date", label: "Date dépassée, toujours ouverte", detail: "Aucune clôture enregistrée", tone: "outline" };
      }
      return { ...base, visible: true, bucket: "open", label: isOffer ? "Aide proposée" : "Cherche de l'aide", detail: "En ligne", tone: "default" };
    case "in_progress":
      return { ...base, visible: true, bucket: "chosen", label: "Personne retenue", detail: "En préparation avec un membre", tone: "secondary" };
    case "completed":
      if (m.close_reason === "manual_admin") return { ...base, bucket: "closed_admin", label: "Clôturée par l'équipe", detail: "Résultat non renseigné", tone: "outline" };
      if (m.close_reason === "auto_completed_after_date") return { ...base, bucket: "closed_auto", label: "Clôturée automatiquement après la date", detail: "Résultat non renseigné", tone: "outline" };
      if (m.close_reason === "migrated_to_profile") return { ...base, bucket: "migrated", label: "Transférée vers le profil du membre", detail: null, tone: "outline" };
      if (m.close_reason === "meetup_confirmed") {
        return { ...base, bucket: "closed_member", label: "Échange réalisé", detail: "Rencontre confirmée par le membre", declaredOutcome: "Rencontre confirmée par le membre", tone: "secondary" };
      }
      return { ...base, bucket: "closed_unknown", label: "Clôturée, résultat non renseigné", detail: null, tone: "outline" };
    case "cancelled":
      if (m.hidden_by) return { ...base, bucket: "hidden", label: "Masquée par l'équipe", detail: null, tone: "destructive" };
      if (m.close_reason === "expired") return { ...base, bucket: "expired", label: "Expirée", detail: "Close automatiquement, sans suite enregistrée", tone: "outline" };
      if (m.close_reason === "moderation") return { ...base, bucket: "moderated", label: "Retirée après signalement", detail: null, tone: "destructive" };
      return { ...base, bucket: "cancelled", label: "Annulée, motif non renseigné", detail: null, tone: "outline" };
    default:
      return { ...base, bucket: "unknown", label: `Statut inconnu : ${m.status ?? "non renseigné"}`, detail: null, tone: "destructive" };
  }
}
