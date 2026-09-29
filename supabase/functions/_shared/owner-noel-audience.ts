// Audience et données par destinataire du gabarit owner-noel-2026 (lot N3).
//
// Règle d'or : aucune coordonnée ne sort de ce module. Les cartes gardien ne
// portent que prénom, commune, photo, distance arrondie au km et pastille.
//
// Distance : même calcul que la chaîne owner-no-sit-j3 (evaluate-journeys,
// haversineKm de nearby-open-sits.ts), réutilisé ici plutôt que recréé.

import { haversineKm } from "./nearby-open-sits.ts";
import { emailAvatarUrl, emailCity } from "./entraide-card-data.ts";
import { splitByPressure } from "./owner-campaign-pressure.ts";

/** Garde-fou de pression (lot N4b) : 3 emails ou plus en 7 jours, exclu de l'envoi du jour. */
export function applyNoelPressure<T extends { email?: string | null }>(rows: T[], recentCounts: Map<string, number>) {
  return splitByPressure(rows, recentCounts);
}

export const OWNER_NOEL_TEMPLATE = "owner-noel-2026";
export const NOEL_RADIUS_KM = 50;
export const NOEL_FOUNDER_WINDOW_DAYS = 4;
export const NOEL_MIN_COMPLETION = 60;

/** Comptes fondateurs : un membre en conversation suivie avec eux est traité à la main. */
export const FOUNDER_PROFILE_IDS: readonly string[] = [
  "7bf29905-d372-4669-93b1-ec7def9b06d5",
];

/** Écussons gardien et entraide, avec leur libellé (miroir de src/components/badges/badge-definitions.ts). */
export const NOEL_BADGE_LABELS: Record<string, string> = {
  animaux_heureux: "Les animaux l'adorent",
  maison_nickel: "Maison nickel",
  potager_respire: "Mains vertes",
  nouvelles_quot: "Rassurant & Connecté",
  debrouillard: "Débrouillardise",
  au_dela_attentes: "Au-delà des attentes",
  voisins_adorent: "Allié du quartier",
  invite_noel: "Invité à Noël",
  reactivite_flash: "Réactivité éclair",
  discretion_totale: "Ombre bienveillante",
  autonomie_expert: "Autonomie totale",
  confiance_aveugle: "Confiance totale",
  coup_de_main_or: "Coup de main",
  super_voisin: "Personne en or",
  on_remet_ca: "Mission récurrente",
};

export interface SitRow { user_id: string; status: string | null; published_at: string | null }
export interface ConversationRow { id: string; owner_id: string | null; sitter_id: string | null }
export interface MessageRow { conversation_id: string; sender_id: string | null; created_at: string }
export interface SitterRow {
  id: string;
  first_name: string | null;
  city: string | null;
  avatar_url: string | null;
  latitude: number | null;
  longitude: number | null;
  profile_completion: number | null;
  identity_verified: boolean | null;
}
export interface OwnerGeo { id: string; first_name?: string | null; city?: string | null; latitude?: number | null; longitude?: number | null }

/** Profils ayant déjà publié : une annonce hors brouillon, ou une date de publication. */
export function publishedOwnerIds(sits: SitRow[]): Set<string> {
  const out = new Set<string>();
  for (const s of sits) {
    if ((s.status && s.status !== "draft") || s.published_at) out.add(s.user_id);
  }
  return out;
}

/**
 * Membres suivis à la main : conversation avec un fondateur où le fondateur a
 * écrit dans les 4 derniers jours, ou où le membre a répondu (à tout moment).
 */
export function founderFollowupIds(
  convs: ConversationRow[],
  messages: MessageRow[],
  now: Date = new Date(),
  founders: readonly string[] = FOUNDER_PROFILE_IDS,
): Set<string> {
  const founderSet = new Set(founders);
  const cutoff = now.getTime() - NOEL_FOUNDER_WINDOW_DAYS * 86400000;
  const memberByConv = new Map<string, string>();
  for (const c of convs) {
    const ownerF = c.owner_id ? founderSet.has(c.owner_id) : false;
    const sitterF = c.sitter_id ? founderSet.has(c.sitter_id) : false;
    if (ownerF === sitterF) continue; // aucun fondateur, ou deux fondateurs
    const member = ownerF ? c.sitter_id : c.owner_id;
    if (member) memberByConv.set(c.id, member);
  }
  const out = new Set<string>();
  for (const m of messages) {
    const member = memberByConv.get(m.conversation_id);
    if (!member || !m.sender_id) continue;
    if (m.sender_id === member) out.add(member);
    else if (founderSet.has(m.sender_id) && new Date(m.created_at).getTime() >= cutoff) out.add(member);
  }
  return out;
}

