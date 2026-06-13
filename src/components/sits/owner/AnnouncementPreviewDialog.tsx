/**
 * AnnouncementPreviewDialog
 * Aperçu de l'annonce avant publication.
 * Affiche un rendu proche de la page publique SitDetail pour rassurer
 * le propriétaire sur ce que verront les gardiens.
 */
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Calendar, MapPin, PawPrint, Home, Zap, Eye } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface PreviewPet {
  name: string;
  species: string;
  photo_url: string | null;
}

interface AnnouncementPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirmPublish: () => void;
  publishing: boolean;
  canPublish: boolean;
  title: string;
  startDate: string;
  endDate: string;
  flexibleDates: boolean;
  city: string;
  country: string;
  specificExpectations: string;
  ownerMessage: string;
  dailyRoutine: string;
  coverPhotoUrl: string | null;
  ownerPhotos: string[];
  pets: PreviewPet[];
  propertyType: string | null;
  environments: string[];
  isUrgent: boolean;
}

const speciesEmoji: Record<string, string> = {
  dog: "🐕", cat: "🐈", horse: "🐴", bird: "🐦",
  rodent: "🐹", fish: "🐠", reptile: "🦎",
  farm_animal: "🐄", nac: "🐾",
};

const typeLabels: Record<string, string> = {
  apartment: "Appartement", house: "Maison", farm: "Ferme", chalet: "Chalet", other: "Logement",
};

const formatDate = (d: string) => {
  if (!d) return "";
  try {
    return new Date(d).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
  } catch { return d; }
};

const AnnouncementPreviewDialog = ({
  open, onOpenChange, onConfirmPublish, publishing, canPublish,
  title, startDate, endDate, flexibleDates, city, country,
  specificExpectations, ownerMessage, dailyRoutine,
  coverPhotoUrl, ownerPhotos, pets, propertyType, environments, isUrgent,
}: AnnouncementPreviewDialogProps) => {
  const cover = coverPhotoUrl || ownerPhotos[0] || null;
  const gallery = ownerPhotos.filter(p => p !== cover).slice(0, 3);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5 text-primary" />
            Aperçu de votre annonce
          </DialogTitle>
          <DialogDescription>
            Voici exactement ce que verront les gardiens. Vous pouvez encore modifier ou publier.
          </DialogDescription>
        </DialogHeader>

        <article className="rounded-xl border border-border overflow-hidden bg-background">
          {cover ? (
            <div className="relative aspect-[16/9] bg-muted">
              <img src={cover} alt={title} className="w-full h-full object-cover" />
              {isUrgent && (
                <Badge className="absolute top-3 left-3 bg-destructive text-destructive-foreground gap-1">
                  <Zap className="h-3 w-3" /> Urgent
                </Badge>
              )}
            </div>
          ) : (
            <div className="aspect-[16/9] bg-muted flex items-center justify-center text-sm text-muted-foreground">
              Aucune photo de couverture
            </div>
          )}

          <div className="p-5 space-y-4">
            <div>
              <h2 className="font-heading text-2xl font-bold">{title || "Titre de l'annonce"}</h2>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-sm text-muted-foreground">
                {(city || country) && (
                  <span className="inline-flex items-center gap-1"><MapPin className="h-4 w-4" />{city}{city && country ? ", " : ""}{country}</span>
                )}
                {startDate && endDate && (
                  <span className="inline-flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    {formatDate(startDate)} → {formatDate(endDate)}
                    {flexibleDates && <span className="italic"> (flexibles)</span>}
                  </span>
                )}
              </div>
            </div>

            {gallery.length > 0 && (
              <div className="grid grid-cols-3 gap-2">
                {gallery.map((p, i) => (
                  <img key={i} src={p} alt={`Photo ${i + 1}`} className="aspect-square w-full object-cover rounded-md" />
                ))}
              </div>
            )}

            {propertyType && (
              <div className="flex items-center gap-2 text-sm">
                <Home className="h-4 w-4 text-primary" />
                <span className="font-medium">{typeLabels[propertyType] || propertyType}</span>
                {environments.length > 0 && (
                  <span className="text-muted-foreground">· {environments.join(", ")}</span>
                )}
              </div>
            )}

            {pets.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <PawPrint className="h-4 w-4 text-primary" />
                  <h3 className="font-heading text-sm font-semibold">Animaux à garder</h3>
                </div>
                <div className="flex flex-wrap gap-2">
                  {pets.map((p, i) => (
                    <span key={i} className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-accent text-sm">
                      <span>{speciesEmoji[p.species] || "🐾"}</span>
                      <span>{p.name}</span>
                    </span>
                  ))}
                </div>
              </div>
            )}

            {specificExpectations && (
              <section>
                <h3 className="font-heading text-sm font-semibold mb-1">Description</h3>
                <p className="text-sm whitespace-pre-wrap text-foreground/90">{specificExpectations}</p>
              </section>
            )}

            {dailyRoutine && (
              <section>
                <h3 className="font-heading text-sm font-semibold mb-1">Routine quotidienne</h3>
                <p className="text-sm whitespace-pre-wrap text-foreground/90">{dailyRoutine}</p>
              </section>
            )}

            {ownerMessage && (
              <section>
                <h3 className="font-heading text-sm font-semibold mb-1">Message aux gardiens</h3>
                <p className="text-sm whitespace-pre-wrap text-foreground/90 italic">"{ownerMessage}"</p>
              </section>
            )}
          </div>
        </article>

        <DialogFooter className="gap-2">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Continuer à modifier
          </Button>
          <Button
            type="button"
            onClick={onConfirmPublish}
            disabled={!canPublish || publishing}
          >
            {publishing ? "Publication…" : "Publier maintenant"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AnnouncementPreviewDialog;
