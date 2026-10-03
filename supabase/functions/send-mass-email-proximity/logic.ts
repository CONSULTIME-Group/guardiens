/**
 * Logique pure et injectable de send-mass-email-proximity (incident du
 * 02/10/2026 : 95 envois pour 79 adresses sur une même annonce).
 *
 * Règle : une annonce + une adresse = une seule alerte de proximité, tous
 * rayons et campagnes confondus. L'identité est l'id de l'annonce, jamais sa
 * catégorie, son titre, son slug ou le rayon.
 *
 * Deux protections, dans cet ordre :
 *  1. historique (lecture paginée, toute erreur bloque l'envoi) : campagnes de
 *     proximité passées de l'annonce, vagues automatiques d'entraide ;
 *  2. réservation atomique par adresse (member_email_send_claims) juste avant
 *     l'envoi, contre double clic, requêtes simultanées et nouvelle tentative.
 */
import { finishMemberSendClaim, memberSendOutcome, type SendClaim } from "../_shared/member-email-send-claim.ts";
import { NOT_RECEIVED_STATUSES } from "../_shared/mass-email-dedupe.ts";

export const PROXIMITY_CLAIM_TEMPLATE = "mission-proximity-alert-v1";
/** RPC dédiée : n'acquiert qu'une clé neuve ou « retryable », jamais une reprise sur ancienneté. */
export const PROXIMITY_ACQUIRE_RPC = "acquire_proximity_send_claim";
export const PAGE = 1000;
export const IN_CHUNK = 50;

export const normalizeEmail = (e: unknown): string => String(e ?? "").trim().toLowerCase();

export type MissionKind = "besoin" | "offre" | "projet";

export interface MissionLinkInput {
  id: string;
  slug?: string | null;
  category?: string | null;
  mission_type?: string | null;
}

export function missionKind(m: MissionLinkInput): MissionKind {
  if (m.category === "projet") return "projet";
  return m.mission_type === "offre" ? "offre" : "besoin";
}

/** Adresse publique : /projets/<slug> (repli id) pour un projet, inchangée sinon. */
export function missionUrl(m: MissionLinkInput): string {
  if (missionKind(m) === "projet") {
    const slug = (m.slug ?? "").trim();
    return `https://guardiens.fr/projets/${encodeURIComponent(slug || m.id)}`;
  }
  return `https://guardiens.fr/petites-missions/${m.id}`;
}

export function ctaLabel(kind: MissionKind): string {
  if (kind === "projet") return "Voir le projet";
  return kind === "offre" ? "Voir sa proposition" : "Voir sa demande";
}

export function buildSubject(authorFirstName: string, kind: MissionKind, title = ""): string {
  const who = authorFirstName || "un membre";
  if (kind === "projet") {
    const t = title.trim();
    return t ? `Un projet participatif près de chez vous : ${t}` : "Un projet participatif près de chez vous";
  }
  return kind === "offre"
    ? `Près de chez vous, ${who} propose son aide, gratuitement`
    : `Près de chez vous, ${who} cherche un coup de main`;
}

// deno-lint-ignore no-explicit-any
type Db = any;

export interface ProximityHistory {
  emails: Set<string>;
  userIds: Set<string>;
}

async function paged<T>(run: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: { message?: string } | null }>, label: string): Promise<T[]> {
  const out: T[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await run(from, from + PAGE - 1);
    if (error) throw new Error(`historique ${label} illisible : ${error.message ?? "erreur"}`);
    out.push(...(data ?? []));
    if (!data || data.length < PAGE) break;
  }
  return out;
}