export interface NearbySitter { row: SitterRow; km: number }

/** Gardiens à moins de 50 km, triés par distance. */
export function nearbySitters(owner: OwnerGeo, pool: SitterRow[]): NearbySitter[] {
  if (typeof owner.latitude !== "number" || typeof owner.longitude !== "number") return [];
  const here = { lat: owner.latitude, lng: owner.longitude };
  const out: NearbySitter[] = [];
  for (const s of pool) {
    if (s.id === owner.id || typeof s.latitude !== "number" || typeof s.longitude !== "number") continue;
    const km = haversineKm(here, { lat: s.latitude, lng: s.longitude });
    if (km < NOEL_RADIUS_KM) out.push({ row: s, km });
  }
  out.sort((a, b) => a.km - b.km || a.row.id.localeCompare(b.row.id));
  return out;
}

/** Les 3 plus proches avec photo et profil à 60 % ou plus, complétés par les plus proches restants. */
export function pickThree(nearby: NearbySitter[]): NearbySitter[] {
  const good = nearby.filter((n) => !!(n.row.avatar_url || "").trim() && (n.row.profile_completion ?? 0) >= NOEL_MIN_COMPLETION);
  const picked = good.slice(0, 3);
  if (picked.length < 3) {
    const ids = new Set(picked.map((p) => p.row.id));
    for (const n of nearby) {
      if (picked.length >= 3) break;
      if (!ids.has(n.row.id)) picked.push(n);
    }
  }
  return picked;
}

/** Écusson reçu le plus souvent (égalité : libellé alphabétique). */
export function topBadgeLabels(rows: Array<{ user_id: string; badge_id: string }>): Map<string, string> {
  const counts = new Map<string, Map<string, number>>();
  for (const r of rows) {
    if (!NOEL_BADGE_LABELS[r.badge_id]) continue;
    const m = counts.get(r.user_id) ?? new Map<string, number>();
    m.set(r.badge_id, (m.get(r.badge_id) ?? 0) + 1);
    counts.set(r.user_id, m);
  }
  const out = new Map<string, string>();
  for (const [uid, m] of counts) {
    const best = [...m.entries()].sort((a, b) =>
      b[1] - a[1] || NOEL_BADGE_LABELS[a[0]].localeCompare(NOEL_BADGE_LABELS[b[0]], "fr"))[0];
    out.set(uid, NOEL_BADGE_LABELS[best[0]]);
  }
  return out;
}

export function chipFor(s: SitterRow, topBadge: Map<string, string>): string | undefined {
  if (s.identity_verified === true) return "Identité vérifiée";
  return topBadge.get(s.id);
}

export interface NoelTemplateData {
  firstName: string;
  city?: string;
  variant: "A" | "B";
  nearbyCount?: number;
  sitters?: Array<{ id: string; firstName: string; city?: string; avatarUrl?: string; distanceKm: number; chip?: string }>;
}

/** Données envoyées au gabarit. Variante A seulement avec coordonnées, commune et au moins un gardien proche. */
export function buildNoelData(owner: OwnerGeo, pool: SitterRow[], topBadge: Map<string, string>): NoelTemplateData {
  const firstName = (owner.first_name ?? "").trim();
  const city = emailCity(owner.city);
  const nearby = nearbySitters(owner, pool);
  if (nearby.length === 0 || !city) {
    return { firstName, ...(city ? { city } : {}), variant: "B" };
  }
  return {
    firstName,
    city,
    variant: "A",
    nearbyCount: nearby.length,
    sitters: pickThree(nearby).map(({ row, km }) => {
      const c = emailCity(row.city);
      const a = emailAvatarUrl(row.avatar_url);
      const chip = chipFor(row, topBadge);
      return {
        id: row.id,
        firstName: (row.first_name ?? "").trim(),
        ...(c ? { city: c } : {}),
        ...(a ? { avatarUrl: a } : {}),
        distanceKm: Math.round(km),
        ...(chip ? { chip } : {}),
      };
    }),
  };
}

