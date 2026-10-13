import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { AlertTriangle } from "lucide-react";

interface Props {
  open: boolean;
  userName: string;
  deleting: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export const DeleteUserDialog = ({ open, userName, deleting, onClose, onConfirm }: Props) => (
  <AlertDialog open={open} onOpenChange={(o) => !o && onClose()}>
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-destructive" />
          Suppression définitive
        </AlertDialogTitle>
        <AlertDialogDescription>
          Le compte de <strong>{userName}</strong> est effacé selon la procédure RGPD : données
          personnelles anonymisées, fichiers supprimés, accusé de traitement envoyé, adresse bloquée,
          demande tracée dans les demandes RGPD. Les avis et conversations des autres membres restent
          en place, sous un nom anonyme. L'effacement attend la fin des gardes et candidatures en
          cours. Cette action est <strong>irréversible</strong>.
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel>Annuler</AlertDialogCancel>
        <AlertDialogAction
          onClick={onConfirm}
          disabled={deleting}
          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
        >
          {deleting ? "Suppression…" : "Supprimer définitivement"}
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
);
