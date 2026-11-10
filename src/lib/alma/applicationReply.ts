/**
 * Lot ALMA2 (10/11/2026, arène « Alma vivante », décision 3 validée par
 * Jérémie) : Alma propose au propriétaire de préparer sa réponse à une
 * candidature reçue. Base du 10/11 : 17 candidatures sur 70 sans décision
 * après 48 h, et la bulle « premier message » ne servait jamais (chaque fil
 * de garde naît avec le mot du candidat).
 *
 * Conditions : fil lu, propriétaire de l'annonce, candidature encore ouverte
 * (en attente, vue ou en discussion), au moins un message du candidat et
 * aucun message du propriétaire.
 */
export const OPEN_APPLICATION_STATUSES: readonly string[] = ["pending", "viewed", "discussing"];

export function shouldOfferApplicationReply(input: {
  loaded: boolean;
  isOwner: boolean;
  sitId: string | null | undefined;
  applicationStatus: string | null;
  myMessages: number;
  theirMessages: number;
}): boolean {
  return (
    input.loaded &&
    input.isOwner &&
    !!input.sitId &&
    !!input.applicationStatus &&
    OPEN_APPLICATION_STATUSES.includes(input.applicationStatus) &&
    input.theirMessages > 0 &&
    input.myMessages === 0
  );
}
