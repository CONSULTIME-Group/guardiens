/**
 * Lot ADM9 « chiffres qui disent vrai » : règles pures des compteurs admin.
 * Chaque fonction se rejoue sur les valeurs de la base du 19/10/2026
 * (src/__tests__/adm9/).
 */
import { MASS_SENT_STATUSES } from "./massEmailCounts";

// ── 2a. Lieux par guide ──────────────────────────────────────────────

/** Nombre de lieux par guide, sur toutes les lignes lues (lecture paginée). */
export function countPlacesByGuide(rows: Array<{ city_guide_id: string | null }>): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const r of rows) {
    if (!r.city_guide_id) continue;
    counts[r.city_guide_id] = (counts[r.city_guide_id] ?? 0) + 1;
  }
  return counts;
}

// ── 2b. Onboarding en personnes distinctes ───────────────────────────

export const ONBOARDING_DEFINITION =
  "Personnes distinctes parmi les comptes créés sur la période, avec au moins un onboarding terminé (accueil ou questionnaire d'affinité) sur la même période.";

/** Personnes distinctes de la cohorte qui portent l'événement. */
export function distinctCohortPeople(cohortIds: Iterable<string>, eventUserIds: Iterable<string | null>): number {
  const cohort = new Set(cohortIds);
  const seen = new Set<string>();
  for (const id of eventUserIds) if (id && cohort.has(id)) seen.add(id);
  return seen.size;
}

/** Taux arrondi, jamais plafonné : un numérateur en personnes reste sous le dénominateur. */
export function rateOf(numerator: number, denominator: number): number {
  return denominator > 0 ? Math.round((numerator / denominator) * 100) : 0;
}

// ── 2c. Fondateurs ───────────────────────────────────────────────────
// Source : profiles.is_founder (count exact), jamais le plan founder_free de subscriptions.

// ── 2d. Envois « Terminé » à 0 envoyé ────────────────────────────────

export type MassOutcome = "sent" | "sent_later" | "cancelled" | null;

export const MASS_OUTCOME_LABELS: Record<Exclude<MassOutcome, null>, string> = {
  sent: "Terminé",
  sent_later: "Envoyé plus tard",
  cancelled: "Annulé",
};

/**
 * Motif lisible d'un envoi terminé sans envoi direct. Les envois reportés
 * (heures calmes, plafond de fréquence) partent par email_deferred_queue :
 * au moins un report « sent » = « Envoyé plus tard », sinon « Annulé ».
 * Un envoi non terminé, ou avec des envois directs, garde son statut (null).
 */
export function massOutcome(status: string, directSent: number, deferredSent: number): MassOutcome {
  if (status !== "done" || directSent > 0) return null;
  return deferredSent > 0 ? "sent_later" : "cancelled";
}

export interface DeferredRow { idempotency_key: string | null; status: string | null; created_at: string }

/**
 * Clé de rattachement d'un report à son envoi. Envoi groupé libre :
 * mass-{envoi}-{adresse}. Diffusion de proximité : listing-proximity-{annonce}-{gardien},
 * rattachée à la diffusion de la même annonce créée juste avant le report.
 */
export function deferredSentByCampaign(
  campaigns: Array<{ id: string; segment: string; created_at: string; filters?: { sit_id?: string } | null }>,
  deferred: DeferredRow[],
): Map<string, number> {
  const out = new Map<string, number>();
  const bySit = new Map<string, Array<{ id: string; at: number }>>();
  for (const c of campaigns) {
    out.set(c.id, 0);
    const sit = c.segment === "listing_proximity" ? c.filters?.sit_id : undefined;
    if (sit) {
      const list = bySit.get(sit) ?? [];
      list.push({ id: c.id, at: Date.parse(c.created_at) });
      bySit.set(sit, list);
    }
  }
  for (const list of bySit.values()) list.sort((a, b) => a.at - b.at);
  for (const d of deferred) {
    if (d.status !== "sent" || !d.idempotency_key) continue;
    const key = d.idempotency_key;
    if (key.startsWith("mass-")) {
      const id = key.slice(5, 41);
      if (out.has(id)) out.set(id, (out.get(id) ?? 0) + 1);
      continue;
    }
    if (key.startsWith("listing-proximity-")) {
      const sit = key.slice(18, 54);
      const list = bySit.get(sit);
      if (!list) continue;
      const at = Date.parse(d.created_at);
      let owner: string | null = null;
      for (const c of list) if (c.at <= at) owner = c.id;
      if (owner && at - (list.find((c) => c.id === owner)!.at) < 86_400_000) out.set(owner, (out.get(owner) ?? 0) + 1);
    }
  }
  return out;
}

// ── 2e. Diffusions « Annonces à proximité » dans Stats campagnes ─────

export const PROXIMITY_WINDOW_DAYS = 7;

export interface ProximityStats { broadcasts: number; sent: number; clickers: number; applications: number }

/**
 * Diffusions de proximité : envoyés et clics uniques par destinataire (méthodologie
 * existante, mass_email_sends), candidatures sur l'annonce diffusée dans les 7 jours.
 * Une diffusion sans aucun envoi n'est pas comptée.
 */
export function proximityStats(
  broadcasts: Array<{ id: string; created_at: string; filters?: { sit_id?: string } | null }>,
  sends: Array<{ mass_email_id: string; recipient_email: string | null; status: string | null; first_clicked_at?: string | null }>,
  applications: Array<{ id: string; sit_id: string; created_at: string }>,
): ProximityStats {
  const sentBy = new Map<string, Set<string>>();
  const clickBy = new Map<string, Set<string>>();
  for (const s of sends) {
    const email = (s.recipient_email ?? "").trim().toLowerCase();
    if (!email) continue;
    if (MASS_SENT_STATUSES.has(s.status ?? "")) {
      if (!sentBy.has(s.mass_email_id)) sentBy.set(s.mass_email_id, new Set());
      sentBy.get(s.mass_email_id)!.add(email);
    }
    if (s.first_clicked_at) {
      if (!clickBy.has(s.mass_email_id)) clickBy.set(s.mass_email_id, new Set());
      clickBy.get(s.mass_email_id)!.add(email);
    }
  }
  const apps = new Set<string>();
  let count = 0, sent = 0, clickers = 0;
  for (const b of broadcasts) {
    const n = sentBy.get(b.id)?.size ?? 0;
    if (n === 0) continue;
    count++;
    sent += n;
    clickers += clickBy.get(b.id)?.size ?? 0;
    const sit = b.filters?.sit_id;
    if (!sit) continue;
    const start = Date.parse(b.created_at);
    const end = start + PROXIMITY_WINDOW_DAYS * 86_400_000;
    for (const a of applications) {
      const at = Date.parse(a.created_at);
      if (a.sit_id === sit && at >= start && at < end) apps.add(a.id);
    }
  }
  return { broadcasts: count, sent, clickers, applications: apps.size };
}
