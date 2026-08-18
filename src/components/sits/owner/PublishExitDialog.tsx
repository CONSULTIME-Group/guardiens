/**
 * Écran de choix à la sortie du formulaire de création d'annonce.
 *
 * Décision produit du 18/08/2026 : quand l'annonce remplit tous les critères
 * de publication et que le propriétaire s'apprête à quitter sans publier, on
 * ne force pas la publication, on force le choix. « Garder en brouillon » est
 * une issue légitime, assortie d'une question facultative à un clic dont la
 * réponse éclaire les brouillons dormants côté admin.
 *
 * Fermer la fenêtre sans choisir (croix, clic à l'extérieur) ramène au
 * formulaire : quitter exige un choix explicite.
 */
import { useEffect, useState } from "react";
import { Send, FileEdit } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { DRAFT_HOLD_REASONS, type DraftHoldReason } from "@/lib/draftHoldReasons";

interface Props {
  open: boolean;
  publishing: boolean;
  onOpenChange: (open: boolean) => void;
  onPublishNow: () => void;
  onKeepDraft: (reason: DraftHoldReason | null) => void;
}

const PublishExitDialog = ({ open, publishing, onOpenChange, onPublishNow, onKeepDraft }: Props) => {
  const [step, setStep] = useState<"choice" | "reason">("choice");

  // Chaque ouverture repart sur le choix, jamais sur la question.
  useEffect(() => {
    if (open) setStep("choice");
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        {step === "choice" ? (
          <>
            <DialogHeader>
              <DialogTitle className="font-heading text-lg">
                Votre annonce est prête. Elle n'est pas encore en ligne.
              </DialogTitle>
              <DialogDescription className="text-sm">
                Tous les éléments sont remplis. Tant qu'elle reste en brouillon, votre annonce
                n'apparaît pas dans la recherche et les gardiens ne peuvent pas candidater.
              </DialogDescription>
            </DialogHeader>
            <div className="flex flex-col gap-2 pt-2">
              <Button onClick={onPublishNow} disabled={publishing} className="gap-2">
                <Send className="h-4 w-4" aria-hidden="true" />
                {publishing ? "Publication…" : "Publier maintenant"}
              </Button>
              <Button variant="outline" onClick={() => setStep("reason")} className="gap-2">
                <FileEdit className="h-4 w-4" aria-hidden="true" />
                Garder en brouillon
              </Button>
            </div>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="font-heading text-lg">
                Pourquoi garder cette annonce en brouillon ?
              </DialogTitle>
              <DialogDescription className="text-sm">
                Une réponse en un clic, facultative. Elle nous aide à mieux comprendre les
                brouillons qui attendent.
              </DialogDescription>
            </DialogHeader>
            <div className="flex flex-col gap-2 pt-2">
              {DRAFT_HOLD_REASONS.map((reason) => (
                <Button
                  key={reason.id}
                  variant="outline"
                  className="justify-start"
                  onClick={() => onKeepDraft(reason.id)}
                >
                  {reason.label}
                </Button>
              ))}
              <Button
                variant="ghost"
                className="text-muted-foreground"
                onClick={() => onKeepDraft(null)}
              >
                Passer cette question
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default PublishExitDialog;
