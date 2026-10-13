/**
 * Lot X3a (13/10/2026), constat B-02 : quand le gardien retenu annulait sa
 * participation, le navigateur tentait de republier l'annonce et de passer sa
 * candidature en cancelled ; la RLS et le garde-fou des statuts refusaient
 * les deux sans erreur, et l'écran affichait pourtant « L'annonce est de
 * nouveau visible pour d'autres gardiens ».
 *
 * Désormais create_avis_annulation fait tout côté serveur (migration X3a) :
 * candidature en cancelled, annonce republiée si la garde commence après
 * aujourd'hui. L'écran relit l'annonce et décrit ce qui s'est réellement
 * passé.
 */

export type CancelOutcome = "republished" | "cancelled";

/** Issue lue après l'annulation : l'annonce est-elle de nouveau publiée ? */
export function cancelOutcomeFromStatus(status: string | null | undefined): CancelOutcome {
  return status === "published" ? "republished" : "cancelled";
}

/** Message affiché à la personne qui vient d'annuler. */
export function cancelOutcomeMessage(byRole: "gardien" | "proprio", outcome: CancelOutcome): string {
  if (byRole === "proprio") return "Garde annulée. Le gardien a été notifié.";
  return outcome === "republished"
    ? "Votre participation est annulée. L'annonce est de nouveau ouverte aux autres gardiens et le propriétaire est prévenu."
    : "Votre participation est annulée. Le propriétaire est prévenu.";
}
