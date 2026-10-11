/**
 * Lot I2 : proposer une garde à un gardien sans la publier.
 *
 * Source unique côté interface. Les règles font foi en base
 * (supabase/prepared-migrations/20261011150000_sit_private_proposals.sql) :
 * sit_proposal_blockers, create_sit_proposal, get_sit_proposal,
 * respond_sit_proposal. Les limites ci-dessous en sont le miroir pour les
 * textes ; les modifier ici sans la fonction sit_proposal_limits() ne change
 * que l'affichage.
 */
import { supabase } from "@/integrations/supabase/client";

export const SIT_PROPOSAL_LIMITS = {
  expiryDays: 5,
  maxOpenPerSit: 3,
  maxPerDay: 10,
  /** Lot I3 : durée de priorité avant publication automatique, en heures. */
  priorityHours: 48,
} as const;

export type ProposalBlocker = "city" | "dates" | "photo" | "description";

const BLOCKER_ORDER: ProposalBlocker[] = ["city", "dates", "photo", "description"];

export type ProposalChecklistItem = {
  id: ProposalBlocker;
  label: string;
  detail: string;
  done: boolean;
};

/** Les quatre informations exigées, dans l'ordre affiché, avec leur état. */
export function proposalChecklist(blockers: readonly string[], sitterFirstName: string): ProposalChecklistItem[] {
  const missing = new Set(blockers);
  const copy: Record<ProposalBlocker, { label: string; detail: string }> = {
    city: { label: "Le lieu", detail: "La commune de votre logement." },
    dates: { label: "Les dates", detail: `Le jour d'arrivée et le jour de départ de ${sitterFirstName}, à venir.` },
    photo: {
      label: "Au moins une photo de votre logement",
      detail: `${sitterFirstName} la verra dans votre proposition.`,
    },
    description: {
      label: "Ce que vous confiez",
      detail: "Vos animaux, vos plantes, vos attentes, en quelques lignes.",
    },
  };
  return BLOCKER_ORDER.map((id) => ({ id, ...copy[id], done: !missing.has(id) }));
}

/** Titre de l'écran pédagogique selon le nombre d'informations manquantes. */
export function proposalBlockedTitle(missingCount: number): string {
  if (missingCount >= 4) return "Présentez d'abord votre maison";
  if (missingCount === 1) return "Encore une information avant de proposer votre garde";
  return `Encore ${missingCount === 2 ? "deux" : "trois"} informations avant de proposer votre garde`;
}

/** Message lisible pour une erreur renvoyée par les fonctions de proposition. */
export function proposalErrorMessage(raw: unknown, sitterFirstName = "ce gardien"): string {
  const text = String((raw as { message?: string } | null)?.message ?? raw ?? "");
  if (text.includes("sit_incomplete")) return "Il manque encore une information à votre garde.";
  if (text.includes("already_proposed")) return `Vous avez déjà proposé cette garde à ${sitterFirstName}.`;
  if (text.includes("proposal_open_limit"))
    return `Cette garde est déjà proposée à ${SIT_PROPOSAL_LIMITS.maxOpenPerSit} gardiens. Attendez une réponse avant d'en solliciter un autre.`;
  if (text.includes("proposal_daily_limit"))
    return `Vous avez envoyé ${SIT_PROPOSAL_LIMITS.maxPerDay} propositions aujourd'hui. Vous pourrez en envoyer d'autres demain.`;
  if (text.includes("sitter_unavailable")) return `${sitterFirstName} ne reçoit pas de proposition de garde pour le moment.`;
  if (text.includes("sit_not_draft")) return "Cette garde est déjà publiée : invitez le gardien depuis l'annonce.";
  if (text.includes("proposal_expired")) return "Cette proposition a expiré.";
  if (text.includes("proposal_closed")) return "Cette proposition est close.";
  if (text.includes("already_applied")) return "Vous avez déjà répondu à cette garde.";
  if (text.includes("PROFILE_INCOMPLETE"))
    return "Complétez votre profil de gardien (40 % au moins) pour dire oui à une garde.";
  if (text.includes("proposal_not_found")) return "Cette proposition n'existe pas ou ne vous est pas destinée.";
  return "L'envoi n'a pas abouti. Réessayez dans un instant.";
}

// Les fonctions ne figurent pas encore dans les types générés : appel typé ici.
const rpc = (name: string, args: Record<string, unknown>) =>
  (supabase as unknown as { rpc: (n: string, a: Record<string, unknown>) => Promise<{ data: unknown; error: unknown }> }).rpc(
    name,
    args,
  );

export async function fetchProposalBlockers(sitId: string): Promise<ProposalBlocker[]> {
  const { data, error } = await rpc("sit_proposal_blockers", { p_sit_id: sitId });
  if (error) throw error;
  return ((data as string[] | null) ?? []).filter((b): b is ProposalBlocker =>
    (BLOCKER_ORDER as string[]).includes(b),
  );
}