/** Lecture seule. Toute erreur lève : l'appelant doit bloquer l'envoi. */
export async function loadProximityHistory(db: Db, missionId: string): Promise<ProximityHistory> {
  const emails = new Set<string>();
  const userIds = new Set<string>();

  const campaigns = await paged<{ id: string; status: string | null }>(
    (f, t) => db.from("mass_emails").select("id,status").eq("segment", "proximity")
      .eq("filters->>mission_id", missionId).order("id", { ascending: true }).range(f, t),
    "campagnes",
  );
  const ids = campaigns.filter((c) => c.status !== "cancelled").map((c) => c.id);
  for (let i = 0; i < ids.length; i += IN_CHUNK) {
    const chunk = ids.slice(i, i + IN_CHUNK);
    const rows = await paged<{ recipient_email: string | null; status: string | null }>(
      (f, t) => db.from("mass_email_sends").select("recipient_email,status").in("mass_email_id", chunk)
        .order("id", { ascending: true }).range(f, t),
      "envois",
    );
    for (const r of rows) {
      const e = normalizeEmail(r.recipient_email);
      if (e && !NOT_RECEIVED_STATUSES.has(r.status ?? "")) emails.add(e);
    }
  }

  const queue = await paged<{ helper_id: string | null }>(
    (f, t) => db.from("mission_notification_queue").select("helper_id").eq("mission_id", missionId)
      .eq("status", "sent").order("id", { ascending: true }).range(f, t),
    "vagues",
  );
  for (const q of queue) if (q.helper_id) userIds.add(q.helper_id);

  for (const [label, apply] of [
    ["journal mission", (q: Db) => q.eq("metadata->>mission_id", missionId)],
    ["journal clé", (q: Db) => q.like("metadata->>idempotency_key", `mission-wave-${missionId}-%`)],
  ] as const) {
    const rows = await paged<{ recipient_email: string | null }>(
      (f, t) => apply(db.from("email_send_log").select("recipient_email").eq("template_name", "mission-help-needed")
        .in("status", ["sent", "deferred"])).order("id", { ascending: true }).range(f, t),
      label,
    );
    for (const r of rows) {
      const e = normalizeEmail(r.recipient_email);
      if (e) emails.add(e);
    }
  }
  return { emails, userIds };
}

export interface ProxRecipient {
  user_id: string;
  first_name: string;
  city: string;
  email: string;
  distance_km: number;
}

/** Sépare nouveaux destinataires et déjà prévenus. Pure. */
export function splitByHistory<T extends { user_id: string; email: string }>(rows: T[], h: ProximityHistory): { fresh: T[]; already: T[] } {
  const fresh: T[] = [];
  const already: T[] = [];
  for (const r of rows) {
    if (h.emails.has(normalizeEmail(r.email)) || h.userIds.has(r.user_id)) already.push(r);
    else fresh.push(r);
  }
  return { fresh, already };
}

export type BatchResult = { status: number | null; body: string };

export interface DeliverDeps {
  db: Db;
  /** Appel fournisseur ; null = erreur réseau (issue inconnue). */
  sendBatch: (emails: unknown[], idempotencyKey: string) => Promise<BatchResult>;
  sleep?: (ms: number) => Promise<void>;
  batchSize?: number;
}

export interface DeliverReport {
  sent: number;
  failed: number;
  uncertain: number;
  skippedAlready: number;
  skippedBusy: number;
  blocked: number;
  /** Lignes mass_email_sends non écrites (panne du journal). */
  journalFailed: number;
  /** Réservations non finalisées (restent « sending », jamais reprises). */
  finishFailed: number;
  /** Vrai dès qu'une issue doit être vérifiée à la main. */
  needsReconciliation: boolean;
}

type ProxAcquisition = { status: "acquired"; claim: SendClaim } | { status: "sent" | "busy" | "uncertain" | "unavailable" };

/** Même dérivation de clé que _shared/member-email-send-claim.ts (clés existantes conservées). */
export async function proximityClaimKey(email: string, missionId: string): Promise<string> {
  const bytes = new TextEncoder().encode(JSON.stringify([
    "member-email-v1", PROXIMITY_CLAIM_TEMPLATE, normalizeEmail(email), missionId,
  ]));
  const d = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(d), (b) => b.toString(16).padStart(2, "0")).join("");
}

/** Absence ou erreur de la RPC dédiée = « unavailable » : aucun appel fournisseur. */
export async function acquireProximityClaim(db: Db, email: string, missionId: string): Promise<ProxAcquisition> {
  try {
    const claim = { key: await proximityClaimKey(email, missionId), token: crypto.randomUUID() };
    const { data, error } = await db.rpc(PROXIMITY_ACQUIRE_RPC, { p_claim_key: claim.key, p_owner_token: claim.token });
    if (error) return { status: "unavailable" };
    if (data === "acquired") return { status: "acquired", claim };
    return { status: ["sent", "busy", "uncertain"].includes(data) ? data : "unavailable" };
  } catch {
    return { status: "unavailable" };
  }
}