// ── Chargement (client service) ──────────────────────────────────────────────

// deno-lint-ignore no-explicit-any
type Client = any;
const PAGE = 1000;
const IN_CHUNK = 150;

// deno-lint-ignore no-explicit-any
async function pageAll<T>(build: (from: number, to: number) => any): Promise<T[]> {
  const out: T[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await build(from, from + PAGE - 1);
    if (error) throw new Error(error.message);
    out.push(...((data ?? []) as T[]));
    if (!data || data.length < PAGE) break;
  }
  return out;
}

function isSuspended(p: { suspended_at?: string | null; suspended_until?: string | null }, now: number): boolean {
  if (!p.suspended_at) return false;
  return !p.suspended_until || new Date(p.suspended_until).getTime() > now;
}

/** Vivier gardien : sitter ou both, actif, non suspendu, géolocalisé. */
export async function loadSitterPool(client: Client): Promise<SitterRow[]> {
  const now = Date.now();
  const rows = await pageAll<SitterRow & { suspended_at: string | null; suspended_until: string | null }>((f, t) =>
    client.from("profiles")
      .select("id, first_name, city, avatar_url, latitude, longitude, profile_completion, identity_verified, suspended_at, suspended_until")
      .in("role", ["sitter", "both"])
      .eq("account_status", "active")
      .not("latitude", "is", null)
      .not("longitude", "is", null)
      .order("id", { ascending: true })
      .range(f, t));
  return rows.filter((r) => !isSuspended(r, now));
}

export async function loadPublishedOwnerIds(client: Client): Promise<Set<string>> {
  const sits = await pageAll<SitRow>((f, t) =>
    client.from("sits").select("user_id, status, published_at").order("id", { ascending: true }).range(f, t));
  return publishedOwnerIds(sits);
}

export async function loadFounderFollowupIds(client: Client, now = new Date()): Promise<Set<string>> {
  const founders = [...FOUNDER_PROFILE_IDS];
  const list = founders.join(",");
  const convs = await pageAll<ConversationRow>((f, t) =>
    client.from("conversations").select("id, owner_id, sitter_id")
      .or(`owner_id.in.(${list}),sitter_id.in.(${list})`)
      .order("id", { ascending: true }).range(f, t));
  const messages: MessageRow[] = [];
  const ids = convs.map((c) => c.id);
  for (let i = 0; i < ids.length; i += IN_CHUNK) {
    const chunk = ids.slice(i, i + IN_CHUNK);
    messages.push(...await pageAll<MessageRow>((f, t) =>
      client.from("messages").select("conversation_id, sender_id, created_at")
        .in("conversation_id", chunk).order("id", { ascending: true }).range(f, t)));
  }
  return founderFollowupIds(convs, messages, now, founders);
}

export async function loadTopBadges(client: Client, sitterIds: string[]): Promise<Map<string, string>> {
  const rows: Array<{ user_id: string; badge_id: string }> = [];
  const ids = [...new Set(sitterIds)];
  for (let i = 0; i < ids.length; i += IN_CHUNK) {
    const chunk = ids.slice(i, i + IN_CHUNK);
    rows.push(...await pageAll<{ user_id: string; badge_id: string }>((f, t) =>
      client.from("badge_attributions").select("user_id, badge_id").in("user_id", chunk)
        .order("id", { ascending: true }).range(f, t)));
  }
  return topBadgeLabels(rows);
}

/** Données de tous les destinataires : écussons lus seulement pour les gardiens affichés. */
export async function buildNoelDataFor(
  client: Client,
  owners: OwnerGeo[],
  pool?: SitterRow[],
): Promise<Map<string, NoelTemplateData>> {
  const sitters = pool ?? await loadSitterPool(client);
  const shown = new Set<string>();
  for (const o of owners) for (const n of pickThree(nearbySitters(o, sitters))) shown.add(n.row.id);
  const badges = await loadTopBadges(client, [...shown]);
  const out = new Map<string, NoelTemplateData>();
  for (const o of owners) out.set(o.id, buildNoelData(o, sitters, badges));
  return out;
}
