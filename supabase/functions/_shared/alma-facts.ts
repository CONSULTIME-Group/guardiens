/**
 * Lot J2-A : faits vérifiés sur la personne, et vérité des phrases d'humeur.
 *
 * Un membre `both` a toujours ses deux côtés chargés, quel que soit le rôle
 * affiché. Toute phrase d'Alma qui affirme un fait sur la personne s'appuie
 * sur ce bloc. Pur : aucune requête ici, voir `loadVerifiedFacts`.
 */

export interface RawSit {
  id: string;
  title: string | null;
  status: string;
  city: string | null;
  start_date: string | null;
  end_date: string | null;
}

export interface RawSentApplication {
  sit_id: string;
  status: string;
  created_at: string;
  sit: RawSit | null;
}

export interface RawReceivedApplication {
  sit_id: string;
  status: string;
  viewed_at: string | null;
  created_at: string;
}

export interface RawMission {
  id: string;
  title: string | null;
  status: string;
  mission_type: string;
  category: string | null;
}

export interface VerifiedFactsInput {
  role: "owner" | "sitter" | "both" | null;
  ownSits: RawSit[];
  received: RawReceivedApplication[];
  sent: RawSentApplication[];
  missions: RawMission[];
  today: string; // AAAA-MM-JJ
}

export interface ConfirmedSit {
  side: "proprietaire" | "gardien";
  sit_id: string;
  titre: string | null;
  ville: string | null;
  debut: string;
  fin: string | null;
}

export interface VerifiedFacts {
  role_compte: string | null;
  gardes_confirmees: ConfirmedSit[];
  candidatures_envoyees: Record<string, number>;
  candidatures_envoyees_detail: Array<{ sit_id: string; statut: string; titre: string | null; ville: string | null; debut: string | null; envoyee_le: string }>;
  candidatures_recues: Record<string, number>;
  candidatures_recues_non_ouvertes: number;
  annonces_publiees: Array<{ sit_id: string; titre: string | null; ville: string | null; debut: string | null }>;
  brouillons: Array<{ sit_id: string; titre: string | null; debut?: string | null }>;
  missions_publiees: Array<{ id: string; titre: string | null; type: string; statut: string }>;
  /** Plus ancienne candidature envoyée encore sans réponse, en jours. */
  candidature_sans_reponse_jours: number | null;
}

const CONFIRMED_SIT = new Set(["confirmed", "in_progress"]);
const WAITING = new Set(["pending", "viewed"]);

function countBy<T>(rows: T[], key: (r: T) => string): Record<string, number> {
  const out: Record<string, number> = {};
  for (const r of rows) out[key(r)] = (out[key(r)] ?? 0) + 1;
  return out;
}

function daysBetween(fromIso: string, today: string): number {
  return Math.floor((Date.parse(today) - Date.parse(fromIso.slice(0, 10))) / 86_400_000);
}

export function buildVerifiedFacts(input: VerifiedFactsInput): VerifiedFacts {
  const { today } = input;
  const confirmed: ConfirmedSit[] = [];
  for (const s of input.ownSits) {
    if (CONFIRMED_SIT.has(s.status) && s.start_date && (s.end_date ?? s.start_date) >= today) {
      confirmed.push({ side: "proprietaire", sit_id: s.id, titre: s.title, ville: s.city, debut: s.start_date, fin: s.end_date });
    }
  }
  for (const a of input.sent) {
    const s = a.sit;
    if (a.status === "accepted" && s && CONFIRMED_SIT.has(s.status) && s.start_date && (s.end_date ?? s.start_date) >= today) {
      confirmed.push({ side: "gardien", sit_id: s.id, titre: s.title, ville: s.city, debut: s.start_date, fin: s.end_date });
    }
  }
  confirmed.sort((a, b) => a.debut.localeCompare(b.debut));

  const waiting = input.sent.filter((a) => WAITING.has(a.status));
  const oldestWaiting = waiting.length
    ? Math.max(...waiting.map((a) => daysBetween(a.created_at, today)))
    : null;

  return {
    role_compte: input.role,
    gardes_confirmees: confirmed,
    candidatures_envoyees: countBy(input.sent, (a) => a.status),
    candidatures_envoyees_detail: input.sent.slice(0, 5).map((a) => ({
      sit_id: a.sit_id,
      statut: a.status,
      titre: a.sit?.title ?? null,
      ville: a.sit?.city ?? null,
      debut: a.sit?.start_date ?? null,
      envoyee_le: a.created_at.slice(0, 10),
    })),
    candidatures_recues: countBy(input.received, (a) => a.status),
    candidatures_recues_non_ouvertes: input.received.filter((a) => a.viewed_at === null && a.status === "pending").length,
    annonces_publiees: input.ownSits
      .filter((s) => s.status === "published")
      .map((s) => ({ sit_id: s.id, titre: s.title, ville: s.city, debut: s.start_date })),
    brouillons: input.ownSits.filter((s) => s.status === "draft").map((s) => ({ sit_id: s.id, titre: s.title, debut: s.start_date })),
    missions_publiees: input.missions
      .filter((m) => m.status === "open" || m.status === "in_progress")
      .map((m) => ({ id: m.id, titre: m.title, type: m.mission_type, statut: m.status })),
    candidature_sans_reponse_jours: oldestWaiting,
  };
}

