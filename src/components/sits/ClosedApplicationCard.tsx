/**
 * Lot REC3 : candidature close sur la fiche d'une annonce.
 *
 * Avant, toute candidature existante affichait « Candidature envoyée », même
 * annulée ou déclinée, et le gardien ne pouvait plus candidater.
 */
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

export type ClosedApplicationStatus = "cancelled" | "rejected";

/** « 12 novembre », jour de Paris. Chaîne vide sans date lisible. */
export function closedApplicationDay(createdAt: string | null | undefined): string {
  if (!createdAt) return "";
  const d = new Date(createdAt);
  if (Number.isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", timeZone: "Europe/Paris" }).format(d);
}

export function closedApplicationTitle(createdAt: string | null | undefined): string {
  const day = closedApplicationDay(createdAt);
  return day ? `Votre candidature du ${day} est close` : "Votre candidature est close";
}

/** Phrase sous le titre, selon le statut et l'état de l'annonce. */
export function closedApplicationLine(status: ClosedApplicationStatus, canReapply: boolean, ownerFirstName: string): string {
  const owner = ownerFirstName.trim();
  if (status === "cancelled" && canReapply) {
    return owner ? `L'annonce de ${owner} est toujours ouverte.` : "L'annonce est toujours ouverte.";
  }
  if (status === "rejected") {
    return owner ? `${owner} peut la rouvrir depuis son annonce.` : "Le propriétaire peut la rouvrir depuis son annonce.";
  }
  return "Cette annonce a refermé ses candidatures.";
}

interface Props {
  status: ClosedApplicationStatus;
  createdAt: string | null | undefined;
  ownerFirstName: string;
  canReapply: boolean;
  onReapply: () => void;
}

const ClosedApplicationCard = ({ status, createdAt, ownerFirstName, canReapply, onReapply }: Props) => {
  const reapply = status === "cancelled" && canReapply;
  return (
    <div
      className="w-full md:w-auto md:min-w-[16rem] md:max-w-sm rounded-2xl border border-border bg-card p-4 space-y-3"
      data-testid="closed-application-card"
    >
      <p className="font-heading text-base font-semibold text-foreground">{closedApplicationTitle(createdAt)}</p>
      <p className="text-sm text-muted-foreground">{closedApplicationLine(status, canReapply, ownerFirstName)}</p>
      {reapply ? (
        <>
          <Button className="w-full h-11 md:h-12 px-6 rounded-full text-base font-semibold" onClick={onReapply}>
            Candidater de nouveau
          </Button>
          <p className="text-xs text-muted-foreground">Votre message précédent est repris, libre à vous de le modifier.</p>
        </>
      ) : (
        <Button asChild variant="outline" className="w-full h-11 rounded-full text-sm font-semibold">
          <Link to="/search">Voir d'autres gardes près de chez vous</Link>
        </Button>
      )}
    </div>
  );
};

export default ClosedApplicationCard;
