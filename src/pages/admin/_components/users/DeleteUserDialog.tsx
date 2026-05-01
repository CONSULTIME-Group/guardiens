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
          Vous êtes sur le point de supprimer définitivement le compte de <strong>{userName}</strong>.
          Cette action est <strong>irréversible</strong> : toutes les données (profil, annonces, candidatures, messages) seront supprimées.
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