/** 2xx accepté seulement si le corps est un lot JSON avec un id fournisseur par email. */
export function parseBatchIds(body: string, expected: number): string[] | null {
  try {
    const data = JSON.parse(body)?.data;
    if (!Array.isArray(data) || data.length !== expected) return null;
    const ids = data.map((d: { id?: unknown }) => d?.id);
    return ids.every((id) => typeof id === "string" && id.length > 0) ? ids as string[] : null;
  } catch {
    return null;
  }
}

async function sha256Hex(s: string): Promise<string> {
  const d = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return Array.from(new Uint8Array(d), (b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Réserve chaque adresse puis envoie par paquets. Un 2xx avec tous les ids
 * vaut envoi, un refus 4xx explicite reste rejouable, tout le reste (réseau,
 * 408, 409, 5xx, 2xx illisible) est ambigu : réservation « uncertain », ligne
 * « uncertain », réconciliation manuelle. La RPC dédiée ne reprend jamais une
 * réservation « sending » ou « uncertain », quel que soit son âge.
 */
export async function deliverProximity(
  deps: DeliverDeps,
  input: { missionId: string; campaignId: string; recipients: ProxRecipient[]; buildEmail: (r: ProxRecipient) => unknown },
): Promise<DeliverReport> {
  const { db, sendBatch } = deps;
  const sleep = deps.sleep ?? ((ms: number) => new Promise((r) => setTimeout(r, ms)));
  const size = deps.batchSize ?? 100;
  const rep: DeliverReport = {
    sent: 0, failed: 0, uncertain: 0, skippedAlready: 0, skippedBusy: 0, blocked: 0,
    journalFailed: 0, finishFailed: 0, needsReconciliation: false,
  };

  for (let i = 0; i < input.recipients.length; i += size) {
    const slice = input.recipients.slice(i, i + size);
    const claimed: Array<{ r: ProxRecipient; claim: SendClaim }> = [];
    for (const r of slice) {
      const a = await acquireProximityClaim(db, r.email, input.missionId);
      if (a.status === "acquired") claimed.push({ r, claim: a.claim });
      else if (a.status === "sent" || a.status === "uncertain") rep.skippedAlready++;
      else if (a.status === "busy") rep.skippedBusy++;
      else rep.blocked++;
    }
    if (claimed.length === 0) continue;

    const idem = `prox-${await sha256Hex(claimed.map((c) => c.claim.key).sort().join(","))}`;
    let res: BatchResult;
    try {
      res = await sendBatch(claimed.map((c) => input.buildEmail(c.r)), idem);
    } catch (e) {
      res = { status: null, body: String(e) };
    }
    const is2xx = res.status !== null && res.status >= 200 && res.status < 300;
    const ids = is2xx ? parseBatchIds(res.body, claimed.length) : null;
    const outcome: "sent" | "retryable" | "uncertain" = is2xx
      ? (ids ? "sent" : "uncertain")
      : res.status === null ? "uncertain" : memberSendOutcome(res.status);
    const rowStatus = outcome === "sent" ? "sent" : outcome === "retryable" ? "failed" : "uncertain";
    const rows = claimed.map((c, idx) => ({
      mass_email_id: input.campaignId,
      recipient_email: normalizeEmail(c.r.email),
      resend_id: ids?.[idx] ?? null,
      status: rowStatus,
      error_message: outcome === "sent" ? null
        : is2xx ? `${res.status}: réponse sans ids fournisseur complets` : `${res.status ?? "réseau"}: ${res.body.slice(0, 200)}`,
    }));
    let insErr: unknown = null;
    try {
      ({ error: insErr } = await db.from("mass_email_sends").insert(rows));
    } catch (e) {
      insErr = e;
    }
    if (insErr) {
      console.error("mass_email_sends insert error:", insErr);
      rep.journalFailed += claimed.length;
    }
    for (const c of claimed) {
      if (!(await finishMemberSendClaim(db, c.claim, outcome))) rep.finishFailed++;
    }
    if (outcome === "sent") rep.sent += claimed.length;
    else if (outcome === "retryable") rep.failed += claimed.length;
    else rep.uncertain += claimed.length;

    if (i + size < input.recipients.length) await sleep(1000);
  }
  rep.needsReconciliation = rep.uncertain + rep.journalFailed + rep.finishFailed + rep.skippedBusy > 0;
  return rep;
}
