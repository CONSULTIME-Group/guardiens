/**
 * Entraide, la preuve : « Ça s'est passé près de chez vous ».
 *
 * Logique pure, alimentée par la vue publique public_entraide_proofs.
 * Prénoms, ville, mot laissé, date en semaine. Rien d'autre.
 */
import { haversineDistance } from "@/lib/geocode";

export interface EntraideProof {
  mission_id: string;
  helper_first_name: string | null;
  owner_first_name: string | null;
  city: string | null;
  latitude_approx: number | null;
  longitude_approx: number | null;
  word: string | null;
  happened_at: string | null;
}

/** Nombre de preuves montrées sur une surface. */
export const PROOF_LIMIT = 3;

/** Rayon de proximité des preuves, en kilomètres. */
export const PROOF_RADIUS_KM = 50;

const DAY_MS = 24 * 60 * 60 * 1000;

export const proofDistanceKm = (proof: EntraideProof, origin: [number, number] | null): number | null => {
  if (!origin || proof.latitude_approx === null || proof.longitude_approx === null) return null;
  return haversineDistance(origin[0], origin[1], proof.latitude_approx, proof.longitude_approx);
};

const recency = (proof: EntraideProof) => (proof.happened_at ? new Date(proof.happened_at).getTime() : 0);

/**
 * Les plus récentes dans le rayon, sinon les plus récentes de France.
 * Le résultat est toujours plafonné à PROOF_LIMIT.
 */
export function selectProofs(
  proofs: EntraideProof[],
  origin: [number, number] | null,
  limit: number = PROOF_LIMIT,
): EntraideProof[] {
  const byRecency = [...proofs].sort((a, b) => recency(b) - recency(a));
  if (origin) {
    const near = byRecency.filter((proof) => {
      const distance = proofDistanceKm(proof, origin);
      return distance !== null && distance <= PROOF_RADIUS_KM;
    });
    if (near.length > 0) return near.slice(0, limit);
  }
  return byRecency.slice(0, limit);
}

/** Date en semaine : « aujourd'hui », « hier », « il y a 3 jours », « il y a 2 semaines ». */
export function weekLabel(value: string | null, now: Date = new Date()): string {
  if (!value) return "Récemment";
  const then = new Date(value);
  if (Number.isNaN(then.getTime())) return "Récemment";
  const days = Math.max(0, Math.floor((now.getTime() - then.getTime()) / DAY_MS));
  if (days === 0) return "Aujourd'hui";
  if (days === 1) return "Hier";
  if (days < 7) return `Il y a ${days} jours`;
  const weeks = Math.floor(days / 7);
  if (weeks === 1) return "Il y a une semaine";
  if (weeks < 5) return `Il y a ${weeks} semaines`;
  const months = Math.max(1, Math.floor(days / 30));
  return months === 1 ? "Il y a un mois" : `Il y a ${months} mois`;
}

/** Phrase de preuve, une ligne, prénoms et ville seulement. */
export function proofSentence(proof: EntraideProof): string {
  const owner = proof.owner_first_name?.trim() || "Une personne du coin";
  const helper = proof.helper_first_name?.trim() || "quelqu'un du coin";
  const city = proof.city?.trim() ? ` à ${proof.city.trim()}` : "";
  return `${owner} a reçu un coup de main de ${helper}${city}.`;
}