export async function createSitProposal(
  sitId: string,
  sitterId: string,
  message: string,
  publishAfter = false,
): Promise<string> {
  const { data, error } = await rpc("create_sit_proposal", {
    p_sit_id: sitId,
    p_sitter_id: sitterId,
    p_message: message.trim() || null,
    p_publish_after: publishAfter,
  });
  if (error) throw error;
  return data as string;
}

export type SitProposalState = "open" | "applied" | "declined" | "closed" | "expired";

export type SitProposal = {
  id: string;
  state: SitProposalState;
  viewer: "sitter" | "owner";
  message: string | null;
  created_at: string;
  expires_at: string;
  owner_id: string;
  sitter_id: string;
  sit: {
    id: string;
    title: string | null;
    start_date: string | null;
    end_date: string | null;
    flexible_dates: boolean | null;
    city: string | null;
    description: string | null;
    status: string;
  };
  property: {
    type: string | null;
    environment: string | null;
    bedrooms_count: number | null;
    description: string | null;
  } | null;
  photos: string[];
  pets: Array<{ name: string | null; species: string | null }>;
  owner: { first_name: string | null; avatar_url: string | null; identity_verified: boolean };
};

export async function getSitProposal(id: string): Promise<SitProposal> {
  const { data, error } = await rpc("get_sit_proposal", { p_invitation_id: id });
  if (error) throw error;
  return data as SitProposal;
}

export async function respondSitProposal(
  id: string,
  accept: boolean,
  message: string,
): Promise<{ result: "accepted" | "declined"; sit_id: string; application_id?: string }> {
  const { data, error } = await rpc("respond_sit_proposal", {
    p_invitation_id: id,
    p_accept: accept,
    p_message: message.trim() || null,
  });
  if (error) throw error;
  return data as { result: "accepted" | "declined"; sit_id: string; application_id?: string };
}

/** « 5 jours » restants, « dernier jour », ou null une fois expirée. */
export function proposalTimeLeft(expiresAt: string, now: Date = new Date()): string | null {
  const ms = new Date(expiresAt).getTime() - now.getTime();
  if (!Number.isFinite(ms) || ms <= 0) return null;
  const days = Math.ceil(ms / 86_400_000);
  return days <= 1 ? "Dernier jour pour répondre" : `${days} jours pour répondre`;
}

/** Ce qui est confié, lisible : « Pépin et Olive » ou la description courte. */
export function petsLabel(pets: SitProposal["pets"]): string {
  const names = pets.map((p) => (p.name ?? "").trim()).filter(Boolean);
  if (names.length === 0) return "";
  if (names.length === 1) return names[0];
  return `${names.slice(0, -1).join(", ")} et ${names[names.length - 1]}`;
}

const dayMonth = (d: Date) =>
  new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", timeZone: "UTC" }).format(d);

/** « Du 20 au 27 décembre, 7 nuits » ; mois répété quand il change. */
export function proposalPeriod(start: string | null | undefined, end: string | null | undefined): string {
  if (!start || !end) return "";
  const a = new Date(`${start.slice(0, 10)}T12:00:00Z`);
  const b = new Date(`${end.slice(0, 10)}T12:00:00Z`);
  if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime()) || b < a) return "";
  const nights = Math.round((b.getTime() - a.getTime()) / 86_400_000);
  const sameMonth = a.getUTCMonth() === b.getUTCMonth() && a.getUTCFullYear() === b.getUTCFullYear();
  const from = sameMonth ? String(a.getUTCDate()) : dayMonth(a);
  const range = `Du ${from === "1" ? "1er" : from} au ${dayMonth(b)}`;
  return nights > 0 ? `${range}, ${nights} nuit${nights > 1 ? "s" : ""}` : range;
}

const PROPERTY_TYPE_LABELS: Record<string, string> = {
  apartment: "Appartement",
  house: "Maison",
  farm: "Ferme",
  chalet: "Chalet",
};
const ENVIRONMENT_LABELS: Record<string, string> = {
  city_center: "en centre ville",
  suburban: "en périphérie",
  countryside: "à la campagne",
  mountain: "à la montagne",
  seaside: "en bord de mer",
  forest: "en forêt",
};

/** « Maison à la campagne, 3 chambres » ; chaîne vide si rien n'est connu. */
export function propertyLabel(property: SitProposal["property"]): string {
  if (!property) return "";
  const head = [PROPERTY_TYPE_LABELS[property.type ?? ""] ?? "Logement", ENVIRONMENT_LABELS[property.environment ?? ""]]
    .filter(Boolean)
    .join(" ");
  const rooms = property.bedrooms_count && property.bedrooms_count > 0
    ? `${property.bedrooms_count} chambre${property.bedrooms_count > 1 ? "s" : ""}`
    : "";
  return [head, rooms].filter(Boolean).join(", ");
}
