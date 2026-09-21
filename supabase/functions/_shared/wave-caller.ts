// Contrôle d'accès du moteur de vagues de l'Entraide.
//
// Deux appelants légitimes, et eux seuls :
//  - le planificateur, qui présente la clé de service exacte (coffre-fort) ;
//  - l'auteur du besoin, depuis le navigateur, au moment de la publication :
//    son jeton authentifié est accepté uniquement pour SON besoin.
//
// Tout autre appel est refusé : 401 sans jeton reconnu, 403 pour un membre
// qui demande la vague d'un besoin qui n'est pas le sien, et 403 pour le
// passage horaire (corps vide), réservé au planificateur.
//
// La logique est pure et testée : les accès base sont injectés.

export type WaveAuthDecision =
  | { allowed: true; via: "service" | "owner"; userId?: string }
  | { allowed: false; status: 401 | 403 | 500; error: string; reason: string };

export interface WaveAuthInput {
  authHeader: string | null;
  serviceKey: string;
  missionId?: string | null;
  /** Retourne l'identifiant du membre porteur du jeton, ou null. */
  getUserId: (token: string) => Promise<string | null>;
  /** Retourne l'identifiant de l'auteur du besoin, ou null s'il est introuvable. */
  getMissionOwnerId: (missionId: string) => Promise<string | null>;
}

export async function authorizeWaveCaller(input: WaveAuthInput): Promise<WaveAuthDecision> {
  const header = input.authHeader ?? "";
  if (!header.startsWith("Bearer ")) {
    return { allowed: false, status: 401, error: "Unauthorized", reason: "en-tete Authorization absent ou mal forme" };
  }
  const token = header.slice(7).trim();
  if (!token) {
    return { allowed: false, status: 401, error: "Unauthorized", reason: "jeton vide" };
  }
  if (!input.serviceKey) {
    return { allowed: false, status: 500, error: "Server configuration error", reason: "configuration serveur incomplete" };
  }
  if (token === input.serviceKey) {
    return { allowed: true, via: "service" };
  }

  const userId = await input.getUserId(token);
  if (!userId) {
    return { allowed: false, status: 401, error: "Unauthorized", reason: "jeton non reconnu" };
  }

  const missionId = input.missionId ?? null;
  if (!missionId) {
    return { allowed: false, status: 403, error: "Forbidden", reason: "passage horaire reserve au planificateur" };
  }

  const ownerId = await input.getMissionOwnerId(missionId);
  if (!ownerId || ownerId !== userId) {
    return { allowed: false, status: 403, error: "Forbidden", reason: "membre etranger au besoin" };
  }
  return { allowed: true, via: "owner", userId };
}
