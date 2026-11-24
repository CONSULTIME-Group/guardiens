/**
 * Alma Pass 2, Chantier 1
 * Bulle dédiée au guide maison génératif : propose à l'owner de générer 2 trames
 * (précisions WiFi, repères du quartier). Au clic, appelle `generate-house-guide`
 * et remonte les trames au parent via `onDrafts`, qui pré-remplit les seuls
 * champs encore vides avec un badge "Brouillon Alma, à personnaliser" et rend
 * le nombre de sections remplies (lot GUIDE1, 22/11/2026).
 */
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";
import { trackEvent } from "@/lib/analytics";
import { toast } from "sonner";
import { AlmaBubble } from "./AlmaBubble";

export interface HouseGuideDrafts {
  wifi_info: string;
  neighborhood: string;
}

interface Props {
  onDrafts: (drafts: HouseGuideDrafts) => number;
  className?: string;
}

export function AlmaHouseGuideAssist({ onDrafts, className }: Props) {
  const [loading, setLoading] = useState(false);
  const [generated, setGenerated] = useState(false);
  const [filled, setFilled] = useState(0);
  const [dismissed, setDismissed] = useState(false);

  // trace impression une seule fois
  if (typeof window !== "undefined" && !(window as any).__almaHouseGuideSeen) {
    (window as any).__almaHouseGuideSeen = true;
    void trackEvent("alma_house_guide_bubble_seen");
  }

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-house-guide", { body: {} });
      if (error) throw error;
      const raw = (data as any)?.drafts as Partial<HouseGuideDrafts> | undefined;
      if (!raw) throw new Error("Réponse Alma vide");
      // Seules les deux trames de texte libre sont transmises au formulaire.
      const drafts: HouseGuideDrafts = { wifi_info: raw.wifi_info ?? "", neighborhood: raw.neighborhood ?? "" };
      const filledCount = onDrafts(drafts);
      setGenerated(true);
      setFilled(filledCount);
      void trackEvent("alma_house_guide_generated", { metadata: { sections_filled: filledCount } });
      if (filledCount > 0) {
        toast.success("Trames Alma pré-remplies. Relisez et personnalisez chaque section.");
      } else {
        toast.info("Vos sections WiFi et Instructions générales sont déjà remplies : vos textes restent en place.");
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Alma n'a pas pu générer les trames.";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  if (dismissed) return null;

  return (
    <AlmaBubble
      audience="owner"
      variant="dashboard"
      loading={loading}
      onDismiss={() => setDismissed(true)}
      className={className}
      title="Le guide maison, ce que vos gardiens consultent le plus"
      actions={
        !generated ? (
          <Button size="sm" onClick={handleGenerate} disabled={loading}>
            <Sparkles className="h-3.5 w-3.5 mr-1.5" />
            Générer les 2 trames
          </Button>
        ) : (
          <span className="text-xs text-muted-foreground">
            {filled > 0
              ? "Trames pré-remplies dans les sections WiFi et Instructions générales. À relire."
              : "Vos sections WiFi et Instructions générales sont déjà remplies : vos textes restent en place."}
          </span>
        )
      }
    >
      <p>
        Je vous propose une trame pour vos précisions WiFi et vos repères du quartier, à partir de votre ville et de
        votre logement. Vos textes déjà saisis restent en place. Vous relisez et vous ajustez.
      </p>
    </AlmaBubble>
  );
}

export default AlmaHouseGuideAssist;
