/**
 * Sélecteur administrateur de photo de couverture d'une annonce.
 *
 * Le choix effectué ici est un choix explicite : il est écrit dans
 * `sits.cover_photo_url` et prime donc sur la règle de priorité automatique
 * (celle-ci ne s'applique qu'en l'absence de valeur enregistrée).
 */
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Loader2 } from "lucide-react";
import { toast } from "sonner";

export const GALLERY_CATEGORY_LABELS: Record<string, string> = {
  home_life: "Vie à la maison",
  garden: "Jardin",
  neighborhood: "Voisinage",
  seasonal: "Saison",
  animals_life: "Vie des animaux",
};

export const categoryLabel = (category?: string | null): string =>
  GALLERY_CATEGORY_LABELS[(category ?? "") as string] || "Photo";

type Candidate = {
  url: string;
  label: string;
  source: "gallery" | "pet";
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sitId: string | null;
  sitTitle: string | null;
  ownerId: string | null;
  propertyId: string | null;
  currentCover: string | null;
  onSaved?: (sitId: string, coverUrl: string | null) => void;
};

const ListingCoverPickerDialog = ({
  open,
  onOpenChange,
  sitId,
  sitTitle,
  ownerId,
  propertyId,
  currentCover,
  onSaved,
}: Props) => {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState<string | null>(null);
  const [gallery, setGallery] = useState<Candidate[]>([]);
  const [petPhotos, setPetPhotos] = useState<Candidate[]>([]);
  const [cover, setCover] = useState<string | null>(currentCover);

  useEffect(() => {
    setCover(currentCover);
  }, [currentCover, sitId]);

  const load = useCallback(async () => {
    if (!open || !sitId) return;
    setLoading(true);
    const [galleryRes, petsRes] = await Promise.all([
      ownerId
        ? supabase
            .from("owner_gallery")
            .select("photo_url, category, position")
            .eq("user_id", ownerId)
            .order("position", { ascending: true })
        : Promise.resolve({ data: [], error: null } as any),
      propertyId
        ? supabase.from("pets").select("photo_url, name").eq("property_id", propertyId)
        : Promise.resolve({ data: [], error: null } as any),
    ]);

    setGallery(
      ((galleryRes.data as any[]) || [])
        .filter((p) => !!p?.photo_url)
        .map((p) => ({ url: p.photo_url as string, label: categoryLabel(p.category), source: "gallery" as const })),
    );
    setPetPhotos(
      ((petsRes.data as any[]) || [])
        .filter((p) => !!p?.photo_url)
        .map((p) => ({
          url: p.photo_url as string,
          label: p.name ? `Animal (${p.name})` : "Animal",
          source: "pet" as const,
        })),
    );
    setLoading(false);
  }, [open, sitId, ownerId, propertyId]);

  useEffect(() => {
    void load();
  }, [load]);

  const apply = async (url: string | null) => {
    if (!sitId) return;
    setSaving(url ?? "__none__");
    const { error } = await supabase.from("sits").update({ cover_photo_url: url } as any).eq("id", sitId);
    setSaving(null);
    if (error) {
      toast.error("La couverture n'a pas pu être enregistrée.");
      return;
    }
    setCover(url);
    onSaved?.(sitId, url);
    toast.success(url ? "Photo de couverture mise à jour." : "Photo de couverture retirée.");
  };

  const total = gallery.length + petPhotos.length;

  const renderGrid = (items: Candidate[]) => (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
      {items.map((item) => {
        const selected = cover === item.url;
        const busy = saving === item.url;
        return (
          <button
            key={item.url}
            type="button"
            onClick={() => apply(item.url)}
            disabled={!!saving}
            aria-pressed={selected}
            className={`group relative rounded-lg overflow-hidden border text-left transition ${
              selected ? "border-primary ring-2 ring-primary" : "border-border hover:border-primary/50"
            }`}
          >
            <img src={item.url} alt={item.label} loading="lazy" className="w-full aspect-[4/3] object-cover" />
            {selected && (
              <span className="absolute top-2 right-2 rounded-full bg-primary text-primary-foreground p-1">
                <Check className="h-3.5 w-3.5" />
              </span>
            )}
            {busy && (
              <span className="absolute inset-0 grid place-items-center bg-background/60">
                <Loader2 className="h-5 w-5 animate-spin" />
              </span>
            )}
            <span className="block px-2 py-1.5 text-xs text-muted-foreground truncate">{item.label}</span>
          </button>
        );
      })}
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Photo de couverture</DialogTitle>
          <DialogDescription>
            {sitTitle ? `Annonce « ${sitTitle} ». ` : ""}
            Choisissez la photo affichée en couverture. Ce choix est explicite, il ne sera pas remplacé par la règle
            automatique.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="py-10 text-center text-muted-foreground text-sm">Chargement des photos…</div>
        ) : total === 0 ? (
          <div className="py-10 text-center text-muted-foreground text-sm">
            Aucune photo disponible pour cette annonce, le propriétaire n'a pas encore alimenté sa galerie.
          </div>
        ) : (
          <div className="space-y-6">
            <section className="space-y-3">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-medium">Galerie du propriétaire</h3>
                <Badge variant="outline">{gallery.length}</Badge>
              </div>
              {gallery.length > 0 ? (
                renderGrid(gallery)
              ) : (
                <p className="text-sm text-muted-foreground">Aucune photo de galerie pour ce propriétaire.</p>
              )}
            </section>

            <section className="space-y-3">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-medium">Photos des animaux</h3>
                <Badge variant="outline">{petPhotos.length}</Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                À réserver aux cas où aucune photo de lieu n'est disponible.
              </p>
              {petPhotos.length > 0 ? (
                renderGrid(petPhotos)
              ) : (
                <p className="text-sm text-muted-foreground">Aucune photo d'animal pour cette annonce.</p>
              )}
            </section>
          </div>
        )}

        <div className="flex items-center justify-between gap-3 pt-2 border-t">
          <p className="text-xs text-muted-foreground">
            {cover ? "Une couverture est définie." : "Aucune couverture définie, la règle automatique s'applique."}
          </p>
          <Button variant="outline" size="sm" onClick={() => apply(null)} disabled={!cover || !!saving}>
            Retirer la couverture
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ListingCoverPickerDialog;
