/**
 * Signal « texte avec animaux, fiche sans animaux » au moment de publier.
 *
 * Jamais bloquant (règle : src/lib/sitAnimalMention.ts, décision du
 * 20/08/2026). Une garde sans animaux est légitime : le propriétaire peut
 * ajouter ses animaux en un clic ou publier quand même. Fermer la fenêtre
 * sans choisir ramène au formulaire, rien n'est publié.
 */
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddPets: () => void;
  onPublishAnyway: () => void;
}

const AnimalMentionDialog = ({ open, onOpenChange, onAddPets, onPublishAnyway }: Props) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="sm:max-w-md">
      <DialogHeader>
        <DialogTitle className="font-heading text-lg">
          Votre texte parle d'animaux, votre fiche n'en contient aucun
        </DialogTitle>
        <DialogDescription className="text-sm">
          Une garde sans animaux est tout à fait possible. Si des animaux vivent bien chez vous,
          ajoutez-les à votre fiche : les gardiens sauront précisément qui ils garderont.
        </DialogDescription>
      </DialogHeader>
      <div className="flex flex-col gap-2 pt-2">
        <Button onClick={onAddPets}>Ajouter mes animaux</Button>
        <Button variant="outline" onClick={onPublishAnyway}>
          Publier quand même
        </Button>
      </div>
    </DialogContent>
  </Dialog>
);

export default AnimalMentionDialog;
