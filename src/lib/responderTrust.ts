/**
 * Lot E19 : ce qui rassure la personne qui ouvre sa porte, sur la carte de
 * réponse (MissionResponseCard) : identité vérifiée et ancienneté, lues dans
 * public_profiles (identity_verified, created_at).
 */
import { format } from "date-fns";
import { fr } from "date-fns/locale";

export interface ResponderTrustInput {
  identity_verified?: boolean | null;
  created_at?: string | null;
}

/** « Membre depuis octobre 2026 », ou null sans date lisible. */
export function memberSinceLabel(iso?: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return `Membre depuis ${format(d, "MMMM yyyy", { locale: fr })}`;
}

export function responderTrust(responder?: ResponderTrustInput | null): { verified: boolean; memberSince: string | null } {
  return {
    verified: responder?.identity_verified === true,
    memberSince: memberSinceLabel(responder?.created_at ?? null),
  };
}
