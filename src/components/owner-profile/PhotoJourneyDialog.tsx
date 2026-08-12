import { useEffect, useMemo, useRef, useState } from "react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { UploadCloud, Check, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { uploadOwnerPhoto } from "@/lib/uploadOwnerPhoto";
import {
  PHOTO_JOURNEY_INTRO,
  getPhotoJourneySteps,
  photoJourneyProgress,
} from "@/lib/photoJourney";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  /** Position de départ dans la galerie. */
  startPosition?: number;
  /** Appelé après chaque photo envoyée, pour rafraîchir la galerie. */
  onPhotoAdded?: () => void;
}

/**
 * Parcours photo guidé, cinq écrans, une photo par écran.
 * Facultatif de bout en bout : sortie et passage possibles à chaque écran.
 */
const PhotoJourneyDialog = ({ open, onOpenChange, userId, startPosition = 0, onPhotoAdded }: Props) => {
  const [hasPets, setHasPets] = useState(false);
  const [phase, setPhase] = useState<"intro" | "steps" | "done">("intro");
  const [index, setIndex] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [addedCount, setAddedCount] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const steps = useMemo(() => getPhotoJourneySteps(hasPets), [hasPets]);
  const step = steps[index];

  useEffect(() => {
    if (!open) return;
    setPhase("intro");
    setIndex(0);
    setAddedCount(0);
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("properties")
        .select("id, pets(id)")
        .eq("user_id", userId);
      const total = (data ?? []).reduce(
        (n, p: { pets?: unknown[] | null }) => n + (p.pets?.length ?? 0),
        0,
      );
      if (!cancelled) setHasPets(total > 0);
    })();
    return () => { cancelled = true; };
  }, [open, userId]);

  const advance = () => {
    if (index + 1 >= steps.length) setPhase("done");
    else setIndex((i) => i + 1);
  };

  const handleFile = async (file: File) => {
    if (!step) return;
    setUploading(true);
    try {
      await uploadOwnerPhoto({
        userId,
        file,
        category: step.category,
        caption: step.caption,
        position: startPosition + addedCount,
      });
      setAddedCount((c) => c + 1);
      onPhotoAdded?.();
      window.dispatchEvent(new Event("owner-gallery:changed"));
      advance();
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Réessaie dans un instant.";
      toast.error("Photo non ajoutée", { description: message });
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        {phase === "intro" && (
          <div className="space-y-5">
            <DialogTitle className="font-heading text-2xl">Cinq photos, cinq minutes</DialogTitle>
            <DialogDescription className="text-base leading-relaxed text-foreground">
              {PHOTO_JOURNEY_INTRO}
            </DialogDescription>
            <p className="text-sm text-muted-foreground">
              Rien n'est obligatoire ici. Tu peux passer un écran ou sortir quand tu veux.
            </p>
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button variant="ghost" className="min-h-11" onClick={() => onOpenChange(false)}>
                Plus tard
              </Button>
              <Button className="min-h-11" onClick={() => setPhase("steps")}>
                Commencer
              </Button>
            </div>
          </div>
        )}

        {phase === "steps" && step && (
          <div className="space-y-5">
            <div className="space-y-2">
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                Photo {index + 1} sur {steps.length}
              </p>
              <Progress value={photoJourneyProgress(index, steps.length)} className="h-1.5" />
            </div>

            <div className="space-y-2">
              <DialogTitle className="font-heading text-2xl">{step.title}</DialogTitle>
              <DialogDescription className="text-base text-foreground">{step.why}</DialogDescription>
              <p className="text-sm text-muted-foreground">{step.hint}</p>
            </div>

            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void handleFile(f);
              }}
            />

            <Button
              type="button"
              className="w-full min-h-12 gap-2"
              disabled={uploading}
              onClick={() => inputRef.current?.click()}
            >
              <UploadCloud className="h-4 w-4" aria-hidden="true" />
              {uploading ? "Envoi en cours…" : "Choisir cette photo"}
            </Button>

            <div className="flex items-center justify-between">
              <Button variant="ghost" className="min-h-11" disabled={uploading} onClick={advance}>
                Passer cet écran
              </Button>
              <Button variant="ghost" className="min-h-11 gap-2" disabled={uploading} onClick={() => onOpenChange(false)}>
                <X className="h-4 w-4" aria-hidden="true" />
                Sortir
              </Button>
            </div>
          </div>
        )}

        {phase === "done" && (
          <div className="space-y-5 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <Check className="h-6 w-6 text-primary" aria-hidden="true" />
            </div>
            <DialogTitle className="font-heading text-2xl">
              {addedCount > 0 ? "C'est en ligne" : "Parcours terminé"}
            </DialogTitle>
            <DialogDescription className="text-base text-foreground">
              {addedCount > 0
                ? `${addedCount} photo${addedCount > 1 ? "s" : ""} rejoignent ta galerie et tes annonces. Tu peux les réordonner à tout moment.`
                : "Aucune photo ajoutée. Tu peux revenir quand tu veux, rien n'est bloqué."}
            </DialogDescription>
            <Button className="w-full min-h-12" onClick={() => onOpenChange(false)}>
              Fermer
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default PhotoJourneyDialog;
