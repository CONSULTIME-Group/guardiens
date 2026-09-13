/**
 * Confirmation affichée quand le logement rattaché à l'annonce porte moins de
 * trois photos. Jamais bloquante : « Publier ainsi » publie sans autre
 * question, « Ajouter des photos » ramène à l'étape photos du logement.
 */
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  PUBLISH_PHOTO_PROMPT_ADD_LABEL,
  PUBLISH_PHOTO_PROMPT_ANYWAY_LABEL,
  PUBLISH_PHOTO_PROMPT_BODY,
  PUBLISH_PHOTO_PROMPT_SURROUNDINGS,
  publishPhotoPromptTitle,
} from "@/lib/publishPhotoPrompt";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  photoCount: number;
  showSurroundings: boolean;
  onAddPhotos: () => void;
  onPublishAnyway: () => void;
}

const PublishPhotoPromptDialog = ({
  open,
  onOpenChange,
  photoCount,
  showSurroundings,
  onAddPhotos,
  onPublishAnyway,
}: Props) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="sm:max-w-md" data-testid="publish-photo-prompt">
      <DialogHeader>
        <DialogTitle className="font-heading text-lg">
          {publishPhotoPromptTitle(photoCount)}
        </DialogTitle>
        <DialogDescription className="text-sm">
          {PUBLISH_PHOTO_PROMPT_BODY}
        </DialogDescription>
      </DialogHeader>
      {showSurroundings && (
        <p className="text-sm text-muted-foreground">{PUBLISH_PHOTO_PROMPT_SURROUNDINGS}</p>
      )}
      <div className="flex flex-col gap-2 pt-2">
        <Button className="min-h-[44px]" onClick={onAddPhotos}>
          {PUBLISH_PHOTO_PROMPT_ADD_LABEL}
        </Button>
        <Button variant="outline" className="min-h-[44px]" onClick={onPublishAnyway}>
          {PUBLISH_PHOTO_PROMPT_ANYWAY_LABEL}
        </Button>
      </div>
    </DialogContent>
  </Dialog>
);

export default PublishPhotoPromptDialog;