// ---------------------------------------------------------------------------
// Humeur : une phrase qui affirme une garde ou un départ exige une garde
// confirmée avec date en base.
// ---------------------------------------------------------------------------

export type MoodClaim = "sit_soon" | "departure" | "application_waiting" | "owner_reply" | null;

/** Ce que la phrase d'humeur affirme sur la personne, ou null si c'est un décor. */
export function moodLineClaim(line: string | null | undefined): MoodClaim {
  const l = (line || "").toLowerCase();
  if (/votre d[ée]part/.test(l)) return "departure";
  if (/votre garde|garde (commence|d[ée]marre)/.test(l)) return "sit_soon";
  if (/candidature attend votre r[ée]ponse/.test(l)) return "owner_reply";
  if (/r[ée]ponse est attendue de votre c[ôo]t[ée]|mouvement sur votre dossier/.test(l)) return "application_waiting";
  return null;
}

export interface MoodTruthFacts {
  /** Garde confirmée côté propriétaire, début dans les 7 jours. */
  ownerConfirmedSoon: boolean;
  /** Garde confirmée côté gardien (candidature acceptée), début dans les 7 jours. */
  sitterConfirmedSoon: boolean;
  /** Candidature reçue en attente de réponse du propriétaire. */
  receivedPending: boolean;
}

/** Une phrase d'humeur n'affirme jamais ce que la base ne confirme pas. */
export function isMoodLineTruthful(line: string | null | undefined, f: MoodTruthFacts): boolean {
  switch (moodLineClaim(line)) {
    case null:
      return true;
    case "sit_soon":
      return f.ownerConfirmedSoon || f.sitterConfirmedSoon;
    case "departure":
      // Seul le propriétaire part ; un gardien n'a pas de « départ ».
      return f.ownerConfirmedSoon;
    case "owner_reply":
    case "application_waiting":
      return f.receivedPending;
  }
}

/** Faits d'humeur déduits des faits vérifiés. */
export function moodTruthFromFacts(facts: VerifiedFacts, today: string): MoodTruthFacts {
  const soon = new Date(Date.parse(today) + 7 * 86_400_000).toISOString().slice(0, 10);
  const inWindow = (c: ConfirmedSit) => c.debut >= today && c.debut <= soon;
  return {
    ownerConfirmedSoon: facts.gardes_confirmees.some((c) => c.side === "proprietaire" && inWindow(c)),
    sitterConfirmedSoon: facts.gardes_confirmees.some((c) => c.side === "gardien" && inWindow(c)),
    receivedPending: (facts.candidatures_recues.pending ?? 0) > 0,
  };
}

/** Chargement serveur, les deux côtés toujours. */
// deno-lint-ignore no-explicit-any
export async function loadVerifiedFacts(client: any, userId: string, role: VerifiedFactsInput["role"], today: string): Promise<VerifiedFacts> {
  const [ownRes, sentRes, missRes] = await Promise.all([
    client.from("sits").select("id, title, status, city, start_date, end_date").eq("user_id", userId).order("created_at", { ascending: false }).limit(20),
    client.from("applications").select("sit_id, status, created_at, sits(id, title, status, city, start_date, end_date)").eq("sitter_id", userId).order("created_at", { ascending: false }).limit(20),
    client.from("small_missions").select("id, title, status, mission_type, category").eq("user_id", userId).order("created_at", { ascending: false }).limit(10),
  ]);
  const ownSits = (ownRes?.data ?? []) as RawSit[];
  let received: RawReceivedApplication[] = [];
  if (ownSits.length > 0) {
    const r = await client.from("applications").select("sit_id, status, viewed_at, created_at").in("sit_id", ownSits.map((s) => s.id)).limit(100);
    received = (r?.data ?? []) as RawReceivedApplication[];
  }
  // deno-lint-ignore no-explicit-any
  const sent = ((sentRes?.data ?? []) as any[]).map((a) => ({ sit_id: a.sit_id, status: a.status, created_at: a.created_at, sit: a.sits ?? null }));
  return buildVerifiedFacts({ role, ownSits, received, sent, missions: (missRes?.data ?? []) as RawMission[], today });
}
