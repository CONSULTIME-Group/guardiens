/**
 * SitPhotoManager, gestion intégrée des photos & couverture sur la fiche annonce owner.
 *
 * Périmètre :
 *  - Affiche les photos de la galerie propriétaire (`owner_gallery`).
 *  - Permet de définir la photo de couverture de CETTE annonce (sit.cover_photo_url).
 *    Cette photo est utilisée dans les listes / résultats de recherche / partage.
 *  - Permet d'uploader de nouvelles photos directement depuis la fiche
 *    (compression + bucket property-photos + insert owner_gallery).
 *  - Lien direct vers la galerie complète pour réorganiser / supprimer en masse.
 *
 * Source de vérité = `owner_gallery`. Le hero immersif `SitImmersiveContent`
 * reste branché sur `property.photos` (autre bataille).
 */
import { useState } from "react";
import { Link } from "react-router-dom";
import { Image as ImageIcon, Plus, Loader2, Star, Check, Sparkles, Info } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { compressImageFile } from "@/lib/compressImage";
import { getImageDimensions } from "@/lib/imageDimensions";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface GalleryPhoto {
  id: string;
  photo_url: string;
}

interface SitPhotoManagerProps {
  sitId: string;
  ownerId: string;
  initialCoverPhotoUrl: string | null;
  initialGallery: GalleryPhoto[];
  /** Notifié quand la couverture change pour resync du parent. */
  onCoverChange?: (url: string | null) => void;
}

