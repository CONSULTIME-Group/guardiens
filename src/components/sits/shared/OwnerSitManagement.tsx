/**
 * Bloc "Gérer cette garde", visible uniquement par le propriétaire.
 * Centralise les actions de gestion : modifier, partager, annuler.
 *
 * Affiché en bas de la page d'annonce pour ne pas polluer la lecture,
 * mais visuellement clair (pas un lien tertiaire microscopique).
 */
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Pencil, Share2, XCircle, BookOpen, Settings2 } from "lucide-react";

interface OwnerSitManagementProps {
  sitId: string;
  propertyId: string;
  status: string;
  /** Indique si la garde peut encore être annulée (confirmed uniquement). */
  canCancel: boolean;
  onCancelClick: () => void;
  onShareClick?: () => void;
  /** Indique si l'annonce publiée peut être dépubliée (remise en brouillon). */
  canUnpublish?: boolean;
  onUnpublishClick?: () => void;
}

const OwnerSitManagement = ({
  sitId,
  propertyId,
  status,
  canCancel,
  onCancelClick,
  onShareClick,
  canUnpublish,
  onUnpublishClick,
}: OwnerSitManagementProps) => {
  return (
    <section
      className="mt-10 mb-6 rounded-xl border border-border bg-muted/30 p-5 md:p-6"
      aria-labelledby="owner-management-title"
    >
      <div className="flex items-center gap-2 mb-1">
        <Settings2 className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
        <h2 id="owner-management-title" className="font-heading font-semibold text-base">
          Gérer cette garde
        </h2>
      </div>
      <p className="text-xs text-muted-foreground mb-4">
        Toutes les actions disponibles pour cette annonce.
      </p>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <Button
          variant="outline"
          size="sm"
          asChild
          className="justify-start gap-2"
        >
          <Link to={`/sits/${sitId}/edit`}>
            <Pencil className="h-3.5 w-3.5" />
            Modifier
          </Link>
        </Button>

        <Button
          variant="outline"
          size="sm"
          asChild
          className="justify-start gap-2"
        >
          <Link to={`/house-guide/${propertyId}`}>
            <BookOpen className="h-3.5 w-3.5" />
            Guide maison
          </Link>
        </Button>

        {onShareClick && status === "published" && (
          <Button
            variant="outline"
            size="sm"
            onClick={onShareClick}
            className="justify-start gap-2"
          >
            <Share2 className="h-3.5 w-3.5" />
            Partager
          </Button>
        )}

        {canUnpublish && onUnpublishClick && (
          <Button
            variant="outline"
            size="sm"
            onClick={onUnpublishClick}
            className="justify-start gap-2 text-destructive-text hover:text-destructive-text hover:bg-destructive/10 border-destructive/30 hover:border-destructive/50"
          >
            <XCircle className="h-3.5 w-3.5" />
            Dépublier l'annonce
          </Button>
        )}

        {canCancel && (
          <Button
            variant="outline"
            size="sm"
            onClick={onCancelClick}
            className="justify-start gap-2 text-destructive-text hover:text-destructive-text hover:bg-destructive/10 border-destructive/30 hover:border-destructive/50"
          >
            <XCircle className="h-3.5 w-3.5" />
            Annuler la garde
          </Button>
        )}
      </div>

      {canCancel && (
        <p className="text-xs text-muted-foreground mt-3">
          L'annulation est définitive. Le gardien sera notifié immédiatement.
        </p>
      )}

      {canUnpublish && !canCancel && (
        <p className="text-xs text-muted-foreground mt-3">
          Dépublier remet l'annonce en brouillon : elle ne sera plus visible des gardiens
          mais vous pourrez la republier à tout moment.
        </p>
      )}
    </section>
  );
};

export default OwnerSitManagement;
