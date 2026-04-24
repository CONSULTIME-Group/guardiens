/**
 * HeroPickerModal
 * ----------------------------------------------------------------------------
 * Permet à un gardien de choisir manuellement son illustration de carnet
 * affichée en haut de son profil public.
 *
 * Fonctionnement :
 *   - Affiche les 100 illustrations de HERO_BANK en grille filtrable par thème.
 *   - Le choix est sauvegardé dans `profiles.hero_image_index` et prend le pas
 *     sur la sélection automatique par hash.
 *   - Une option "Sélection automatique" remet à NULL → retour au comportement
 *     actuel basé sur le hash + pondération admin.
 *
 * Design : reprend les codes visuels de TestHeroGallery (cards papier, badges
 * de catégorie, annotation manuscrite n°NNN) pour rester cohérent avec le
 * style "carnet de voyage" du reste de l'app.
 */
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, Check, RotateCcw, X, ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  HERO_BANK,
  getCategoryByBankIndex,
  type HeroCategoryName,
} from "@/lib/heroBank";
import { getMobileByIndex } from "@/lib/heroBankMobile";

const CATEGORY_LABELS: Record<HeroCategoryName, string> = {
  animals: "Animaux & plantes",
  home: "Maison",
  mutual_aid: "Entraide",
  village: "Village & partage",
};

const CATEGORY_COLORS: Record<HeroCategoryName, string> = {
  animals: "bg-emerald-100 text-emerald-900 border-emerald-200",
  home: "bg-amber-100 text-amber-900 border-amber-200",
  mutual_aid: "bg-rose-100 text-rose-900 border-rose-200",
  village: "bg-sky-100 text-sky-900 border-sky-200",
};

type CategoryFilter = "all" | HeroCategoryName;

export interface HeroPickerModalProps {
  /** Ouvert / fermé. */
  open: boolean;
  /** Callback de fermeture. */
  onClose: () => void;
  /** ID du gardien (auth.uid()). Doit correspondre au profil édité. */
  userId: string;
  /** Index actuellement choisi (NULL = sélection auto). */
  currentIndex: number | null;
  /** Callback appelé après une sauvegarde réussie avec le nouvel index. */
  onSaved: (newIndex: number | null) => void;
}

export function HeroPickerModal({
  open,
  onClose,
  userId,
  currentIndex,
  onSaved,
}: HeroPickerModalProps) {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState<CategoryFilter>("all");
  /** Index en cours de prévisualisation plein écran (null = pas d'aperçu). */
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);

  // Construit la liste indexée filtrée selon la catégorie sélectionnée.
  const items = HERO_BANK.map((src, idx) => ({
    idx,
    src,
    mobileSrc: getMobileByIndex(idx),
    category: getCategoryByBankIndex(idx),
  })).filter((it) => filter === "all" || it.category === filter);

  // Compteurs par catégorie pour les pills de filtre.
  const counts: Record<HeroCategoryName, number> = {
    animals: 0,
    home: 0,
    mutual_aid: 0,
    village: 0,
  };
  HERO_BANK.forEach((_, idx) => {
    counts[getCategoryByBankIndex(idx)]++;
  });

  async function handleSelect(newIndex: number | null) {
    if (saving) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ hero_image_index: newIndex })
        .eq("id", userId);

      if (error) throw error;

      toast({
        title: newIndex === null ? "Sélection automatique restaurée" : "Image mise à jour",
        description:
          newIndex === null
            ? "Votre image de profil suit à nouveau l'attribution automatique."
            : `L'image n°${String(newIndex + 1).padStart(3, "0")} est désormais affichée sur votre profil.`,
      });

      onSaved(newIndex);
      onClose();
    } catch (err) {
      console.error("Erreur sauvegarde hero_image_index:", err);
      toast({
        variant: "destructive",
        title: "Impossible d'enregistrer",
        description: "Veuillez réessayer dans un instant.",
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && !saving && onClose()}>
      <DialogContent className="max-w-5xl max-h-[90vh] flex flex-col p-0 gap-0">
        <DialogHeader className="px-6 pt-6 pb-3 border-b border-border">
          <DialogTitle>Choisir mon illustration de carnet</DialogTitle>
          <DialogDescription>
            Cette image apparaît en haut de votre profil public. Vous pouvez en changer
            quand vous voulez ou revenir à la sélection automatique.
          </DialogDescription>
        </DialogHeader>

        {/* Barre de filtres + reset */}
        <div className="px-6 py-3 border-b border-border flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => setFilter("all")}
            className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
              filter === "all"
                ? "bg-foreground text-background border-foreground"
                : "bg-card text-foreground border-border hover:bg-muted"
            }`}
          >
            Toutes ({HERO_BANK.length})
          </button>
          {(Object.keys(CATEGORY_LABELS) as HeroCategoryName[]).map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setFilter(cat)}
              className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                filter === cat
                  ? CATEGORY_COLORS[cat]
                  : "bg-card text-foreground border-border hover:bg-muted"
              }`}
            >
              {CATEGORY_LABELS[cat]} ({counts[cat]})
            </button>
          ))}

          <div className="ml-auto">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleSelect(null)}
              disabled={saving || currentIndex === null}
              title="Revenir à l'attribution automatique"
            >
              {saving ? (
                <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
              ) : (
                <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
              )}
              Sélection auto
            </Button>
          </div>
        </div>

        {/* Grille des illustrations */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {items.map((it) => {
              const isSelected = currentIndex === it.idx;
              return (
                <button
                  key={it.idx}
                  type="button"
                  onClick={() => handleSelect(it.idx)}
                  disabled={saving}
                  className={`relative block w-full text-left rounded-md overflow-hidden border-2 transition-all bg-[#FBF6EC] focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50 disabled:cursor-wait ${
                    isSelected
                      ? "border-primary ring-2 ring-primary/30"
                      : "border-border hover:border-foreground/30"
                  }`}
                  style={{ aspectRatio: "1536 / 544" }}
                  title={`Illustration n°${String(it.idx + 1).padStart(3, "0")} — ${CATEGORY_LABELS[it.category]}`}
                >
                  <img
                    src={it.src}
                    srcSet={it.mobileSrc ? `${it.mobileSrc} 768w, ${it.src} 1536w` : undefined}
                    sizes="(max-width: 639px) 50vw, 25vw"
                    alt={`Illustration ${it.idx + 1} — ${CATEGORY_LABELS[it.category]}`}
                    loading="lazy"
                    decoding="async"
                    className="w-full h-full object-contain"
                  />

                  {/* Annotation manuscrite n°NNN */}
                  <span
                    className="absolute top-1 left-2 text-[13px] font-bold tracking-wide select-none pointer-events-none"
                    style={{
                      fontFamily:
                        '"Caveat", "Kalam", "Bradley Hand", "Segoe Print", "Comic Sans MS", cursive',
                      color: "hsl(220 70% 35%)",
                      textShadow: "0 1px 0 hsl(0 0% 100% / 0.6)",
                      transform: "rotate(-4deg)",
                      transformOrigin: "left center",
                    }}
                  >
                    n° {String(it.idx + 1).padStart(3, "0")}
                  </span>

                  {/* Indicateur de sélection */}
                  {isSelected && (
                    <span className="absolute top-1.5 right-1.5 inline-flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground shadow-md">
                      <Check className="w-4 h-4" />
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {items.length === 0 && (
            <p className="text-center text-muted-foreground py-12 text-sm">
              Aucune illustration dans ce thème.
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
