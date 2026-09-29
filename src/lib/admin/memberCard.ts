/**
 * Lot A12 : fiche membre admin. Types et normalisation du JSON renvoyé par
 * la RPC admin_get_member_card (lecture seule, refus hors admin).
 * Une section absente devient une liste vide, jamais une erreur.
 */
export type CountByStatus = Record<string, number>;

export interface MemberCard {
  identity: {
    id: string;
    first_name: string | null;
    last_name: string | null;
    avatar_url: string | null;
    city: string | null;
    postal_code: string | null;
    role: string | null;
    roles: string[];
    account_status: string;
    created_at: string | null;
    last_seen_at: string | null;
    identity_verified: boolean;
    identity_verification_status: string;
    identity_verified_at: string | null;
    identity_last_log_at: string | null;
    has_identity_documents: boolean;
    email: string | null;
    email_confirmed: boolean | null;
    is_manual_super: boolean;
    is_founder: boolean;
    profile_completion: number;
  } | null;
  owner: {
    sits_by_status: CountByStatus;
    recent_sits: Array<{ id: string; title: string | null; start_date: string | null; end_date: string | null; status: string; applications_count: number }>;
  };
  sitter: {
    applications_by_status: CountByStatus;
    completed_sits: number;
    is_available: boolean | null;
    recent_applications: Array<{ id: string; sit_id: string; sit_title: string | null; status: string; created_at: string }>;
  };
  mutual_aid: { missions_by_status: CountByStatus; responses_by_status: CountByStatus };
  reviews: { received_count: number; received_avg: number | null; given_count: number; hidden_count: number };
  reports: { targeting_by_status: CountByStatus; made_count: number };
  messaging: { conversations_count: number; last_activity_at: string | null; last_conversation_id: string | null };
  team_messages: Array<{ id: string; sent_at: string; status: string | null; excerpt: string; error_message: string | null; conversation_id: string | null }>;
  moderation: { admin_notes: string | null; suspension_reason: string | null };
  history: Array<{ id: string; created_at: string; action: string; note: string | null; admin_name: string | null }>;
}

const obj = (v: unknown): Record<string, any> => (v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, any>) : {});
const arr = <T,>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : []);
const num = (v: unknown): number => (typeof v === "number" ? v : Number(v) || 0);

export function normalizeMemberCard(raw: unknown): MemberCard {
  const r = obj(raw);
  const id = r.identity ? obj(r.identity) : null;
  const o = obj(r.owner), s = obj(r.sitter), m = obj(r.mutual_aid), rv = obj(r.reviews);
  const rp = obj(r.reports), ms = obj(r.messaging), md = obj(r.moderation);
  return {
    identity: id
      ? {
          ...(id as any),
          roles: arr<string>(id.roles),
          account_status: id.account_status || "active",
          identity_verified: !!id.identity_verified,
          identity_verification_status: id.identity_verification_status || "not_submitted",
          has_identity_documents: !!id.has_identity_documents,
          email_confirmed: typeof id.email_confirmed === "boolean" ? id.email_confirmed : null,
          is_manual_super: !!id.is_manual_super,
          is_founder: !!id.is_founder,
          profile_completion: num(id.profile_completion),
        }
      : null,
    owner: { sits_by_status: obj(o.sits_by_status), recent_sits: arr(o.recent_sits) },
    sitter: {
      applications_by_status: obj(s.applications_by_status),
      completed_sits: num(s.completed_sits),
      is_available: typeof s.is_available === "boolean" ? s.is_available : null,
      recent_applications: arr(s.recent_applications),
    },
    mutual_aid: { missions_by_status: obj(m.missions_by_status), responses_by_status: obj(m.responses_by_status) },
    reviews: {
      received_count: num(rv.received_count),
      received_avg: rv.received_avg == null ? null : Number(rv.received_avg),
      given_count: num(rv.given_count),
      hidden_count: num(rv.hidden_count),
    },
    reports: { targeting_by_status: obj(rp.targeting_by_status), made_count: num(rp.made_count) },
    messaging: {
      conversations_count: num(ms.conversations_count),
      last_activity_at: ms.last_activity_at ?? null,
      last_conversation_id: ms.last_conversation_id ?? null,
    },
    team_messages: arr(r.team_messages),
    moderation: { admin_notes: md.admin_notes ?? null, suspension_reason: md.suspension_reason ?? null },
    history: arr(r.history),
  };
}

export const sumCounts = (c: CountByStatus) => Object.values(c).reduce((a, b) => a + num(b), 0);

/** Paramètre d'adresse qui ouvre le panneau : /admin/users?membre=<id>. */
export const MEMBER_PARAM = "membre";