const SitPhotoManager = ({
  sitId,
  ownerId,
  initialCoverPhotoUrl,
  initialGallery,
  onCoverChange,
}: SitPhotoManagerProps) => {
  const { toast } = useToast();
  const [gallery, setGallery] = useState<GalleryPhoto[]>(initialGallery);
  const [coverUrl, setCoverUrl] = useState<string | null>(initialCoverPhotoUrl);
  const [savingCover, setSavingCover] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [suggesting, setSuggesting] = useState(false);
  const [suggestion, setSuggestion] = useState<{ url: string; score: number; summary: string } | null>(null);

  const effectiveCover = coverUrl || gallery[0]?.photo_url || null;

  // Debounce & cache pour éviter la sur-consommation Gemini :
  // - Session (window) : scores par URL, gardés tant que l'onglet vit.
  // - localStorage : meilleur résultat par sit, TTL 24h, invalidé si la galerie change.
  const SESSION_SCORES_KEY = `__sitPhotoScores_${sitId}`;
  const PERSIST_KEY = `sitPhotoSuggest:${sitId}`;
  const TTL_MS = 24 * 60 * 60 * 1000;

  type Scored = { url: string; score: number; summary: string };

  const getGalleryFingerprint = () =>
    gallery.map((p) => p.photo_url).sort().join("|");

  const readPersisted = (): { fingerprint: string; at: number; best: Scored } | null => {
    try {
      const raw = localStorage.getItem(PERSIST_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!parsed?.at || Date.now() - parsed.at > TTL_MS) return null;
      return parsed;
    } catch {
      return null;
    }
  };

  const writePersisted = (best: Scored) => {
    try {
      localStorage.setItem(
        PERSIST_KEY,
        JSON.stringify({ fingerprint: getGalleryFingerprint(), at: Date.now(), best }),
      );
    } catch {
      // quota / private mode : silencieux
    }
  };

  const getSessionScores = (): Map<string, Scored> => {
    const w = window as any;
    if (!w[SESSION_SCORES_KEY]) w[SESSION_SCORES_KEY] = new Map<string, Scored>();
    return w[SESSION_SCORES_KEY];
  };

  const handleSuggestBest = async () => {
    if (suggesting || gallery.length === 0) return;

    const fingerprint = getGalleryFingerprint();

    // 1) Cache persistant 24h, valable si la galerie n'a pas changé
    const persisted = readPersisted();
    if (persisted && persisted.fingerprint === fingerprint) {
      if (persisted.best.url === effectiveCover) {
        toast({
          title: "Votre couverture est déjà la meilleure",
          description: `Score : ${persisted.best.score}/100 (analyse récente).`,
        });
        return;
      }
      setSuggestion(persisted.best);
      return;
    }

    setSuggesting(true);
    setSuggestion(null);
    try {
      // Cap client : on ne soumet que les URLs non encore en cache session.
      // Le backend re-cappe à MAX_PER_CALL (6) de toute façon.
      const CLIENT_CAP = 6;
      const sessionScores = getSessionScores();
      const sample = gallery.slice(0, CLIENT_CAP);
      const toAnalyze = sample.filter((p) => !sessionScores.get(p.photo_url));

      let fresh: Scored[] = [];
      if (toAnalyze.length > 0) {
        const { data, error } = await supabase.functions.invoke("analyze-photo-quality", {
          body: { imageUrls: toAnalyze.map((p) => p.photo_url) },
        });
        if (error) {
          const ctx: any = (error as any).context;
          const code = ctx?.code ?? (data as any)?.code;
          if (code === "DAILY_QUOTA_REACHED") {
            toast({
              variant: "destructive",
              title: "Quota d'analyses atteint",
              description:
                "Vous avez atteint le nombre d'analyses IA autorisées aujourd'hui. Revenez demain.",
            });
            return;
          }
          if (code === "AI_RATE_LIMITED") {
            toast({
              variant: "destructive",
              title: "Service IA saturé",
              description: "Réessayez dans quelques instants.",
            });
            return;
          }
          throw error;
        }
        const arr = Array.isArray((data as any)?.results) ? (data as any).results : [];
        fresh = arr
          .filter((r: any) => r && typeof r.score === "number")
          .map((r: any) => ({ url: r.url, score: r.score, summary: r.summary }));
        for (const r of fresh) sessionScores.set(r.url, r);
      }

      const scored: Scored[] = sample
        .map((p) => sessionScores.get(p.photo_url))
        .filter((r): r is Scored => !!r);

      if (scored.length === 0) {
        toast({
          variant: "destructive",
          title: "Analyse indisponible",
          description: "Impossible d'analyser vos photos pour le moment.",
        });
        return;
      }
      scored.sort((a, b) => b.score - a.score);
      const best = scored[0];
      writePersisted(best);
      if (best.url === effectiveCover) {
        toast({
          title: "Votre couverture est déjà la meilleure",
          description: `Score qualité : ${best.score}/100.`,
        });
        return;
      }
      setSuggestion(best);
    } finally {
      setSuggesting(false);
    }
  };

  const applySuggestion = async () => {
    if (!suggestion) return;
    await handleSetCover(suggestion.url);
    setSuggestion(null);
  };

  const handleSetCover = async (url: string) => {
    if (savingCover) return;
    const previous = coverUrl;
    setCoverUrl(url);
    setSavingCover(url);
    const { error } = await supabase
      .from("sits")
      .update({ cover_photo_url: url } as any)
      .eq("id", sitId)
      .eq("user_id", ownerId);
    setSavingCover(null);
    if (error) {
      setCoverUrl(previous);
      toast({
        variant: "destructive",
        title: "Couverture non enregistrée",
        description: "Réessayez dans un instant.",
      });
      return;
    }
    onCoverChange?.(url);
    toast({ title: "Photo de couverture mise à jour" });
  };

  const handleUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    if (gallery.length + files.length > 30) {
      toast({
        variant: "destructive",
        title: "Limite atteinte",
        description: "Votre galerie ne peut pas dépasser 30 photos.",
      });
      return;
    }
    setUploading(true);
    const inserted: GalleryPhoto[] = [];
    try {
      for (const file of Array.from(files)) {
        try {
          const compressed = await compressImageFile(file, 5, 1200);
          const dims = await getImageDimensions(compressed);
          const ext = (compressed.type.split("/")[1] || "jpg").replace("jpeg", "jpg");
          const path = `${ownerId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
          const { error: upErr } = await supabase.storage
            .from("property-photos")
            .upload(path, compressed);
          if (upErr) throw upErr;
          const { data: urlData } = supabase.storage.from("property-photos").getPublicUrl(path);
          const photo_url = urlData.publicUrl;

          const nextPosition = gallery.length + inserted.length;
          const { data: row, error: insErr } = await supabase
            .from("owner_gallery")
            .insert({
              user_id: ownerId,
              photo_url,
              position: nextPosition,
              width: dims.width || null,
              height: dims.height || null,
            } as any)
            .select("id, photo_url")
            .single();
          if (insErr) throw insErr;
          inserted.push(row as GalleryPhoto);
        } catch {
          // continue with the rest
        }
      }
      if (inserted.length > 0) {
        setGallery((prev) => [...prev, ...inserted]);
        toast({
          title: `${inserted.length} photo${inserted.length > 1 ? "s" : ""} ajoutée${inserted.length > 1 ? "s" : ""}`,
          description: "Cliquez sur une photo pour en faire la couverture de l'annonce.",
        });
      }
    } finally {
      setUploading(false);
    }
  };

  return (
    <section
      aria-labelledby="sit-photo-manager-title"
      className="mb-6 rounded-2xl border border-border bg-card p-5 md:p-6"
    >
      <div className="flex flex-wrap items-start justify-between gap-3 mb-2">
        <div>
          <h2
            id="sit-photo-manager-title"
            className="text-lg font-semibold flex items-center gap-2"
          >
            <ImageIcon className="h-5 w-5 text-primary" /> Photos & couverture
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            La photo de couverture apparaît dans les résultats de recherche et lors d'un partage.
            Cliquez sur une photo pour la définir comme couverture.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {gallery.length >= 2 && (
            <div className="inline-flex items-center gap-1">
              <button
                type="button"
                onClick={handleSuggestBest}
                disabled={suggesting}
                aria-describedby="suggest-best-rgpd"
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-md border border-primary/30 bg-primary/5 text-primary px-3 py-1.5 text-sm font-medium hover:bg-primary/10 transition-colors",
                  suggesting && "opacity-60 pointer-events-none"
                )}
              >
                {suggesting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Analyse…
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" /> Suggérer la meilleure
                  </>
                )}
              </button>
              <TooltipProvider delayDuration={150}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      aria-label="Informations sur l'analyse IA des photos"
                      className="inline-flex items-center justify-center h-7 w-7 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                    >
                      <Info className="h-3.5 w-3.5" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="max-w-xs text-xs leading-relaxed">
                    <p id="suggest-best-rgpd">
                      En cliquant sur « Suggérer la meilleure », vos photos sont envoyées à un
                      modèle d'IA partenaire (Google Gemini, via la passerelle Lovable AI) pour
                      analyser leur pertinence comme couverture d'annonce. Aucune photo n'est
                      conservée par le modèle. Vous restez seul décisionnaire de la photo
                      retenue.
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          )}
          <label className="inline-flex">
            <input
              type="file"
              multiple
              accept="image/*"
              className="sr-only"
              disabled={uploading}
              onChange={(e) => {
                handleUpload(e.target.files);
                e.target.value = "";
              }}
            />
            <span
              className={cn(
                "inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-3 py-1.5 text-sm font-medium cursor-pointer hover:bg-accent transition-colors",
                uploading && "opacity-60 pointer-events-none",
              )}
            >
              {uploading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Envoi…
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4" /> Ajouter des photos
                </>
              )}
            </span>
          </label>
        </div>
      </div>

      {suggestion && (
        <div className="mb-4 rounded-xl border border-primary/30 bg-primary/5 p-3 flex flex-wrap items-center gap-3">
          <img
            src={suggestion.url}
            alt=""
            className="h-16 w-20 rounded-md object-cover border border-border"
          />
          <div className="flex-1 min-w-[200px]">
            <p className="text-sm font-medium text-foreground">
              Couverture suggérée, score qualité {suggestion.score}/100
            </p>
            <p className="text-xs text-muted-foreground">{suggestion.summary}</p>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={() => setSuggestion(null)}>
              Ignorer
            </Button>
            <Button size="sm" onClick={applySuggestion} disabled={!!savingCover}>
              Appliquer
            </Button>
          </div>
        </div>
      )}

      {gallery.length === 0 ? (
        <div className="mt-4 rounded-xl border border-dashed border-border bg-muted/30 p-6 text-center">
          <p className="text-sm text-foreground font-medium mb-1">
            Aucune photo dans votre galerie
          </p>
          <p className="text-xs text-muted-foreground mb-4">
            Une annonce avec photos reçoit en moyenne plus de candidatures.
          </p>
          <label className="inline-flex">
            <input
              type="file"
              multiple
              accept="image/*"
              className="sr-only"
              onChange={(e) => {
                handleUpload(e.target.files);
                e.target.value = "";
              }}
            />
            <span className="inline-flex items-center gap-1.5 rounded-md bg-primary text-primary-foreground px-3 py-1.5 text-sm font-medium cursor-pointer hover:bg-primary/90">
              <Plus className="h-4 w-4" /> Ajouter mes premières photos
            </span>
          </label>
        </div>
      ) : (
        <div className="mt-4 grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
          {gallery.map((p) => {
            const isCover = effectiveCover === p.photo_url;
            const isSaving = savingCover === p.photo_url;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => handleSetCover(p.photo_url)}
                disabled={isSaving}
                aria-label={
                  isCover
                    ? "Photo de couverture actuelle"
                    : "Définir comme photo de couverture"
                }
                aria-pressed={isCover}
                className={cn(
                  "group relative aspect-[4/3] w-full overflow-hidden rounded-lg border-2 transition-all",
                  isCover
                    ? "border-primary ring-2 ring-primary/30"
                    : "border-transparent hover:border-primary/50",
                )}
              >
                <img
                  src={p.photo_url}
                  alt=""
                  loading="lazy"
                  className="w-full h-full object-cover"
                />
                {isCover && (
                  <span className="absolute bottom-0 inset-x-0 bg-primary text-primary-foreground text-[10px] font-medium py-0.5 px-1 flex items-center justify-center gap-1">
                    <Star className="h-3 w-3 fill-current" /> Couverture
                  </span>
                )}
                {!isCover && (
                  <span className="absolute inset-0 bg-foreground/0 group-hover:bg-foreground/30 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                    <span className="bg-background text-foreground text-[10px] font-medium px-2 py-1 rounded-full shadow flex items-center gap-1">
                      <Check className="h-3 w-3" /> Définir
                    </span>
                  </span>
                )}
                {isSaving && (
                  <span className="absolute inset-0 bg-background/60 flex items-center justify-center">
                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
        <span>
          {gallery.length} / 30 photo{gallery.length > 1 ? "s" : ""} dans votre galerie
        </span>
        <Link
          to={`/owner-profile?from=sit:${sitId}#galerie`}
          className="text-primary hover:underline"
        >
          Réorganiser ou supprimer mes photos →
        </Link>
      </div>
    </section>
  );
};

export default SitPhotoManager;
