/**
 * Confirmation affichée quand le logement rattaché à l'annonce porte moins de
 * trois photos, ou trois photos sans que le logement y soit visible (lot
 * PHOTO1). Jamais bloquante : « Publier ainsi » publie sans autre question,
 * « Ajouter des photos » ramène à l'ajout de photos.
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
  PUBLISH_PHOTO_PROMPT_TIPS,
  publishPhotoPromptTitle,
} from "@/lib/publishPhotoPrompt";
import type { HomePhotoGap } from "@/lib/homePhotos";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  photoCount: number;
  /** Ce qui manque ; sans valeur, le titre suit le nombre de photos. */
  gap?: HomePhotoGap;
  onAddPhotos: () => void;
  onPublishAnyway: () => void;
}

const PublishPhotoPromptDialog = ({
  open,
  onOpenChange,
  photoCount,
  gap,
  onAddPhotos,
  onPublishAnyway,
}: Props) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="sm:max-w-md" data-testid="publish-photo-prompt">
      <DialogHeader>
        <DialogTitle className="font-heading text-lg">
          {publishPhotoPromptTitle(photoCount, gap)}
        </DialogTitle>
        <DialogDescription className="text-sm">
          {PUBLISH_PHOTO_PROMPT_BODY}
        </DialogDescription>
      </DialogHeader>
      <p className="text-center text-sm text-muted-foreground sm:text-left">{PUBLISH_PHOTO_PROMPT_TIPS}</p>
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
